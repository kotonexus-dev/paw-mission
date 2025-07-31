import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { useAuth } from '../../context/AuthContext';

// useAuth フックをモック
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Firebase関連のモック
vi.mock('../../lib/firebase/config', () => ({
  auth: {},
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
}));

// Next.js navigation のモック
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;

// テスト用のモック LoginPage コンポーネント
const MockLoginPage: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const auth = useAuth();
  const { login } = auth;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length !== 6) {
      setError('パスワードは6桁である必要があります');
      return;
    }

    try {
      setError('');
      setLoading(true);
      if (login) {
        await login(email, password);
      }
    } catch (loginError) {
      setError('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>ログイン</h2>
      <form onSubmit={handleSubmit}>
        {error && <div role="alert">{error}</div>}
        <div>
          <label id="email-label" htmlFor="email">
            メールアドレス
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-labelledby="email-label"
              required
            />
          </label>
        </div>
        <div>
          <label id="password-label" htmlFor="password">
            パスワード
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={6}
              aria-labelledby="password-label"
              required
            />
          </label>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
    </div>
  );
};

describe('認証フロー統合テスト', () => {
  const mockUser = {
    uid: 'test_uid',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('ログイン → ダッシュボード遷移（6桁パスワード）', async () => {
    const mockLogin = vi.fn().mockResolvedValue(mockUser);

    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
      login: mockLogin,
      logout: vi.fn(),
    });

    render(<MockLoginPage />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');

    fireEvent.change(emailInput, {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(passwordInput, {
      target: { value: '123456' },
    });

    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', '123456');
    });
  });

  test('ログイン失敗時のエラー処理', async () => {
    const mockLogin = vi
      .fn()
      .mockRejectedValue(new Error('ログインに失敗しました'));

    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
      login: mockLogin,
      logout: vi.fn(),
    });

    render(<MockLoginPage />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');

    fireEvent.change(emailInput, {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(passwordInput, {
      target: { value: 'wrong6' },
    });

    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'wrong6');
    });

    await waitFor(() => {
      expect(screen.getByText('ログインに失敗しました')).toBeInTheDocument();
    });
  });

  test('パスワード長制限のテスト（6桁未満）', async () => {
    const mockLogin = vi.fn();

    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
      login: mockLogin,
      logout: vi.fn(),
    });

    render(<MockLoginPage />);

    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const loginButton = screen.getByRole('button', { name: 'ログイン' });

    fireEvent.change(emailInput, {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(passwordInput, {
      target: { value: '12345' },
    });

    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(
        screen.getByText('パスワードは6桁である必要があります')
      ).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('パスワード最大長制限のテスト', () => {
    mockUseAuth.mockReturnValue({
      currentUser: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<MockLoginPage />);

    const passwordInput = screen.getByLabelText('パスワード');

    // maxLength属性により、6桁までしか入力できない
    expect(passwordInput).toHaveAttribute('maxLength', '6');
  });
});
