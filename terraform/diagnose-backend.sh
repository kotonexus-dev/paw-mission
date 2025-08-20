#!/bin/bash

echo "=== バックエンド 404 問題の診断 ==="
echo ""

# 設定値
DOMAIN="paw-mission.com"
AWS_REGION="ap-northeast-1"
PROJECT_NAME="paw-mission"

echo "1. ドメインの DNS 解決確認"
echo "nslookup $DOMAIN"
nslookup $DOMAIN
echo ""

echo "2. ALB ヘルスチェック確認"
echo "curl -I https://$DOMAIN/health"
curl -I https://$DOMAIN/health
echo ""

echo "3. 基本 API エンドポイント確認"
echo "curl -I https://$DOMAIN/api/"
curl -I https://$DOMAIN/api/
echo ""

echo "4. ルートパス確認"
echo "curl -I https://$DOMAIN/"
curl -I https://$DOMAIN/
echo ""

echo "5. AWS ECS サービス状態確認"
aws ecs describe-services \
  --cluster $PROJECT_NAME-cluster \
  --services $PROJECT_NAME-backend-service \
  --query 'services[0].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount,Events:events[:3]}' \
  --output table
echo ""

echo "6. ALB ターゲットグループ健康状態確認"
BACKEND_TG_ARN=$(aws elbv2 describe-target-groups \
  --names $PROJECT_NAME-backend-tg \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Backend Target Group: $BACKEND_TG_ARN"
aws elbv2 describe-target-health \
  --target-group-arn $BACKEND_TG_ARN \
  --query 'TargetHealthDescriptions[*].{Target:Target.Id,Port:Target.Port,Health:TargetHealth.State,Reason:TargetHealth.Reason}' \
  --output table
echo ""

echo "7. CloudWatch ログ確認 (最新 10 行)"
aws logs describe-log-groups \
  --log-group-name-prefix "/ecs/$PROJECT_NAME" \
  --query 'logGroups[?contains(logGroupName,`backend`)].logGroupName' \
  --output text | head -1 | xargs -I {} aws logs describe-log-streams \
  --log-group-name {} \
  --order-by LastEventTime \
  --descending \
  --max-items 1 \
  --query 'logStreams[0].logStreamName' \
  --output text | xargs -I {} aws logs get-log-events \
  --log-group-name "/ecs/$PROJECT_NAME-backend" \
  --log-stream-name {} \
  --limit 10 \
  --query 'events[*].message' \
  --output text

echo ""
echo "=== 診断完了 ==="