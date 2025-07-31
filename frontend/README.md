# わん🐾みっしょん

「わん🐾みっしょん」のフロントエンドアプリケーションです。Next.js、TypeScript、Tailwind CSSを使用して構築されています。

## 技術スタック

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Sonner (Toast), Lucide React (Icons)
- **State Management**: React Hooks
- **Authentication**: Firebase Auth
- **API Communication**: Fetch API
- **Location Services**: Geolocation API
- **Payment**: Stripe
- **Form Management**: React Hook Form
- **File Storage**: AWS S3
- **Deployment**: Vercel

## 主な機能

- **認証システム**: Firebase Authenticationを使用したユーザー認証
- **散歩機能**: Geolocation APIを使用したリアルタイム位置追跡
- **お世話記録**: 餌やり、散歩などの日常的なお世話の記録
- **反省文機能**: お世話ができなかった時の反省文作成
- **管理者機能**: ユーザー管理、決済、反省文閲覧
- **決済機能**: Stripe統合による有料機能の解放
- **レスポンシブデザイン**: モバイルファーストなUI/UX

## 主要技術の詳細

### Geolocation API

**概要**

- 散歩時、ブラウザの Geolocation API を活用し、リアルタイムで歩行距離を自動計測
- 取得した経路や距離はバックエンドへ記録され、ユーザーの活動履歴として管理

**主な機能:**

- リアルタイム位置追跡
- 歩行距離の正確な計算
- GPS精度の自動監視・補正
- 屋内外の自動判定
- 位置情報の許可要求とエラーハンドリング
- GPS信号の精度チェック
- 位置情報取得のタイムアウト処理

**実装の詳細:**

- 詳細実装は `/frontend/src/app/api/geo/geoLocation.ts` を参照してください

### Stripe Payment Integration

**概要:**

- Stripe Checkout を利用したプレミアム会員購入決済をサポート
- FastAPI バックエンド経由でセッション作成、Webhook で決済状態を管理

**決済フロー:**

1. フロントエンドで Checkout セッション作成リクエスト
2. FastAPI バックエンドで Stripe セッション作成
3. Stripe の決済画面へリダイレクト
4. 決済完了後、Webhook でバックエンドに通知
5. プレミアム会員権限を付与・成功/失敗ページへリダイレクト

**実装詳細:**

- 詳細実装は `/frontend/src/app/admin/payment/` を参照

### Firebase Authentication

**概要:**

- Firebase Authentication によるメールアドレス認証
- 認証済みユーザーのトークンでバックエンド API へアクセス
- 自動トークンリフレッシュ、認証切れ時の再ログイン処理

**実装の流れ:**

1. フロントエンドでユーザー登録/ログイン
2. 取得したIDトークンでAPIアクセス
3. バックエンドでユーザー情報を管理

**実装詳細:**

- 詳細は `/frontend/src/context/AuthContext.tsx` を参照

**認証トークン管理:**

- 自動トークン更新（長時間の散歩時）
- トークン期限切れのハンドリング
- 認証状態の監視とリダイレクト

### AWS S3 File Storage

**概要:**

- 散歩時の動画、画像ファイルの保存
- お世話記録に関連する画像の保存
- 静的ファイルの配信最適化

**主な機能:**

- 動画・画像ファイルのアップロード
- ファイルのセキュアな配信
- ファイル管理の最適化

**実装詳細:**

- 環境変数 `NEXT_PUBLIC_S3_BUCKET_URL` で設定
- 詳細な実装は各コンポーネントの画像・動画処理部分を参照

## プロジェクト構成

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # 管理者画面
│   │   │   ├── goal-clear/    # 目標達成画面
│   │   │   ├── reflections/   # 反省文閲覧
│   │   │   ├── payment/  # 決済画面
│   │   │   └── user-info/     # ユーザー情報
│   │   ├── admin-login/       # 管理者認証
│   │   ├── api/               # API関数
│   │   │   ├── geo/          # 位置情報API
│   │   │   ├── reflection/   # 反省文API
│   │   │   └── walk_api/     # 散歩API
│   │   ├── dashboard/         # ホーム画面
│   │   ├── onboarding/        # オンボーディング
│   │   │   ├── admin-pin/    # 管理者PIN設定
│   │   │   ├── first-settings/# 初期設定
│   │   │   ├── login/        # ログイン
│   │   │   ├── name/         # 名前設定
│   │   │   └── welcome/      # ウェルカム
│   │   ├── reflection-writing/ # 反省文作成
│   │   ├── walk/              # 散歩機能
│   │   ├── welcome-back/      # お帰り画面
│   │   └── sad-departure/     # 退場画面
│   ├── components/            # 再利用可能コンポーネント
│   │   ├── ui/               # UI コンポーネント
│   │   │   ├── button.tsx    # ボタン
│   │   │   ├── card.tsx      # カード
│   │   │   ├── dialog.tsx    # ダイアログ
│   │   │   ├── input.tsx     # 入力フィールド
│   │   │   ├── sonner.tsx    # トースト通知
│   │   │   └── ...           # その他UIコンポーネント
│   │   ├── admin/            # 管理者専用コンポーネント
│   │   └── dashboard/        # ダッシュボード専用コンポーネント
│   ├── context/              # React Context
│   │   └── AuthContext.tsx   # 認証コンテキスト
│   ├── hooks/                # カスタムフック
│   │   ├── useCareLogs.ts    # お世話記録フック
│   │   ├── useCareSettings.ts # お世話設定フック
│   │   ├── useCurrentUser.ts # ユーザー情報フック
│   │   └── reflectionNotesGet.ts # 反省文取得フック
│   ├── lib/                  # ユーティリティ関数
│   │   ├── firebase/         # Firebase設定
│   │   ├── dateUtils.ts      # 日付処理
│   │   └── utils.ts          # 汎用ユーティリティ
│   ├── tests/                # テストコード本体
│   │   ├── mocks/            # テスト用モックデータやモジュール
│   │   ├── e2e/              # エンドツーエンドテスト
│   │   ├── evidence/         # テスト証跡
│   │   ├── integration/      # 統合テスト
│   │   └── unit/             # 単体テスト
│   └── ...
├── public/                   # 静的ファイル
│   ├── animations/           # アニメーション動画
│   ├── images/               # 画像ファイル
│   └── manifest.json         # PWA設定
├── .eslintrc.js             # ESLint設定
├── .prettierrc              # Prettier設定
├── tailwind.config.ts       # Tailwind設定
├── next.config.js           # Next.js設定
├── tsconfig.json            # TypeScript設定
├── vitest.config.ts         # Vitest 設定ファイル
├── vitest.setup.ts          # Vitest 初期セットアップ
├── package.json             # 依存関係
└── Dockerfile               # Docker設定
```

## 環境変数

以下の環境変数を設定してください：

```env
# API設定
NEXT_PUBLIC_API_URL=http://localhost:8000

# Firebase設定
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AWS S3設定
NEXT_PUBLIC_S3_BUCKET_URL=your_s3_bucket_url
```

## 開発環境のセットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、上記の環境変数を設定してください。

### 3. 開発サーバーの起動

```bash
npm run dev
```

開発サーバーが起動し、[http://localhost:3000](http://localhost:3000)でアクセスできます。

## 利用可能なスクリプト

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバー起動
npm start

# Lintチェック
npm run lint

# Lintエラー自動修正
npm run lint:fix

# コードフォーマット
npm run format

# コードフォーマットチェック
npm run format:check
```

## 開発ガイドライン

### Linter と Formatter

#### ESLint

- **スタイルガイド**: Airbnb
- **設定ファイル**: `.eslintrc.js`
- **適用範囲**: TypeScript（Next.js）コード

**使用方法:**

```bash
# Lintチェック
npm run lint

# Lintエラー自動修正
npm run lint:fix
```

#### Prettier

- **設定ファイル**: `.prettierrc`
- **適用範囲**: TypeScript, JavaScript, JSON, CSS ファイル全般

**使用方法:**

```bash
# コードフォーマット
npm run format

# コードフォーマットチェック
npm run format:check
```

#### VSCode 推奨設定

以下の拡張機能を使用することをおすすめします：

- ESLint
- Prettier - Code formatter

## デプロイ

### Vercelへのデプロイ

1. GitHubリポジトリをVercelに接続
2. 環境変数を設定
3. 自動デプロイが開始されます

### 手動デプロイ

```bash
# ビルドの実行
npm run build

# Vercel CLIでデプロイ
npx vercel --prod
```

## トラブルシューティング

### よくある問題

1. **環境変数が読み込まれない**
   - `.env.local`ファイルが正しく設定されているか確認
   - 環境変数名に`NEXT_PUBLIC_`プレフィックスがついているか確認

2. **Firebase認証エラー**
   - Firebase設定が正しいか確認
   - Firebase プロジェクトの認証設定を確認

3. **API接続エラー**
   - バックエンドサーバーが起動しているか確認
   - CORS設定が正しいか確認

## ライセンス

本プロジェクトは教育目的で作成されています。
