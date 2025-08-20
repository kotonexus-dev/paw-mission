# Terraform 設定ガイド

## 📁 ディレクトリ構造

```
terraform/
├── terraform.tfvars.example   # 設定テンプレート
├── terraform.tfvars          # 実際の設定ファイル
└── main.tf                   # メインの設定ファイル
```

## 🚀 使用方法

### 1. 設定ファイルの準備

```bash
# terraform.tfvars.example をコピー
cp terraform.tfvars.example terraform.tfvars

# 設定を編集
vi terraform.tfvars
```

### 2. Docker イメージのビルドと ECR プッシュ

```bash
# ビルドスクリプトを実行可能にする
chmod +x build-and-deploy.sh

# 環境変数を設定
export AWS_ACCOUNT_ID="your_account_id"
export AWS_REGION="ap-northeast-1"

# Docker イメージをビルドして ECR にプッシュ
./build-and-deploy.sh
```

### 3. インフラのデプロイ

```bash
# 初期化（初回のみ）
terraform init

# 必ず変更内容を確認
terraform plan

# 問題がなければデプロイ実行
terraform apply
```

## ⚙️ 設定のカスタマイズ

### 必須項目の設定

1. **AWS アカウント ID** を実際の値に置き換え：

   ```
   YOUR_ACCOUNT_ID → 123456789012
   ```

2. **API キー** を実際の値に設定：

   - OpenAI API Key
   - Stripe Secret Key

3. **パスワード** を安全な値に変更：
   - データベースパスワード

## 🔐 セキュリティ注意事項

- **terraform.tfvars を Git にコミットしない**
- `.gitignore` に `terraform.tfvars` を追加済み
- API キーやパスワードは安全に管理

- **AWS_ACCOUNT_ID は環境変数で設定し、スクリプトに直接記載しない**

### 環境変数での安全な設定

```bash
# ~/.bashrc または ~/.zshrc に追加
export AWS_ACCOUNT_ID="123456789012"
export AWS_REGION="ap-northeast-1"

# または実行時に設定
AWS_ACCOUNT_ID=123456789012 ./build-and-deploy.sh
```

## 📝 ローカル State 管理

このプロジェクトでは以下の理由でローカル state を使用：

- **短期プロジェクト**
- **個人開発**
- **将来的に実際の商用案件と同様に環境ごとに分け、state も S3+DynamoDB で管理する予定**

### State ファイルの管理

```bash
# State ファイルの確認
ls -la terraform.tfstate*

# State の削除（リセット時）
rm terraform.tfstate*
```

## 🛠️ トラブルシューティング

### よくある問題と解決方法

#### 1. Terraform 基本的な問題

**設定ファイルが見つからない**
```bash
# ファイルの存在確認
ls -la terraform.tfvars

# テンプレートからコピー
cp terraform.tfvars.example terraform.tfvars
```

**権限エラー**
```bash
# AWS認証情報の確認
aws sts get-caller-identity

# AWSプロファイル設定
aws configure
```

**初期化エラー**
```bash
# 再初期化
terraform init -reconfigure

# キャッシュクリア
rm -rf .terraform
terraform init
```

#### 2. DNS・ドメイン関連の問題

**問題**: SSL証明書警告が表示される

**症状**: 
- ブラウザで「この接続ではプライバシーが保護されません」
- `curl: (60) SSL certificate problem: unable to get local issuer certificate`

**原因**: DNS伝播が完了していない（正常な状況）

**解決方法**:
```bash
# DNS伝播状況確認
nslookup paw-mission.com
dig paw-mission.com

# SSL証明書ステータス確認
aws acm describe-certificate --certificate-arn arn:aws:acm:ap-northeast-1:432774452116:certificate/ef8f2ce3-0018-4866-ac33-abf2713f615f

# 待機時間: 5-48時間（Nameserver変更後）
```

#### 3. Terraform Apply のタイムアウト問題

**問題**: `terraform apply` が長時間停止する

**症状**:
- 証明書削除で長時間待機
- 証明書検証で `Still creating...` が続く

**原因**: AWS Certificate Manager の証明書操作に時間がかかる

**解決方法**:
```bash
# バックグラウンドでの実行
terraform apply &

# プロセス確認
ps aux | grep terraform

# 状態確認（別ターミナルで）
terraform show
terraform plan
```

#### 4. 証明書検証の問題

**問題**: ACM証明書が `PENDING_VALIDATION` 状態

**症状**: SSL証明書が発行されない

**確認方法**:
```bash
# 証明書状態確認
aws acm describe-certificate --certificate-arn CERTIFICATE_ARN --query 'Certificate.{Status:Status,DomainValidationOptions:DomainValidationOptions[*].ValidationStatus}'

# Route53検証レコード確認
aws route53 list-resource-record-sets --hosted-zone-id Z00624672S7RGCYS5XPQ9 --query 'ResourceRecordSets[?Type==`CNAME`]'
```

**解決方法**:
```bash
# DNS検証レコードが正しく作成されているか確認
dig _4295edf18b5db2c6ac2f592fbac18dab.paw-mission.com CNAME
dig _cbafa2305064b32468dd7b180630b39a.www.paw-mission.com CNAME

# Nameserver設定の確認（ドメインレジストラで）
dig NS paw-mission.com
```

#### 5. ECS サービスの問題

**問題**: Backend ECS サービスが起動しない

**症状**: 
- `Running: 0, Desired: 1`
- タスクが `DEPROVISIONING` 状態

**確認方法**:
```bash
# ECS サービス状態確認
aws ecs describe-services --cluster paw-mission-cluster --services paw-mission-backend-service --query 'services[*].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount}' --output table

# タスクイベント確認
aws ecs describe-services --cluster paw-mission-cluster --services paw-mission-backend-service --query 'services[0].events[:5]' --output table

# タスク詳細確認
aws ecs list-tasks --cluster paw-mission-cluster --service-name paw-mission-backend-service
aws ecs describe-tasks --cluster paw-mission-cluster --tasks TASK_ARN
```

**解決方法**:
- 通常は時間をおいて自動的に解決
- ヘルスチェック設定の確認
- CloudWatchログの確認

#### 6. ALB とターゲットヘルスの問題

**問題**: ALB ヘルスチェックが失敗する

**確認方法**:
```bash
# ターゲットグループの状態確認
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:ap-northeast-1:432774452116:targetgroup/paw-mission-frontend-tg/f6e8deaab775690e

# ALB 接続テスト
curl -I http://paw-mission-alb-748081917.ap-northeast-1.elb.amazonaws.com
```

**解決方法**:
- セキュリティグループの確認
- コンテナの起動状態確認
- ヘルスチェックパスの確認

### 💡 実際に発生した問題の解決例

#### Case 1: DNS伝播の待機時間

**発生**: SSL警告が表示された
**対応**: 
1. DNS伝播状況を確認 (`nslookup`)
2. SSL証明書ステータスを確認 (`aws acm describe-certificate`)
3. 証明書は既に `ISSUED` 状態だったため、DNS伝播完了まで待機
4. 12-24時間後に正常にアクセス可能になることを確認

#### Case 2: Terraform Apply のタイムアウト

**発生**: 証明書削除で2分以上停止
**対応**:
1. `terraform plan` で変更内容を確認
2. 自動削除される自己署名証明書と新しいHTTPS設定が正常に進行中と判断
3. タイムアウト後に `terraform plan` で状態確認
4. 必要に応じて再度 `terraform apply` を実行

#### Case 3: ECS Backend サービスの再起動

**発生**: Backend サービスが0個の実行中タスク
**対応**:
1. ECS サービスイベントを確認
2. 新しいタスクが定期的に起動していることを確認
3. デプロイメント更新による正常な再起動と判断
4. 数分後に正常に起動完了

### 🔄 リソース削除

```bash
# 全リソース削除
terraform destroy

# State ファイルの削除（完全リセット時）
rm terraform.tfstate*

# 確認
aws ecs list-clusters
aws rds describe-db-instances
aws elbv2 describe-load-balancers
```

### 📊 運用状態の確認

```bash
# 全体的な状態確認
terraform output

# 個別リソースの確認
terraform show | grep -A 5 -B 5 "aws_ecs_service"
terraform show | grep -A 5 -B 5 "aws_acm_certificate"

# AWS リソースの直接確認
aws ecs describe-services --cluster paw-mission-cluster --services paw-mission-frontend-service paw-mission-backend-service
aws acm list-certificates --region ap-northeast-1
aws route53 list-hosted-zones
```
