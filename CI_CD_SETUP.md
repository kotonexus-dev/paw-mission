# CI/CD セットアップガイド

このガイドは、コードがmainブランチにマージされた際に自動でAWSにデプロイする完全なCI/CDフローの設定を支援します。

## 🏗️ アーキテクチャ概要

### デプロイメントフロー
```
GitHub main branch → GitHub Actions → 
1. Terraform (ECR作成/更新) → 
2. Docker Build & Push to ECR → 
3. ECS Service更新 → 
4. デプロイ完了
```

### 新規追加コンポーネント
- **ECR Repositories**: コンテナイメージリポジトリの自動作成・管理
- **GitHub Actions**: 自動化CI/CDフロー
- **Terraform ECRモジュール**: ECRライフサイクルとポリシーの管理

## 🚀 セットアップ手順

### 1. GitHub Secrets 設定

GitHubリポジトリで以下のSecretsを設定してください：

```
Settings → Secrets and variables → Actions → New repository secret
```

必要なSecrets：
- `AWS_ACCESS_KEY_ID`: AWSアクセスキーID
- `AWS_SECRET_ACCESS_KEY`: AWSアクセスキーシークレット

### 2. terraform.tfvars 確認

`terraform/terraform.tfvars` ファイルに必要な変数がすべて含まれていることを確認：

```hcl
# 基本設定
project_name = "your-project-name"
aws_region   = "ap-northeast-1"
aws_account_id = "YOUR_AWS_ACCOUNT_ID"

# その他必要な環境変数...
```

### 3. 初回デプロイメント

**重要**: 初回デプロイは手動実行を推奨します。ECRリポジトリが正しく作成されることを確認するため：

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 4. 自動デプロイ設定

インフラストラクチャが準備できたら、mainブランチへのプッシュごとに自動デプロイが実行されます：

```bash
git add .
git commit -m "Deploy changes"
git push origin main
```

## 📝 CI/CD フロー詳細

### GitHub Actions ワークフロー (`.github/workflows/deploy.yml`)

1. **コードチェックアウト**: 最新コードを取得
2. **AWS認証**: GitHub Secretsを使用してAWSアクセスを設定
3. **Terraform初期化と適用**: 
   - ECRリポジトリの作成/更新
   - インフラストラクチャ変更の適用
4. **ECR URL取得**: Terraformアウトプットからリポジトリアドレスを取得
5. **Docker ビルドとプッシュ**:
   - フロントエンドとバックエンドイメージをビルド
   - ECRにプッシュ（latestとgit commit SHAタグ付き）
6. **ECS サービス更新**: ECSサービスの強制再デプロイ
7. **デプロイ完了待機**: サービスが安定動作することを確認

### ECR リポジトリ管理

新しいECRモジュールが提供する機能：
- **自動イメージスキャン**: セキュリティ脆弱性検出
- **ライフサイクルポリシー**: 古いイメージの自動クリーンアップ（最新10個を保持）
- **暗号化**: AES256暗号化ストレージ

## 🔧 手動デプロイオプション

手動デプロイが必要な場合は、更新されたスクリプトを使用：

```bash
cd terraform
./build-and-deploy.sh
```

このスクリプトは：
1. ECRリポジトリを自動作成（存在しない場合）
2. Dockerイメージをビルド・プッシュ
3. terraform applyの実行を促す

## 🚨 トラブルシューティング

### よくある問題

1. **ECR権限エラー**
   ```
   解決方法: AWS IAM権限を確認し、ECRフルアクセス権限があることを確認
   ```

2. **Terraform状態コンフリクト**
   ```
   解決方法: terraform.tfstateファイルがバージョン管理されているか、リモート状態ストレージを使用していることを確認
   ```

3. **Docker ビルド失敗**
   ```
   解決方法: DockerfileとBuild Argsが正しいことを確認
   ```

4. **ECS サービス更新タイムアウト**
   ```
   解決方法: ECSタスク定義とサービス設定を確認
   ```

### デバッグコマンド

```bash
# ECRリポジトリを確認
aws ecr describe-repositories --region ap-northeast-1

# ECSサービス状態を確認
aws ecs describe-services --cluster YOUR_CLUSTER --services YOUR_SERVICE

# ECSタスクログを表示
aws logs get-log-events --log-group-name /ecs/YOUR_SERVICE
```

## 📈 モニタリングとメンテナンス

### デプロイメント監視
- GitHub Actionsページでデプロイ状態を確認
- CloudWatchでECSサービスの健康状態をモニタリング
- ALBヘルスチェックでアプリケーションの可用性を確保

### イメージ管理
- ECRは自動的に最新10個のイメージバージョンを保持
- タグなしイメージの日次自動クリーンアップ
- イメージスキャンによるセキュリティ脆弱性レポート

## ⚡ パフォーマンス最適化提案

1. **並列ビルド**: GitHub Actionsでフロントエンドとバックエンドを並列ビルド
2. **イメージキャッシュ**: Dockerレイヤーキャッシュを活用してビルド高速化
3. **増分デプロイ**: コード変更時のみ関連サービス更新をトリガー

## 🔄 ロールバック戦略

デプロイが失敗した場合の迅速なロールバック：

```bash
# 前のイメージバージョンにロールバック
aws ecs update-service \
  --cluster YOUR_CLUSTER \
  --service YOUR_SERVICE \
  --task-definition YOUR_TASK_DEF:PREVIOUS_REVISION
```

## ✅ デプロイメントチェックリスト

デプロイ前の確認項目：
- [ ] terraform.tfvarsが正しく設定されている
- [ ] GitHub Secretsが設定されている
- [ ] AWS IAM権限が設定されている
- [ ] ローカルテストが通過している
- [ ] Dockerイメージが正常にビルドできる

---

## 🎯 まとめ

このCI/CD設定により以下が実現されます：
- ✅ 完全自動化されたデプロイメントフロー
- ✅ Infrastructure as Codeによる管理
- ✅ コンテナイメージのバージョン管理
- ✅ ゼロダウンタイム更新
- ✅ セキュアなシークレット管理
- ✅ 包括的なモニタリングとログ

mainブランチへのマージごとに完全なデプロイメントフローがトリガーされ、プロダクション環境は常に最新の安定したコードで動作することが保証されます。