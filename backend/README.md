# わん 🐾 みっしょん

「わん 🐾 みっしょん」のバックエンド API です。FastAPI と Python を使用して構築されています。

## 技術スタック

- **Framework**: FastAPI
- **Language**: Python 3.11.12
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Firebase Admin SDK
- **External APIs**: OpenAI, Stripe
- **Deployment**: Render (Docker)

## 主な機能

- **RESTful API**: FastAPI を使用したモダンな API 設計
- **認証・認可**: Firebase Admin SDK を使用した認証
- **データベース操作**: Prisma ORM を使用した型安全なデータベース操作
- **外部サービス統合**: OpenAI、Stripe との統合
- **API 文書化**: FastAPI の自動 API 文書生成

## プロジェクト構成

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPIアプリケーション
│   ├── config.py                  # 設定管理
│   ├── db.py                      # データベース接続
│   ├── dependencies.py            # 依存性注入
│   ├── routers/                   # APIルーター
│   │   ├── user.py               # ユーザー管理
│   │   ├── care_logs.py          # お世話記録
│   │   ├── care_settings.py      # お世話設定
│   │   ├── reflection_notes.py   # 反省文
│   │   ├── message_logs.py       # メッセージログ
│   │   ├── payment.py            # 決済処理
│   │   └── webhook_events.py     # Webhook処理
│   ├── schemas/                   # Pydanticスキーマ
│   ├── services/                  # ビジネスロジック
│   │   └── stripe_service.py     # Stripe連携
│   └── utils/                     # ユーティリティ
├── prisma/
│   ├── schema.prisma             # Prismaスキーマ
│   ├── migrations/               # データベースマイグレーション
│   └── seed.py                   # データシード
├── firebase/                     # Firebase設定
├── requirements.txt              # Python依存関係
├── Dockerfile                    # Docker設定
├── .dockerignore                 # Dockerignore設定
├──.python-version                # Pythonバージョン指定
├── .pylintrc                     # Pylint設定
└── pyproject.toml               # Black プロジェクト設定
```

## 環境変数

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
# データベース
DATABASE_URL=postgresql://user:password@localhost:5432/database

# Firebase
FIREBASE_SERVICE_ACCOUNT={"type":"service_account", ... }

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PRICE_ID=your_stripe_price_id
YOUR_DOMAIN=http://localhost:3000

# アプリケーション設定
ALLOW_ORIGINS=http://localhost:3000

```

## 開発環境のセットアップ

### 1. Python 仮想環境の作成

**Mac:**

```bash
python -m venv venv
source venv/bin/activate
```

**Windows:**

```bash
python -m venv venv
venv\Scripts\activate
```

### 2. 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 3. データベースのセットアップ

```bash
# Prismaクライアントの生成
prisma generate

# データベースマイグレーション
prisma migrate dev

# データシード（オプション）
python prisma/seed.py
```

### 4. Firebase 設定

1. Firebase プロジェクトからサービスアカウントキー（JSON）をダウンロード
2. サービスアカウントキーの内容（JSON 全体）を、環境変数に直接設定
   （例: `FIREBASE_SERVICE_ACCOUNT` に JSON 文字列を格納）
3. `.env` ファイル等で環境変数として読み込めるようにする

### 5. 開発サーバーの起動

```bash
python -m uvicorn app.main:app --reload
```

API 文書は [http://localhost:8000/docs/API_design.md](http://localhost:8000/docs/API_design.md) でアクセスできます。

## API エンドポイント

### 認証系

```
POST /api/users                    # ユーザー登録
GET  /api/users/me                 # ユーザー情報取得
```

### お世話記録系

```
GET   /api/care_logs/today           # 今日のお世話記録取得
GET   /api/care_logs/by_date         # 日付別お世話記録取得
GET   /api/care_logs/list            # お世話記録一覧取得
POST  /api/care_logs                 # お世話記録作成
PATCH /api/care_logs/{care_log_id}   # お世話記録更新
```

### 設定系

```
GET  /api/care_settings/me           # お世話設定取得
POST /api/care_settings              # お世話設定作成
POST /api/care_settings/verify_pin   # 管理者PIN認証
```

### 反省文系

```
GET   /api/reflection_notes          # 反省文一覧取得
POST  /api/reflection_notes          # 反省文作成
PATCH /api/reflection_notes/{note_id} # 反省文承認状態更新
```

### メッセージ系

```
POST /api/message_logs/generate      # AIメッセージ生成
```

### 決済・Webhook 系

```
POST /api/payments/create-checkout-session # 決済セッション作成
POST /api/webhook_events/                  # Stripe Webhook受信
POST /api/webhook_events/process           # 未処理Webhookイベント処理
```

## 開発ガイドライン

### Linter と Formatter

#### Pylint

- **設定ファイル**: `.pylintrc`
- **適用範囲**: Python（FastAPI アプリケーション全体）

**使用方法:**

```bash
# Lintチェック
pylint app/

# 特定のファイルのチェック
pylint app/routers/user.py

# 設定ファイルを指定してチェック
pylint --rcfile=.pylintrc app/
```

#### Black

- **設定ファイル**: `pyproject.toml`
- **適用範囲**: Python ファイル全般

**使用方法:**

```bash
# コードフォーマット
black .

# 特定のディレクトリのフォーマット
black app/

# チェックのみ（実際の変更は行わない）
black --check .
```

#### VSCode 推奨設定

以下の拡張機能を使用することをおすすめします：

- Python
- Pylint
- Black Formatter

### 新しい API エンドポイントの追加

1. **スキーマ定義** (`schemas/`)

```python
from pydantic import BaseModel
from typing import Optional

class ItemCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None

class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
```

2. **ルーター作成** (`routers/`)

```python
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.item import ItemCreate, ItemResponse
from app.dependencies import verify_firebase_token

router = APIRouter(prefix="/api/items", tags=["items"])

@router.post("", response_model=ItemResponse)
async def create_item(
    request: ItemCreateRequest,
    firebase_uid: str = Depends(verify_firebase_token)
):
    # ビジネスロジックの実装
    pass
```

3. **メインアプリに登録** (`main.py`)

```python
from app.routers.items import router as items_router
app.include_router(items_router)
```

### データベースマイグレーション

```bash
# 新しいマイグレーションの作成
prisma migrate dev --name add_new_table

# 本番環境でのマイグレーション
prisma migrate deploy
```

## デプロイ

### Render へのデプロイ

1. GitHub リポジトリを Render に接続
2. 環境変数を設定
3. 自動デプロイが開始されます

## トラブルシューティング

### よくある問題

1. **データベース接続エラー**

   - `DATABASE_URL`が正しく設定されているか確認
   - PostgreSQL サーバーが起動しているか確認

2. **Firebase 認証エラー**

   - サービスアカウントキーが正しく設定されているか確認
   - Firebase プロジェクトの設定を確認

3. **Prisma エラー**
   - `prisma generate`が実行されているか確認
   - データベーススキーマが最新か確認

## ライセンス

本プロジェクトは教育目的で作成されています。
