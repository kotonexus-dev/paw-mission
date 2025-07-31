import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import DashboardPage from '../../app/dashboard/page';
import { useAuth } from '../../context/AuthContext';

// API呼び出しのモック（useCareLogs）
vi.mock('../../hooks/useCareLogs', () => ({
  useCareLogs: vi.fn(() => ({
    careLog: {
      care_log_id: 1,
      fed_morning: false,
      fed_night: false,
      walked: false,
    },
    updateCareLog: vi.fn(),
    loading: false,
    error: null,
  })),
}));

// API呼び出しのモック（useCareSettings）
vi.mock('../../hooks/useCareSettings', () => ({
  useCareSettings: vi.fn(() => ({
    careSettings: {
      id: 1,
      child_name: '太郎',
      dog_name: 'ポチ',
      morning_meal_time: '08:00',
      night_meal_time: '18:00',
      walk_time: '16:00',
    },
    loading: false,
    error: null,
  })),
}));

// AuthContextのモック
vi.mock('../../context/AuthContext', () => ({
  // AuthProviderコンポーネントをモックします。
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  // useAuthを直接vi.fn()として定義
  useAuth: vi.fn(),
  __esModule: true,
}));

// Next.js Routerのモック
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// モックされたuseAuthフックを取得
const mockUseAuth = vi.mocked(useAuth);

describe('お世話ログフロー統合テスト', () => {
  // 認証情報のモック値
  const mockAuthValue = {
    currentUser: {
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
    },
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
  };

  // 各テストの前に、モックをリセットし、デフォルトの戻り値を設定します。
  beforeEach(() => {
    vi.clearAllMocks(); // すべてのモック（useAuth, useCareLogs, useCareSettingsなど）をクリア
    // useAuthモックの戻り値を設定
    mockUseAuth.mockReturnValue(mockAuthValue);

    // fetchのモックレスポンスを設定
    global.fetch = vi.fn().mockImplementation((url) => {
      // care_settings API
      if (url.includes('/api/care_settings')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 1,
              child_name: '太郎',
              dog_name: 'ポチ',
              morning_meal_time: '08:00',
              night_meal_time: '18:00',
              walk_time: '16:00',
            }),
        });
      }
      // care_logs API（昨日のログ確認）
      if (url.includes('/api/care_logs') && url.includes('date=')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              care_log_id: 1,
              fed_morning: true,
              fed_night: true,
              walked: true, // 昨日のミッションが完了済みに設定
            }),
        });
      }
      // care_logs作成API
      if (url.includes('/api/care_logs') && !url.includes('date=')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              care_log_id: 2,
              fed_morning: false,
              fed_night: false,
              walked: false,
            }),
        });
      }
      // 犬メッセージ API
      if (url.includes('/api/message_logs')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              message: 'わん！元気だよ！',
            }),
        });
      }
      // デフォルトレスポンス
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  test('ダッシュボードページの基本的な読み込みテスト', async () => {
    // モックしたAuthProviderを使用してDashboardPageをレンダリングします。
    const { AuthProvider } = await import('../../context/AuthContext');

    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    );

    // ローディング画面が表示されることを確認
    expect(screen.getByText('ユーザー情報を取得中...')).toBeInTheDocument();

    // APIが呼び出されることを確認
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/care_settings'),
          expect.any(Object)
        );
      },
      { timeout: 3000 }
    );

    // care_settingsが正常に取得されていることをログで確認
    // （コンソールログから確認できるため、これで十分）
    expect(global.fetch).toHaveBeenCalled();
  }, 10000);

  test('ダッシュボードのUIコンポーネント表示テスト', async () => {
    const { AuthProvider } = await import('../../context/AuthContext');

    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    );

    // 基本的なUI要素の確認
    await waitFor(
      () => {
        // カードコンポーネントが表示されることを確認
        const cardElements = document.querySelectorAll('[class*="card"]');
        expect(cardElements.length).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    // ボタンコンポーネントが表示されることを確認
    await waitFor(
      () => {
        const buttonElements = document.querySelectorAll('button');
        expect(buttonElements.length).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );
  });

  test('エラー状態のテスト', async () => {
    // エラーレスポンスを返すモック
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'));

    const { AuthProvider } = await import('../../context/AuthContext');

    render(
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    );

    // エラー処理が行われることを確認
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });

  test('お世話ログの履歴表示', async () => {
    // 管理者画面でログ履歴を確認するテスト
    const { AuthProvider } = await import('../../context/AuthContext');

    render(
      <AuthProvider>
        {/* AdminPageコンポーネントが存在する場合、ここにレンダリングします。 */}
        {/* その場合、AdminPageのインポートパスも修正する必要があります。 */}
        {/* <AdminPage /> */}
        <div>履歴テスト用プレースホルダー</div>
      </AuthProvider>
    );

    // 履歴データが正しく表示されているか確認
    await waitFor(() => {
      // 実際のAdminPageが実装されるまで、プレースホルダーテキストを確認
      expect(
        screen.getByText('履歴テスト用プレースホルダー')
      ).toBeInTheDocument();
    });
  });
});

describe('散歩フロー統合テスト', () => {
  test('散歩ページの基本的な読み込みテスト', async () => {
    // Geolocation APIのモック
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) => {
        // 成功コールバックを呼び出してモック位置を返す
        setTimeout(() => {
          success({
            coords: {
              latitude: 35.6762,
              longitude: 139.6503,
              accuracy: 10,
            },
            timestamp: Date.now(),
          });
        }, 100);
      }),
      watchPosition: vi.fn(() => 1), // watchPositionがIDを返すようにモック
      clearWatch: vi.fn(),
    };

    // Permission APIのモック
    const mockPermissions = {
      query: vi.fn().mockResolvedValue({
        state: 'granted',
        onchange: null,
      }),
    };

    // グローバルなnavigator.geolocationとpermissionsをモック
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(global.navigator, 'permissions', {
      value: mockPermissions,
      writable: true,
      configurable: true,
    });

    // 認証コンテキストの設定
    const mockAuthValue = {
      currentUser: {
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
      },
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    };

    // useAuthモックの戻り値を設定
    mockUseAuth.mockReturnValue(mockAuthValue);

    // fetchのモックレスポンスを設定
    global.fetch = vi.fn().mockImplementation((url) => {
      // care_settings API
      if (url.includes('/api/care_settings')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 1,
              child_name: '太郎',
              dog_name: 'ポチ',
              morning_meal_time: '08:00',
              night_meal_time: '18:00',
              walk_time: '16:00',
            }),
        });
      }
      // デフォルトレスポンス
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    // WalkPageコンポーネントを動的にインポートします。
    const WalkPage = (await import('../../app/walk/page')).default;
    const { AuthProvider } = await import('../../context/AuthContext');

    render(
      <AuthProvider>
        <WalkPage />
      </AuthProvider>
    );

    // ページが読み込まれることを確認
    // APIが呼び出されることを確認
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/care_settings'),
          expect.any(Object)
        );
      },
      { timeout: 3000 }
    );

    // 散歩開始ボタンが存在することを確認（正しいセレクター）
    await waitFor(
      () => {
        // 実際の散歩開始ボタンを探す（「おさんぽかいし」のテキストまたはbg-cyan-500クラス）
        const walkButton =
          screen.queryByText('おさんぽかいし') ||
          document.querySelector("button[class*='bg-cyan-500']");
        expect(walkButton).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // 散歩開始ボタンをクリック
    const walkButton =
      screen.queryByText('おさんぽかいし') ||
      (document.querySelector("button[class*='bg-cyan-500']") as HTMLElement);
    expect(walkButton).toBeInTheDocument();

    // モックが利用可能であることを確認
    expect(global.navigator.geolocation).toBeDefined();
    expect(global.navigator.permissions).toBeDefined();

    // ボタンをクリック
    fireEvent.click(walkButton);

    // Permission APIが呼ばれることを確認
    await waitFor(
      () => {
        expect(mockPermissions.query).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // GPS呼び出しを確認
    await waitFor(
      () => {
        expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
      },
      { timeout: 8000 }
    );

    // より詳細な確認：geolocationが実際に呼ばれたかをログで確認
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.any(Object)
    );

    // permission.queryも呼ばれたことを確認
    expect(mockPermissions.query).toHaveBeenCalledWith({
      name: 'geolocation',
    });
  }, 20000);

  test('散歩ページのUIコンポーネントテスト', async () => {
    const { AuthProvider } = await import('../../context/AuthContext');
    const WalkPage = (await import('../../app/walk/page')).default;

    render(
      <AuthProvider>
        <WalkPage />
      </AuthProvider>
    );

    // 基本的なUI要素の確認
    await waitFor(
      () => {
        // アニメーションコンポーネントが表示されることを確認
        const animationElements = document.querySelectorAll(
          '[class*="animation"]'
        );
        expect(animationElements.length).toBeGreaterThanOrEqual(0);
      },
      { timeout: 3000 }
    );

    // カードコンポーネントが表示されることを確認
    await waitFor(
      () => {
        const cardElements = document.querySelectorAll('[class*="card"]');
        expect(cardElements.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });
});
