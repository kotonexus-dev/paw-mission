#!/bin/bash

# このスクリプトは Docker イメージをビルドして ECR にプッシュします
# 実行前に AWS CLI と Docker が設定されていることを確認してください

set -e  # エラーが発生したら終了

# 設定値を環境変数またはコマンドライン引数から取得
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}
AWS_REGION=${AWS_REGION:-"ap-northeast-1"}
PROJECT_NAME=${PROJECT_NAME:-"paw-mission"}

# 必要な環境変数をチェック
if [[ -z "$AWS_ACCOUNT_ID" ]]; then
    echo "エラー: AWS_ACCOUNT_ID が設定されていません"
    exit 1
fi

echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "AWS Region: $AWS_REGION"
echo "Project Name: $PROJECT_NAME"

# terraform.tfvars から変数を読み込み
if [[ -f "terraform.tfvars" ]]; then
    echo "terraform.tfvars から設定を読み込み中..."
    source <(grep -v '^#' terraform.tfvars | sed 's/[[:space:]]*=[[:space:]]*/=/')
else
    echo "エラー: terraform.tfvars が見つかりません"
    exit 1
fi

# ECR ログイン
echo "AWS ECR にログイン中..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# フロントエンドイメージのビルド
echo "フロントエンドイメージをビルド中..."
docker build \
  --build-arg NEXT_PUBLIC_API_URL="$next_public_api_url" \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$firebase_api_key" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$firebase_auth_domain" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$firebase_project_id" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$firebase_storage_bucket" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$firebase_messaging_sender_id" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$firebase_app_id" \
  --build-arg NEXT_PUBLIC_S3_BUCKET_URL="$next_public_s3_bucket_url" \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-frontend:latest \
  ../frontend

# バックエンドイメージのビルド
echo "バックエンドイメージをビルド中..."
docker build \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-backend:latest \
  ../backend

# イメージを ECR にプッシュ
echo "フロントエンドイメージを ECR にプッシュ中..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-frontend:latest

echo "バックエンドイメージを ECR にプッシュ中..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-backend:latest

echo "✅ イメージのビルドとプッシュが完了しました！"
echo ""
echo "次のステップ:"
echo "1. terraform plan を実行して変更内容を確認"
echo "2. terraform apply を実行してインフラを更新"
echo ""
echo "コマンド例:"
echo "  terraform plan"
echo "  terraform apply"