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

    # user.find_unique
    mock_client.users.find_unique.return_value = AsyncMock(id=1)

    # care_setting.find_first
    mock_client.care_settings.find_first.return_value = AsyncMock(id=10)

    # care_logs.find_first → 既存ログなし
    mock_client.care_logs.find_first.return_value = None

    # care_logs.create → 作成成功
    mock_client.care_logs.create.return_value = AsyncMock(
        id=123,
        care_setting_id=10,
        date="2025-07-01",
        fed_morning=True,
        fed_night=False,
        walk_result=True,
        walk_total_distance_m=1000,
    )

    # prisma_clientを実際のappに差し替える
    monkeypatch.setattr("app.routers.care_logs.prisma_client", mock_client)

    # Firebase認証をモック
    app.dependency_overrides[verify_firebase_token] = lambda: "test-uid"

    return mock_client


# ======================
#  TC-LOG-001
# ======================
# POST /api/care_logs のテストコード
# 正常系
def test_create_success(mock_prisma):
    """
    正常系：care_logを新規登録できる
    """
    request_payload = {
        "date": "2025-07-01",
        "fed_morning": True,
        "fed_night": False,
        "walk_result": True,
        "walk_total_distance_m": 1000,
    }

    # テストクライアントでPOST
    response = client.post(
        "/api/care_logs",
        json=request_payload,
        headers={"Authorization": "Bearer test-token"},
    )
    assert response.status_code == 201
    data = response.json()

    # モックした戻り値と一致することを確認
    assert data["id"] == 123
    assert data["date"] == "2025-07-01"
    assert data["fed_morning"] is True
    assert data["fed_night"] is False
    assert data["walk_result"] is True
    assert data["walk_total_distance_m"] == 1000

    # prisma_clientの呼び出しを確認
    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.find_first.assert_awaited()
    mock_prisma.care_logs.create.assert_awaited_once()


# ======================
#  TC-LOG-002
# ======================
# 異常系
def test_create_conflict_error(mock_prisma):
    """
    異常系：同じ日付の記録が既に存在する場合
    """
    # 既存ログがあるようにモックを変更
    mock_prisma.care_logs.find_first.return_value = AsyncMock(id=999)

    request_payload = {
        "date": "2025-07-01",
        "fed_morning": True,
        "fed_night": False,
        "walk_result": True,
        "walk_total_distance_m": 1000,
    }

    response = client.post(
        "/api/care_logs",
        json=request_payload,
        headers={"Authorization": "Bearer test-token"},
    )

    # 期待する異常応答
    assert response.status_code == 400
    data = response.json()
    assert "この日付の記録は既に存在します" in data["detail"]


# ======================
#  TC-LOG-003
# ======================
# PATCH /api/care_logs/{care_log_id} のテストコード
# 正常系
def test_patch_success(mock_prisma):
    """
    正常系：既存のcare_logを部分更新できる
    """
    # 既存ログを返すようモック
    mock_prisma.care_logs.find_first.return_value = AsyncMock(id=123)

    # 更新後ログを返すようモック
    mock_prisma.care_logs.update.return_value = AsyncMock(
        id=123,
        care_setting_id=10,
        date="2025-07-01",
        fed_morning=False,
        fed_night=True,
        walk_result=True,
        walk_total_distance_m=500,
    )

    request_payload = {
        "fed_morning": False,
        "fed_night": True,
        "walk_result": True,
        "walk_total_distance_m": 500,
    }

    response = client.patch(
        "/api/care_logs/123",
        json=request_payload,
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 123
    assert data["fed_morning"] is False
    assert data["fed_night"] is True
    assert data["walk_result"] is True
    assert data["walk_total_distance_m"] == 500

    # prisma_client呼び出し確認
    mock_prisma.care_logs.find_first.assert_awaited_once()
    mock_prisma.care_logs.update.assert_awaited_once()


# ======================
#  TC-LOG-004
# ======================
# 異常系
def test_patch_not_found_error(mock_prisma):
    """
    異常系：存在しないIDを指定した場合
    """
    # 該当ログがない
    mock_prisma.care_logs.find_first.return_value = None

    request_payload = {"fed_morning": True}

    response = client.patch(
        "/api/care_logs/999",
        json=request_payload,
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 404
    data = response.json()
    assert "Care log not found" in data["detail"]


# ======================
#  TC-LOG-005
# ======================
# GET /api/care_logs/today のテストコード
# 正常系（ログがある場合）
def test_get_today_success(mock_prisma):
    """
    正常系：当日のお世話記録が存在する場合
    """
    # care_settings.find_first → 権限OK
    mock_prisma.care_settings.find_first.return_value = AsyncMock(id=10)

    # care_logs.find_first → 当日ログが存在
    mock_prisma.care_logs.find_first.return_value = AsyncMock(
        id=123, fed_morning=True, fed_night=False, walk_result=True
    )

    response = client.get(
        "/api/care_logs/today",
        params={"care_setting_id": 10, "date": "2025-07-01"},
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["care_log_id"] == 123
    assert data["fed_morning"] is True
    assert data["fed_night"] is False
    assert data["walked"] is True


# ======================
#  TC-LOG-006
# ======================
# 正常系（ログがない場合→デフォルト値）
def test_get_today_default_response(mock_prisma):
    """
    正常系：当日のお世話記録が存在しない場合
    """
    # care_settings.find_first → 権限OK
    mock_prisma.care_settings.find_first.return_value = AsyncMock(id=10)

    # care_logs.find_first → 当日ログが存在
    mock_prisma.care_logs.find_first.return_value = None

    response = client.get(
        "/api/care_logs/today",
        params={"care_setting_id": 10, "date": "2025-07-01"},
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["care_log_id"] is None
    assert data["fed_morning"] is False
    assert data["fed_night"] is False
    assert data["walked"] is False


# ======================
#  TC-LOG-007
# ======================
# 異常系（権限がない場合）
def test_get_today_forbidden_error(mock_prisma):
    """
    異常系：自分のcare_setting_idでない場合
    """
    # care_settings.find_first → Noneで権限エラー
    mock_prisma.care_settings.find_first.return_value = None

    response = client.get(
        "/api/care_logs/today",
        params={"care_setting_id": 999, "date": "2025-07-01"},
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 403
    data = response.json()
    assert "不正な care_setting_id です" in data["detail"]


# ======================
#  TC-LOG-008
# ======================
# GET /api/care_logs/by_date のテストコード
# 正常系（ログがある場合）
def test_get_by_date_success(mock_prisma):
    """
    正常系：指定日のお世話記録が存在する場合
    """
    # care_settings.find_first → 権限OK
    mock_prisma.care_settings.find_first.return_value = AsyncMock(id=10)

    # care_logs.find_first → 当日ログが存在
    mock_prisma.care_logs.find_first.return_value = AsyncMock(
        id=123, fed_morning=True, fed_night=False, walk_result=True
    )

    response = client.get(
        "/api/care_logs/by_date",
        params={"care_setting_id": 10, "date": "2025-07-01"},
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["care_log_id"] == 123
    assert data["fed_morning"] is True
    assert data["fed_night"] is False
    assert data["walked"] is True


# ======================
#  TC-LOG-009
# ======================
# 正常系（ログがない場合→デフォルト値）
def test_get_by_date_default_response(mock_prisma):
    """
    正常系：指定日のお世話記録が存在しない場合
    """
    # care_settings.find_first → 権限OK
    mock_prisma.care_settings.find_first.return_value = AsyncMock(id=10)

    # care_logs.find_first → 当日ログが存在
    mock_prisma.care_logs.find_first.return_value = None

    response = client.get(
        "/api/care_logs/by_date",
        params={"care_setting_id": 10, "date": "2025-07-01"},
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["care_log_id"] is None
    assert data["fed_morning"] is False
    assert data["fed_night"] is False
    assert data["walked"] is False


# ======================
#  TC-LOG-010
# ======================
# 異常系（権限がない場合）
def test_get_by_date_forbidden_error(mock_prisma):
    """
    異常系：他人のcare_setting_idを指定した場合
    """
    # care_settings.find_first → Noneで権限エラー
    mock_prisma.care_settings.find_first.return_value = None

    response = client.get(
        "/api/care_logs/by_date",
        params={"care_setting_id": 999, "date": "2025-07-01"},
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 403
    data = response.json()
    assert "不正な care_setting_id です" in data["detail"]


# ======================
#  TC-LOG-011
# ======================
# GET /api/care_logs/list のテストコード
# 正常系（複数件取得）
def test_get_list_success(mock_prisma):
    """
    正常系：care_logsを一覧取得できる
    """
    # care_settings.find_first → 権限OK
    mock_prisma.care_settings.find_first.return_value = AsyncMock(id=10)

    # care_logs.find_many → 一覧が存在
    mock_prisma.care_logs.find_many.return_value = [
        AsyncMock(id=1, date="2025-07-01", walk_result=True, care_setting_id=10),
        AsyncMock(id=2, date="2025-07-02", walk_result=False, care_setting_id=10),
    ]

    response = client.get(
        "/api/care_logs/list",
        params={"care_setting_id": 10},
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "care_logs" in data
    assert len(data["care_logs"]) == 2

    assert data["care_logs"][0]["id"] == 1
    assert data["care_logs"][0]["date"] == "2025-07-01"
    assert data["care_logs"][0]["walk_result"] is True
    assert data["care_logs"][0]["care_setting_id"] == 10


# ======================
#  TC-LOG-012
# ======================
# 正常系（空リストの場合）
def test_get_list_empty_response(mock_prisma):
    """
    正常系：care_logsが0件でも200で空リスト
    """
    # care_settings.find_first → 権限OK
    mock_prisma.care_settings.find_first.return_value = AsyncMock(id=10)

    # care_logs.find_many → 0件
    mock_prisma.care_logs.find_many.return_value = []

    response = client.get(
        "/api/care_logs/list",
        params={"care_setting_id": 10},
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "care_logs" in data
    assert data["care_logs"] == []


# ======================
#  TC-LOG-013
# ======================
# 異常系（他人のcare_setting_idを指定）
def test_get_list_forbidden_error(mock_prisma):
    """
    異常系：他人のcare_setting_idを指定した場合
    """
    # care_settings.find_first → Noneで権限エラー
    mock_prisma.care_settings.find_first.return_value = None

    response = client.get(
        "/api/care_logs/list",
        params={"care_setting_id": 999},
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 403
    data = response.json()
    assert "不正な care_setting_id です" in data["detail"]
