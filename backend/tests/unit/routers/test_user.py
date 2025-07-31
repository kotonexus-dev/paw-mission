# pylint: disable=redefined-outer-name

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from app.main import app
from app.dependencies import verify_firebase_token

# FastAPIアプリをTestClientに渡す
client = TestClient(app)


@pytest.fixture
def mock_prisma(monkeypatch):
    """
    prisma_clientをモックする
    """
    mock_client = AsyncMock()

    # user.find_unique デフォルトはNone(まだ登録されていない状態を想定)
    mock_client.users.find_unique.return_value = None

    # user.create → 作成成功時のモックデータ
    mock_client.users.create.return_value = AsyncMock(
        id="1",
        firebase_uid="test-uid",
        email="test@example.com",
        current_plan="free",
        is_verified=False,
    )

    # prisma_clientを実際のappに差し替える
    monkeypatch.setattr("app.routers.user.prisma_client", mock_client)

    # Firebase認証をモック
    app.dependency_overrides[verify_firebase_token] = lambda: "test-uid"

    return mock_client


# ======================
#  TC-USER-001
# ======================
# POST/api/users のテストコード
# 正常系（新規登録成功）
def test_create_user_success(mock_prisma):
    """
    正常系：新規ユーザーを登録できる
    """
    # users.find_unique → None(未登録)
    mock_prisma.users.find_unique.return_value = None

    # users.create → モックの新規ユーザー
    mock_prisma.users.create.return_value = AsyncMock(
        id="1",
        firebase_uid="test-uid",
        email="test@example.com",
        current_plan="free",
        is_verified=False,
    )

    payload = {
        "firebase_uid": "test-uid",
        "email": "test@example.com",
        "current_plan": "free",
        "is_verified": False,
    }

    response = client.post("/api/users", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["firebase_uid"] == "test-uid"
    assert data["email"] == "test@example.com"
    assert data["current_plan"] == "free"
    assert data["is_verified"] is False

    # prisma_clientの呼び出し確認
    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.users.create.assert_awaited_once()


# ======================
#  TC-USER-002
# ======================
# 異常系（既に登録済みエラー）
def test_create_user_conflict_error(mock_prisma):
    """
    異常系：既にユーザーが存在する場合
    """
    # users.find_unique → 既にユーザーがいる
    mock_prisma.users.find_unique.return_value = AsyncMock(id="1")

    payload = {
        "firebase_uid": "test-uid",
        "email": "test@example.com",
        "current_plan": "free",
        "is_verified": False,
    }

    response = client.post("/api/users", json=payload)

    assert response.status_code == 409
    data = response.json()
    assert "User already exists" in data["detail"]

    # prisma_clientの呼び出し確認
    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.users.create.assert_not_called()


# ======================
#  TC-USER-003
# ======================
# GET/api/users/me のテストコード
# 正常系（ユーザー情報取得成功）
def test_get_me_success(mock_prisma):
    """
    正常系：ログインユーザー情報を取得できる
    """
    # users.find_unique → ユーザーが見つかる
    mock_prisma.users.find_unique.return_value = AsyncMock(
        id="1",
        firebase_uid="test-uid",
        email="test@example.com",
        current_plan="free",
        is_verified=False,
        created_at="2025-07-01T12:34:56",
        updated_at=None,
    )

    response = client.get(
        "/api/users/me",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["current_plan"] == "free"
    assert data["is_verified"] is False

    # prisma_clientの呼び出し確認
    mock_prisma.users.find_unique.assert_awaited_once()


# ======================
#  TC-USER-004
# ======================
# 異常系（ユーザーが存在しない）
def test_get_me_not_found_error(mock_prisma):
    """
    異常系：ユーザーが存在しない場合
    """
    # users.find_unique → ユーザーがいない
    mock_prisma.users.find_unique.return_value = None

    response = client.get(
        "/api/users/me",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 404
    data = response.json()
    assert "User not found" in data["detail"]

    # prisma_clientの呼び出し確認
    mock_prisma.users.find_unique.assert_awaited_once()
