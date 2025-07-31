# pylint: disable=redefined-outer-name

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from app.main import app
from app.dependencies import verify_firebase_token

# FastAPIアプリをTestClientに渡す
client = TestClient(app)


@pytest.fixture
def mock_prisma_and_stripe(monkeypatch):
    """
    prisma_clientとstripe_serviceをモックするfixture
    - stripe_service.create_checkout_sessionをテスト内で上書き可能
    """
    # prisma_clientをモック
    mock_prisma = AsyncMock()

    # デフォルトNone（テストで上書き）
    mock_prisma.users.find_unique.return_value = None

    # 実際のapp内のprisma_clientをモックに差し替え
    monkeypatch.setattr("app.routers.payment.prisma_client", mock_prisma)

    # stripe_serviceのcreate_checkout_sessionもモック
    # デフォルトは固定のダミーURLを返す
    monkeypatch.setattr(
        "app.routers.payment.stripe_service.create_checkout_session",
        lambda uid: "https://dummy-stripe-session-url.com",
    )

    # Firebase認証をモック
    app.dependency_overrides[verify_firebase_token] = lambda: "test-uid"

    return mock_prisma


# ======================
#  TC-PAY-001
# ======================
# POST /api/payments/create-checkout-sessionのテストコード
# 正常系（ユーザーが無料プラン→checkout_session作成が呼ばれる）
def test_create_checkout_session_free_user_success(mock_prisma_and_stripe):
    """
    正常系：ユーザーが無料プランならStripeセッションURLを返す
    """
    # ユーザーが「freeプラン」で存在するようモックする
    mock_prisma_and_stripe.users.find_unique.return_value = AsyncMock(
        id=1, current_plan="free"
    )

    # テストクライアントでPOSTリクエスト
    response = client.post(
        "/api/payments/create-checkout-session",
        headers={"Authorization": "Bearer test-token"},
    )

    # レスポンス検証
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert data["url"] == "https://dummy-stripe-session-url.com"

    # Prisma呼び出し検証
    mock_prisma_and_stripe.users.find_unique.assert_awaited_once()


# ======================
#  TC-PAY-002
# ======================
# 異常系（ユーザーがすでにpremiumプラン）
def test_create_checkout_session_already_premium_user(mock_prisma_and_stripe):
    """
    異常系：すでにpremiumプランのユーザーの場合 → 400エラーを返す
    """
    # ユーザーが「premiumプラン」で存在するようモックする
    mock_prisma_and_stripe.users.find_unique.return_value = AsyncMock(
        id=1, current_plan="premium"
    )

    # テストクライアントでPOSTリクエスト
    response = client.post(
        "/api/payments/create-checkout-session",
        headers={"Authorization": "Bearer test-token"},
    )

    # レスポンス検証
    assert response.status_code == 400
    data = response.json()
    assert "すでにプレミアムプランです" in data["detail"]

    # Prisma呼び出し検証
    mock_prisma_and_stripe.users.find_unique.assert_awaited_once()


# ======================
#  TC-PAY-003
# ======================
# 異常系（Stripe Service側が例外を投げる）
def test_create_checkout_session_stripe_service_error(
    mock_prisma_and_stripe, monkeypatch
):
    """
    異常系：Stripeサービス側で例外発生 → 500エラー
    """
    # ユーザーは無料プラン
    mock_prisma_and_stripe.users.find_unique.return_value = AsyncMock(
        id=1, current_plan="free"
    )

    # Stripeサービスを例外を投げるモックに差し替える
    def fake_create_checkout_session(_):
        raise RuntimeError("Stripe Service Failure!")

    monkeypatch.setattr(
        "app.routers.payment.stripe_service.create_checkout_session",
        fake_create_checkout_session,
    )

    # テストリクエスト
    response = client.post(
        "/api/payments/create-checkout-session",
        headers={"Authorization": "Bearer test-token"},
    )

    # 検証
    assert response.status_code == 500
    assert "決済セッション生成中にサーバーエラーが発生しました" in response.text
    mock_prisma_and_stripe.users.find_unique.assert_awaited_once()


# ======================
#  TC-PAY-004
# ======================
# 異常系（prisma_client.users.find_unique でDB例外）
def test_create_checkout_session_prisma_error(mock_prisma_and_stripe):
    """
    異常系：Prismaのusers.find_uniqueで例外 → 500エラー
    """
    # Prisma側が例外を投げるようにモック
    mock_prisma_and_stripe.users.find_unique.side_effect = Exception(
        "DB connection failure!"
    )

    # テストリクエスト
    response = client.post(
        "/api/payments/create-checkout-session",
        headers={"Authorization": "Bearer test-token"},
    )

    # 検証
    assert response.status_code == 500
    assert "決済セッション生成中にサーバーエラーが発生しました" in response.text
    mock_prisma_and_stripe.users.find_unique.assert_awaited_once()
