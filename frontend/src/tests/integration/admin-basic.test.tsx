// Admin basic rendering integration tests
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAuth } from '@/context/AuthContext';
import AdminLoginPage from '@/app/admin-login/page';

// Mock Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
  }),
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(),
  __esModule: true,
}));

const mockUseAuth = vi.mocked(useAuth);

describe('管理者基本機能テスト', () => {
  const createMockUser = () => ({
    uid: 'test_uid',
    email: 'test@example.com',
    getIdToken: vi.fn().mockResolvedValue('mock_token'),
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: 'mock_creation_time',
      lastSignInTime: 'mock_last_sign_in_time',
    },
    providerData: [],
    displayName: null,
    photoURL: null,
    phoneNumber: null,
    tenantId: null,
    delete: vi.fn(),
    getIdTokenResult: vi.fn(),
    reload: vi.fn(),
    toJSON: vi.fn(),
    refreshToken: 'mock_refresh_token',
    providerId: 'firebase',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock fetch API
    global.fetch = vi.fn();
    
    // Mock environment variable
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
    
    // Reset router mocks
    mockPush.mockClear();
    mockReplace.mockClear();
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('管理者ログインページ', () => {
    test('管理者ログインページが正しく表示される', () => {
      const mockUser = createMockUser();
      mockUseAuth.mockReturnValue({
        currentUser: mockUser,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(<AdminLoginPage />);

      expect(screen.getByText('管理者認証')).toBeInTheDocument();
      expect(screen.getByText('PINを入力してください')).toBeInTheDocument();
      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // PIN input field
      expect(screen.getByRole('button', { name: /管理者画面へ/ })).toBeInTheDocument();
    });

    test('PINが空の場合エラーメッセージを表示', async () => {
      const mockUser = createMockUser();
      mockUseAuth.mockReturnValue({
        currentUser: mockUser,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(<AdminLoginPage />);

      const submitButton = screen.getByRole('button', { name: /管理者画面へ/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('PINを入力してください')).toBeInTheDocument();
      });
    });

    test('正しいPINで認証成功し管理者ページに遷移', async () => {
      const mockUser = createMockUser();
      mockUseAuth.mockReturnValue({
        currentUser: mockUser,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      // Mock successful PIN verification
      (global.fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ verified: true }),
      });

      render(<AdminLoginPage />);

      const pinInput = screen.getByDisplayValue('');
      const submitButton = screen.getByRole('button', { name: /管理者画面へ/ });

      fireEvent.change(pinInput, { target: { value: '1234' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/care_settings/verify_pin',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              Authorization: 'Bearer mock_token',
            }),
            body: JSON.stringify({ input_password: '1234' }),
          })
        );
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/admin');
      });
    });

    test('間違ったPINで認証失敗時エラーメッセージを表示', async () => {
      const mockUser = createMockUser();
      mockUseAuth.mockReturnValue({
        currentUser: mockUser,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      // Mock failed PIN verification
      (global.fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ verified: false }),
      });

      render(<AdminLoginPage />);

      const pinInput = screen.getByDisplayValue('');
      const submitButton = screen.getByRole('button', { name: /管理者画面へ/ });

      fireEvent.change(pinInput, { target: { value: '9999' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('PINが正しくありません')).toBeInTheDocument();
      });

      // PIN should be cleared
      expect(pinInput).toHaveValue('');
    });

    test('PINの表示/非表示切り替え機能', () => {
      const mockUser = createMockUser();
      mockUseAuth.mockReturnValue({
        currentUser: mockUser,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(<AdminLoginPage />);

      const pinInput = screen.getByDisplayValue('');
      const toggleButton = screen.getByRole('button', { name: /PINを表示/ });

      // Initially should be password type
      expect(pinInput).toHaveAttribute('type', 'password');

      // Click to show PIN
      fireEvent.click(toggleButton);
      expect(pinInput).toHaveAttribute('type', 'text');

      // Click to hide PIN again
      fireEvent.click(toggleButton);
      expect(pinInput).toHaveAttribute('type', 'password');
    });

    test('ダッシュボードに戻るボタンが機能する', () => {
      const mockUser = createMockUser();
      mockUseAuth.mockReturnValue({
        currentUser: mockUser,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(<AdminLoginPage />);

      const backButton = screen.getByRole('button', { name: /ホーム画面に戻る/ });
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});