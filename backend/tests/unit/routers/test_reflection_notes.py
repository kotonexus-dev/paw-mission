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

    # user.find_unique デフォルトのモック動作（テスト内で上書き）
    mock_client.users.find_unique.return_value = None

    # care_setting.find_first
    mock_client.care_settings.find_first.return_value = None

    # prisma_clientを実際のappに差し替える
    monkeypatch.setattr("app.routers.reflection_notes.prisma_client", mock_client)

    # Firebase認証をモック
    app.dependency_overrides[verify_firebase_token] = lambda: "test-uid"

    return mock_client


# ======================
#  TC-REFLECT-001
# ======================
# POST /api/reflection_notesのテストコード
# 正常系（反省文を新規登録）
def test_create_reflection_note_success(mock_prisma):
    """
    正常系：
    ユーザーが存在し、care_settingも存在する場合に
    反省文を新規登録して201を返す
    """

    # users.find_uniqueをモック
    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)

    # care_settings.find_firstをモック
    mock_prisma.care_settings.find_first.return_value = AsyncMock(id=10)

    # reflection_notes.createをモック
    mock_prisma.reflection_notes.create.return_value = AsyncMock(
        id=123,
        care_setting_id=10,
        content="反省しています",
        approved_by_parent=False,
        created_at="2025-07-01T12:00:00",
        updated_at=None,
    )

    # リクエストペイロード
    request_payload = {"content": "反省しています"}

    # テストクライアントでPOST
    response = client.post(
        "/api/reflection_notes",
        json=request_payload,
        headers={"Authorization": "Bearer test-token"},
    )

    # レスポンス検証
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == 123
    assert data["care_setting_id"] == 10
    assert data["content"] == "反省しています"
    assert data["approved_by_parent"] is False

    # モック呼び出しの確認
    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.find_first.assert_awaited_once()
    mock_prisma.reflection_notes.create.assert_awaited_once()


# ======================
#  TC-REFLECT-002
# ======================
# 異常系（ユーザーが存在しない）
def test_create_reflection_note_user_not_found(mock_prisma):
    """
    異常系：ユーザーが存在しない場合 → 404
    """
    # users.find_unique が None を返す
    mock_prisma.users.find_unique.return_value = None

    request_payload = {"content": "ごめんなさい"}

    response = client.post(
        "/api/reflection_notes",
        json=request_payload,
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 404
    data = response.json()
    assert "ユーザーが見つかりません" in data["detail"]

    mock_prisma.users.find_unique.assert_awaited_once()


# ======================
#  TC-REFLECT-003
# ======================
# 異常系（お世話設定が存在しない）
def test_create_reflection_note_care_setting_not_found(mock_prisma):
    """
    異常系：お世話設定が存在しない場合 → 404
    """
    # ユーザーは存在
    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)
    # care_settings.find_first は None
    mock_prisma.care_settings.find_first.return_value = None

    request_payload = {"content": "ごめんなさい"}

    response = client.post(
        "/api/reflection_notes",
        json=request_payload,
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 404
    data = response.json()
    assert "お世話設定が見つかりません" in data["detail"]

    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.find_first.assert_awaited_once()


# ======================
#  TC-REFLECT-004
# ======================
# 異常系（サーバーエラー）
def test_create_reflection_note_prisma_exception(mock_prisma):
    """
    異常系：Prisma例外発生 → 500
    """
    # ユーザーもcare_settingも存在する
    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)
    mock_prisma.care_settings.find_first.return_value = AsyncMock(id=10)
    # create で例外を投げさせる
    mock_prisma.reflection_notes.create.side_effect = Exception("DB error")

    request_payload = {"content": "ごめんなさい"}

    response = client.post(
        "/api/reflection_notes",
        json=request_payload,
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 500
    data = response.json()
    assert "DB登録時にエラーが発生しました" in data["detail"]

    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.find_first.assert_awaited_once()
    mock_prisma.reflection_notes.create.assert_awaited_once()


# ======================
#  TC-REFLECT-005
# ======================
# GET /api/reflection_notesのテストコード
# 正常系（反省文一覧を取得）
def test_get_reflection_notes_success(mock_prisma):
    """
    正常系：care_settingに紐づく反省文一覧を返却
    """
    # ユーザー取得モック
    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)

    # care_setting取得モック
    mock_prisma.care_settings.find_first.return_value = AsyncMock(id=10)

    # reflection_notes.find_manyモック → 2件返す
    mock_prisma.reflection_notes.find_many.return_value = [
        AsyncMock(
            id=1,
            care_setting_id=10,
            content="反省文1",
            approved_by_parent=False,
            created_at="2025-07-01T12:00:00",
            updated_at=None,
        ),
        AsyncMock(
            id=2,
            care_setting_id=10,
            content="反省文2",
            approved_by_parent=True,
            created_at="2025-07-02T12:00:00",
            updated_at=None,
        ),
    ]

    response = client.get(
        "/api/reflection_notes",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0]["content"] == "反省文1"
    assert data[1]["approved_by_parent"] is True

    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.find_first.assert_awaited_once()
    mock_prisma.reflection_notes.find_many.assert_awaited_once()


# ======================
#  TC-REFLECT-006
# ======================
# 正常系（反省文が0件でも空リストを返す）
def test_get_reflection_notes_empty_list(mock_prisma):
    """
    正常系：反省文が0件でも空リストを返す
    """
    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)
    mock_prisma.care_settings.find_first.return_value = AsyncMock(id=10)
    mock_prisma.reflection_notes.find_many.return_value = []

    response = client.get(
        "/api/reflection_notes",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert data == []

    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.find_first.assert_awaited_once()
    mock_prisma.reflection_notes.find_many.assert_awaited_once()


# ======================
#  TC-REFLECT-007
# ======================
# 異常系（ユーザーが存在しない）
def test_get_reflection_notes_user_not_found(mock_prisma):
    """
    異常系：ユーザーが見つからない場合は404
    """
    # ユーザーレコードなし
    mock_prisma.users.find_unique.return_value = None

    response = client.get(
        "/api/reflection_notes",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 404
    data = response.json()
    assert "ユーザーが見つかりません" in data["detail"]


# ======================
#  TC-REFLECT-008
# ======================
# 異常系（お世話設定が存在しない）
def test_get_reflection_notes_care_setting_not_found(mock_prisma):
    """
    異常系：お世話設定が見つからない場合は404
    """
    # ユーザーはいるけどcare_setting未登録
    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)
    mock_prisma.care_settings.find_first.return_value = None

    response = client.get(
        "/api/reflection_notes",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 404
    data = response.json()
    assert "お世話設定が見つかりません" in data["detail"]


# ======================
#  TC-REFLECT-009
# ======================
# 異常系（サーバーエラー）
def test_get_reflection_notes_prisma_error(mock_prisma):
    """
    異常系：DB例外が発生した場合は500
    """
    # Prisma呼び出しでサーバー例外を再現
    mock_prisma.users.find_unique.side_effect = Exception("DBエラー")

    response = client.get(
        "/api/reflection_notes",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 500
    data = response.json()
    assert "DB取得時にエラーが発生しました" in data["detail"]


# ======================
#  TC-REFLECT-010
# ======================
# PATCH /api/reflection_notes/{note_id}
# 正常系（権限OKでapproved_by_parentを更新）
def test_patch_reflection_note_success(mock_prisma):
    """
    正常系：保護者が承認状態を更新できる
    """
    # ユーザー取得OK
    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)

    # care_setting取得OK
    mock_prisma.care_settings.find_first.return_value = AsyncMock(id=10)

    # 該当のreflection_note取得OK (権限確認)
    mock_prisma.reflection_notes.find_unique.return_value = AsyncMock(
        id=123, care_setting_id=10
    )

    # 更新結果をモック
    mock_prisma.reflection_notes.update.return_value = AsyncMock(
        id=123,
        care_setting_id=10,
        content="がんばります",
        approved_by_parent=True,
    )

    # PATCHリクエスト実行
    payload = {"approved_by_parent": True}
    response = client.patch(
        "/api/reflection_notes/123",
        json=payload,
        headers={"Authorization": "Bearer test-token"},
    )

    # 検証
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 123
    assert data["approved_by_parent"] is True
    assert data["content"] == "がんばります"

    # モック呼び出し確認
    mock_prisma.users.find_unique.assert_awaited_once()
    mock_prisma.care_settings.find_first.assert_awaited_once()
    mock_prisma.reflection_notes.find_unique.assert_awaited_once()
    mock_prisma.reflection_notes.update.assert_awaited_once()


# ======================
#  TC-REFLECT-011
# ======================
# 異常系（ユーザーが存在しない）
def test_patch_reflection_note_user_not_found(mock_prisma):
    """
    異常系：ユーザーが存在しない場合 404
    """
    mock_prisma.users.find_unique.return_value = None

    payload = {"approved_by_parent": True}
    response = client.patch(
        "/api/reflection_notes/123",
        json=payload,
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 404
    assert "ユーザーが見つかりません" in response.text


# ======================
#  TC-REFLECT-012
# ======================
# 異常系（お世話設定が存在しない）
def test_patch_reflection_note_care_setting_not_found(mock_prisma):
    """
    異常系：お世話設定が存在しない場合 404
    """
    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)
    mock_prisma.care_settings.find_first.return_value = None

    payload = {"approved_by_parent": True}
    response = client.patch(
        "/api/reflection_notes/123",
        json=payload,
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 404
    assert "お世話設定が見つかりません" in response.text


# ======================
#  TC-REFLECT-013
# ======================
# 異常系（指定した反省文が存在しない）
def test_patch_reflection_note_note_not_found(mock_prisma):
    """
    異常系：指定noteが存在しない場合 403
    """
    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)
    mock_prisma.care_settings.find_first.return_value = AsyncMock(id=10)
    mock_prisma.reflection_notes.find_unique.return_value = None

    payload = {"approved_by_parent": True}
    response = client.patch(
        "/api/reflection_notes/123",
        json=payload,
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 403
    assert "アクセスする権限" in response.text


# ======================
#  TC-REFLECT-014
# ======================
# 異常系（care_settingが一致しない）
def test_patch_reflection_note_forbidden_error(mock_prisma):
    """
    異常系：care_settingが一致しない場合 403
    """
    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)
    mock_prisma.care_settings.find_first.return_value = AsyncMock(id=10)
    # noteのcare_setting_idが別のもの
    mock_prisma.reflection_notes.find_unique.return_value = AsyncMock(
        id=123, care_setting_id=99
    )

    payload = {"approved_by_parent": True}
    response = client.patch(
        "/api/reflection_notes/123",
        json=payload,
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 403
    assert "アクセスする権限" in response.text


# ======================
#  TC-REFLECT-015
# ======================
# 異常系（サーバーエラー）
def test_patch_reflection_note_prisma_error(mock_prisma):
    """
    異常系：Prismaクエリで予期せぬ例外発生 → 500
    """
    mock_prisma.users.find_unique.side_effect = Exception("DB connection error")

    payload = {"approved_by_parent": True}
    response = client.patch(
        "/api/reflection_notes/123",
        json=payload,
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 500
    assert "反省文の更新中にエラー" in response.text
