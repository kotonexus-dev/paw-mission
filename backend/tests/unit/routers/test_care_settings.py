# pylint: disable=redefined-outer-name

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from datetime import datetime
from types import SimpleNamespace

from app.main import app
from app.dependencies import verify_firebase_token

# ======================
#  TestClientセットアップ
# ======================

client = TestClient(app)

# ======================
#  prisma_clientモック化
# ======================


@pytest.fixture
def mock_prisma(monkeypatch):
    """
    prisma_clientをモックするフィクスチャ
    - prisma_clientの全メソッドをAsyncMockに差し替え
    - Firebase認証も常に「test-uid」を返すようにオーバーライド
    """
    mock_client = AsyncMock()

    # デフォルトはNone（各テストで上書きする）
    mock_client.users.find_unique.return_value = None
    mock_client.care_settings.create.return_value = None
    mock_client.care_settings.find_first.return_value = None

    # アプリケーション内のprisma_clientをモックに差し替え
    monkeypatch.setattr("app.routers.care_settings.prisma_client", mock_client)

    # Firebase認証をモック（常に固定のUIDを返す）
    app.dependency_overrides[verify_firebase_token] = lambda: "test-uid"

    return mock_client


# ======================
#  TC-CARE-001
# ======================
# ======================
#  POST /api/care_settings 正常系テスト
# ======================


def test_create_care_setting_success(mock_prisma):
    """
    正常系：
    お世話設定を新規登録できる
    """

    # --- users.find_uniqueをモック ---
    # awaitすると「id属性を持つオブジェクト」が返る
    mock_prisma.users.find_unique = AsyncMock(return_value=SimpleNamespace(id="1"))

    # --- care_settings.createをモック ---
    # awaitすると「Prismaが返す想定のレコードオブジェクト」を再現
    mock_prisma.care_settings.create = AsyncMock(
        return_value=SimpleNamespace(
            id=10,
            user_id="1",
            parent_name="まゆみ",
            child_name="さき",
            dog_name="ころん",
            care_start_date=datetime(2025, 7, 1),
            care_end_date=datetime(2025, 8, 1),
            morning_meal_time=datetime(2025, 7, 1, 7, 30),
            night_meal_time=datetime(2025, 7, 1, 19, 0),
            walk_time=datetime(2025, 7, 1, 17, 0),
            care_password="1234",
            care_clear_status=None,
            created_at=datetime(2025, 7, 1, 12, 0),
            updated_at=None,
        )
    )

    # --- APIリクエストのペイロード ---
    payload = {
        "parent_name": "まゆみ",
        "child_name": "さき",
        "dog_name": "ころん",
        "care_start_date": "2025-07-01",
        "care_end_date": "2025-08-01",
        "morning_meal_time": "07:30:00",
        "night_meal_time": "19:00:00",
        "walk_time": "17:00:00",
        "care_password": "1234",
        "care_clear_status": None,
    }

    # --- テスト用クライアントでPOST ---
    response = client.post(
        "/api/care_settings",
        json=payload,
        headers={"Authorization": "Bearer test-token"},
    )

    print(response.status_code)
    print(response.text)

    # --- レスポンス検証 ---
    assert response.status_code == 201
    data = response.json()
    assert data["parent_name"] == "まゆみ"
    assert data["child_name"] == "さき"
    assert data["dog_name"] == "ころん"
    assert data["care_password"] == "1234"
    assert data.get("care_clear_status") is None

    # --- モック呼び出しの確認 ---
    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.create.assert_awaited_once()


# ======================
#  TC-CARE-002
# ======================
# ======================
#  POST /api/care_settings 異常系テスト（ユーザーが存在しない）
# ======================


def test_create_care_setting_user_not_found(mock_prisma):
    """
    異常系：
    Firebase認証済みだが、ユーザーが存在しない場合 → 404
    """

    # --- users.find_uniqueをモック ---
    # awaitするとNoneを返す → ユーザーが見つからないケースを再現
    mock_prisma.users.find_unique = AsyncMock(return_value=None)

    # --- APIリクエストのペイロード ---
    payload = {
        "parent_name": "まゆみ",
        "child_name": "さき",
        "dog_name": "ころん",
        "care_start_date": "2025-07-01",
        "care_end_date": "2025-08-01",
        "morning_meal_time": "07:30:00",
        "night_meal_time": "19:00:00",
        "walk_time": "17:00:00",
        "care_password": "1234",
        "care_clear_status": None,
    }

    # --- テスト用クライアントでPOST ---
    response = client.post(
        "/api/care_settings",
        json=payload,
        headers={"Authorization": "Bearer test-token"},
    )

    print(response.status_code)
    print(response.text)

    # --- レスポンス検証 ---
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "User not found"

    # --- モック呼び出し確認 ---
    mock_prisma.users.find_unique.assert_awaited_once()
    # care_settings.createは呼ばれない
    mock_prisma.care_settings.create.assert_not_awaited()


# ======================
#  TC-CARE-003
# ======================
# ======================
#  POST /api/care_settings 異常系テスト（Prisma例外やサーバーエラー）
# ======================


def test_create_care_setting_prisma_error(mock_prisma):
    """
    異常系：
    Prismaのcreateで例外発生 → 500エラー
    """

    # --- users.find_uniqueは正常にユーザーを返す ---
    mock_prisma.users.find_unique = AsyncMock(return_value=SimpleNamespace(id="1"))

    # --- care_settings.createをawaitすると例外を投げる ---
    mock_prisma.care_settings.create = AsyncMock(
        side_effect=Exception("DB error simulated")
    )

    # --- APIリクエストのペイロード ---
    payload = {
        "parent_name": "まゆみ",
        "child_name": "さき",
        "dog_name": "ころん",
        "care_start_date": "2025-07-01",
        "care_end_date": "2025-08-01",
        "morning_meal_time": "07:30:00",
        "night_meal_time": "19:00:00",
        "walk_time": "17:00:00",
        "care_password": "1234",
        "care_clear_status": None,
    }

    # --- テスト用クライアントでPOST ---
    response = client.post(
        "/api/care_settings",
        json=payload,
        headers={"Authorization": "Bearer test-token"},
    )

    print(response.status_code)
    print(response.text)

    # --- レスポンス検証 ---
    assert response.status_code == 500
    data = response.json()
    assert data["detail"] == "お世話設定の登録中にエラーが発生しました"

    # --- モック呼び出し確認 ---
    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.create.assert_awaited_once()


# ======================
#  TC-CARE-004
# ======================
# ======================
#  GET /api/care_settings/me 正常系テスト
# ======================


def test_get_my_care_setting_success(mock_prisma):
    """
    正常系：
    ログインユーザーのケア設定を取得できる
    """

    # --- users.find_uniqueをモック ---
    # awaitすると「id属性を持つオブジェクト」を返す
    mock_prisma.users.find_unique = AsyncMock(return_value=SimpleNamespace(id="1"))

    # --- care_settings.find_firstをモック ---
    # Prismaが返すレコードを再現
    mock_prisma.care_settings.find_first = AsyncMock(
        return_value=SimpleNamespace(
            id=10,
            parent_name="まゆみ",
            child_name="さき",
            dog_name="ころん",
            care_start_date=datetime(2025, 7, 1),
            care_end_date=datetime(2025, 8, 1),
            morning_meal_time=datetime(2025, 7, 1, 7, 30),
            night_meal_time=datetime(2025, 7, 1, 19, 0),
            walk_time=datetime(2025, 7, 1, 17, 0),
        )
    )

    # --- テスト用クライアントでGET ---
    response = client.get(
        "/api/care_settings/me",
        headers={"Authorization": "Bearer test-token"},
    )

    print(response.status_code)
    print(response.text)

    # --- レスポンス検証 ---
    assert response.status_code == 200
    data = response.json()
    assert data["parent_name"] == "まゆみ"
    assert data["child_name"] == "さき"
    assert data["dog_name"] == "ころん"
    assert data["care_start_date"] == "2025-07-01"
    assert data["care_end_date"] == "2025-08-01"
    assert data["morning_meal_time"] == "07:30:00"
    assert data["night_meal_time"] == "19:00:00"
    assert data["walk_time"] == "17:00:00"

    # --- モック呼び出し確認 ---
    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.find_first.assert_awaited_once()


# ======================
#  TC-CARE-005
# ======================
# ======================
#  GET /api/care_settings/me 異常系テスト（ユーザーが存在しない → 404）
# ======================


def test_get_my_care_setting_user_not_found(mock_prisma):
    """
    異常系：
    Firebase認証済みだが、ユーザーが存在しない場合 → 404
    """

    # --- users.find_uniqueをモック ---
    # awaitするとNoneを返す → ユーザーが見つからないケース
    mock_prisma.users.find_unique = AsyncMock(return_value=None)

    # --- care_settings.find_firstは呼ばれないので確認用にモック ---
    mock_prisma.care_settings.find_first = AsyncMock()

    # --- テスト用クライアントでGET ---
    response = client.get(
        "/api/care_settings/me",
        headers={"Authorization": "Bearer test-token"},
    )

    print(response.status_code)
    print(response.text)

    # --- レスポンス検証 ---
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "User not found"

    # --- モック呼び出し確認 ---
    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.find_first.assert_not_awaited()


# ======================
#  TC-CARE-006
# ======================
# ======================
#  GET /api/care_settings/me 異常系テスト（CareSettingが存在しない → 404）
# ======================


def test_get_my_care_setting_care_setting_not_found(mock_prisma):
    """
    異常系：
    ユーザーは存在するが、CareSettingが存在しない場合 → 404
    """

    # --- users.find_uniqueをモック ---
    # awaitすると「idを持つオブジェクト」を返す → ユーザーは正常に見つかる
    mock_prisma.users.find_unique = AsyncMock(return_value=SimpleNamespace(id="1"))

    # --- care_settings.find_firstをモック ---
    # awaitするとNoneを返す → CareSettingが見つからないケース
    mock_prisma.care_settings.find_first = AsyncMock(return_value=None)

    # --- テスト用クライアントでGET ---
    response = client.get(
        "/api/care_settings/me",
        headers={"Authorization": "Bearer test-token"},
    )

    print(response.status_code)
    print(response.text)

    # --- レスポンス検証 ---
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "Care setting not found"

    # --- モック呼び出し確認 ---
    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.find_first.assert_awaited_once()


# ======================
#  TC-CARE-007
# ======================
# ======================
#  POST /api/care_settings/verify_pin 正常系テスト
# ======================


def test_verify_pin_success(mock_prisma):
    """
    正常系：
    入力PINと登録PINが一致 → verified: True
    """

    # --- users.find_uniqueをモック ---
    mock_prisma.users.find_unique = AsyncMock(return_value=SimpleNamespace(id="1"))

    # --- care_settings.find_firstをモック（PIN一致） ---
    mock_prisma.care_settings.find_first = AsyncMock(
        return_value=SimpleNamespace(care_password="1234")
    )

    # --- テスト用クライアントでPOST ---
    response = client.post(
        "/api/care_settings/verify_pin",
        json={"input_password": "1234"},
        headers={"Authorization": "Bearer test-token"},
    )

    print(response.status_code)
    print(response.text)

    # --- レスポンス検証 ---
    assert response.status_code == 200
    data = response.json()
    assert data["verified"] is True

    # --- モック呼び出し確認 ---
    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.find_first.assert_awaited_once()


# ======================
#  TC-CARE-008
# ======================
# ======================
#  POST /api/care_settings/verify_pin 正常系テスト（PIN不一致 → verified: False）
# ======================


def test_verify_pin_not_matched(mock_prisma):
    """
    正常系：
    入力PINと登録PINが一致しない → verified: False
    """

    # --- users.find_uniqueをモック ---
    mock_prisma.users.find_unique = AsyncMock(return_value=SimpleNamespace(id="1"))

    # --- care_settings.find_firstをモック（PINは"1234"） ---
    mock_prisma.care_settings.find_first = AsyncMock(
        return_value=SimpleNamespace(care_password="1234")
    )

    # --- テスト用クライアントでPOST（異なるPINを送る） ---
    response = client.post(
        "/api/care_settings/verify_pin",
        json={"input_password": "0000"},
        headers={"Authorization": "Bearer test-token"},
    )

    print(response.status_code)
    print(response.text)

    # --- レスポンス検証 ---
    assert response.status_code == 200
    data = response.json()
    assert data["verified"] is False

    # --- モック呼び出し確認 ---
    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.find_first.assert_awaited_once()


# ======================
#  TC-CARE-009
# ======================
# ======================
#  POST /api/care_settings/verify_pin 異常系テスト（ユーザーが存在しない → 404）
# ======================


def test_verify_pin_user_not_found(mock_prisma):
    """
    異常系：
    Firebase認証済みだが、ユーザーが存在しない場合 → 404
    """

    # --- users.find_uniqueをモック（Noneを返す） ---
    mock_prisma.users.find_unique = AsyncMock(return_value=None)

    # --- テスト用クライアントでPOST ---
    response = client.post(
        "/api/care_settings/verify_pin",
        json={"input_password": "1234"},
        headers={"Authorization": "Bearer test-token"},
    )

    print(response.status_code)
    print(response.text)

    # --- レスポンス検証 ---
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "User not found"

    # --- モック呼び出し確認 ---
    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.find_first.assert_not_awaited()


# ======================
#  TC-CARE-0010
# ======================
# ======================
#  POST /api/care_settings/verify_pin 異常系テスト（Prisma例外 → 500）
# ======================


def test_verify_pin_prisma_error(mock_prisma):
    """
    異常系：
    care_settings.find_firstで例外発生 → 500
    """

    # --- users.find_uniqueをモック（正常） ---
    mock_prisma.users.find_unique = AsyncMock(return_value=SimpleNamespace(id="1"))

    # --- care_settings.find_firstを例外を投げるモック ---
    mock_prisma.care_settings.find_first = AsyncMock(
        side_effect=Exception("DB error simulated")
    )

    # --- テスト用クライアントでPOST ---
    response = client.post(
        "/api/care_settings/verify_pin",
        json={"input_password": "1234"},
        headers={"Authorization": "Bearer test-token"},
    )

    print(response.status_code)
    print(response.text)

    # --- レスポンス検証 ---
    assert response.status_code == 500
    data = response.json()
    assert data["detail"] == "PIN認証中にエラーが発生しました"

    # --- モック呼び出し確認 ---
    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.find_first.assert_awaited_once()
