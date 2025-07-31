# pylint: disable=redefined-outer-name

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from app.main import app
from app.dependencies import verify_firebase_token
from types import SimpleNamespace
from app.routers.message_logs import get_openai_message

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

    # prisma_clientを実際のappに差し替える
    monkeypatch.setattr("app.routers.message_logs.prisma_client", mock_client)

    # Firebase認証をモック
    app.dependency_overrides[verify_firebase_token] = lambda: "test-uid"

    return mock_client


# ======================
#  TC-MSG-001
# ======================
# POST /api/message_logs/generateのテストコード
# 正常系（無料プラン→固定メッセージ返却）
# ランダムメッセージから取ってくるためmonkeypatchも引数にとる
def test_generate_message_free_plan(mock_prisma, monkeypatch):
    """
    正常系：ユーザーが無料プランの場合、固定メッセージを返す
    """
    # users.find_uniqueをモック
    mock_prisma.users.find_unique.return_value = SimpleNamespace(
        id=1, current_plan="free"
    )

    # random.choiceを強制的に「わん！」にする
    monkeypatch.setattr("app.routers.message_logs.random.choice", lambda x: "わん！")

    # テストクライアントでPOST
    response = client.post(
        "/api/message_logs/generate",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "わん！"

    mock_prisma.users.find_unique.assert_awaited_once()


# ======================
#  TC-MSG-002
# ======================
# 正常系（プレミアムプラン→get_openai_messageの戻り値を使う）
def test_generate_message_premium_plan(mock_prisma, monkeypatch):
    """
    正常系：ユーザーがプレミアムプランの場合、get_openai_messageの戻り値を返す
    """
    # users.find_uniqueをモック
    mock_prisma.users.find_unique.return_value = SimpleNamespace(
        id=1, current_plan="premium"
    )

    # get_openai_messageを強制モック
    monkeypatch.setattr(
        "app.routers.message_logs.get_openai_message", lambda: "おべんきょうするわん！"
    )

    # テストクライアントでPOST
    response = client.post(
        "/api/message_logs/generate",
        headers={"Authorization": "Bearer test-token"},
    )

    # 検証
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "おべんきょうするわん！"

    # モック呼び出しを確認
    mock_prisma.users.find_unique.assert_awaited_once()


# ======================
#  TC-MSG-003
# ======================
# 正常系（プレミアムプランだが、get_openai_message側エラー→固定メッセージ返却）
def test_generate_message_premium_plan_fallback_on_error(mock_prisma, monkeypatch):
    """
    正常系：ユーザーがプレミアムプランだがget_openai_messageがエラーを起こす場合、
    固定メッセージからフォールバックメッセージを返す
    """
    # users.find_uniqueをモック
    mock_prisma.users.find_unique.return_value = SimpleNamespace(
        id=1, current_plan="premium"
    )

    # get_openai_messageを例外を投げるモックにする
    def raise_error():
        raise TypeError("OpenAI側で予期しないTypeError")

    monkeypatch.setattr("app.routers.message_logs.get_openai_message", raise_error)

    # random.choiceも固定値を返すようにする
    monkeypatch.setattr("app.routers.message_logs.random.choice", lambda x: "わん！")

    # テストクライアントでPOST
    response = client.post(
        "/api/message_logs/generate",
        headers={"Authorization": "Bearer test-token"},
    )

    # 検証
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "わん！"

    # モック呼び出しを確認
    mock_prisma.users.find_unique.assert_awaited_once()


# ======================
#  TC-MSG-004
# ======================
# 異常系（ユーザーが存在しない場合 → 400エラー）
def test_generate_message_user_not_found(mock_prisma):
    """
    異常系：
    Firebase UIDに対応するユーザーが存在しない場合、
    400エラーとエラーメッセージを返す
    """
    # users.find_unique → None（ユーザー見つからない想定）
    mock_prisma.users.find_unique.return_value = None

    # テストクライアントでPOST
    response = client.post(
        "/api/message_logs/generate",
        headers={"Authorization": "Bearer test-token"},
    )

    # ステータスコード400を期待
    assert response.status_code == 400
    data = response.json()
    assert "Firebase UIDのユーザーが存在しません" in data["detail"]

    # find_unique が1回だけ呼ばれていることを検証
    mock_prisma.users.find_unique.assert_awaited_once()


# ======================
#  TC-MSG-005
# ======================
# 異常系（prisma_client例外発生 → フォールバック固定メッセージを返す）
def test_generate_message_prisma_client_error_returns_fallback(
    mock_prisma, monkeypatch
):
    """
    異常系：
    prisma_clientのusers.find_uniqueが例外を投げた場合、
    サーバーエラー扱いで固定メッセージを返す
    """

    # users.find_uniqueを例外を投げるようにモック
    async def raise_error(*args, **kwargs):
        raise AttributeError("DBアクセス失敗")

    mock_prisma.users.find_unique.side_effect = raise_error

    # random.choiceを固定に
    monkeypatch.setattr("app.routers.message_logs.random.choice", lambda x: "わん！")

    # リクエスト
    response = client.post(
        "/api/message_logs/generate",
        headers={"Authorization": "Bearer test-token"},
    )

    # 200 OK（フォールバック動作なので200で固定メッセージを返す）
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "わん！"

    # prisma呼び出しは試みている
    mock_prisma.users.find_unique.assert_awaited_once()


# ======================
#  TC-MSG-006
# ======================
# ---get_openai_messageの単体テスト---
def test_get_openai_message_empty_response(monkeypatch):
    # 環境変数 OPENAI_API_KEY をダミー値にセット（os.getenvで拾わせるため）
    monkeypatch.setenv("OPENAI_API_KEY", "dummy")

    # ここからOpenAIクライアントを丸ごとモック
    # ---- OpenAI().chat.completions.create() の呼び出し階層を再現する ----

    # モックレスポンスのchoices要素
    # choices[0].message.content が None になるように
    class DummyChoices:
        message = type("M", (), {"content": None})

    # chat.completions.create() が返すもの
    class DummyCompletionResponse:
        choices = [DummyChoices()]

    # .completions.create() の構造
    class DummyCompletions:
        def create(self, **_kwargs):
            return DummyCompletionResponse()

    # .chat の構造
    class DummyChat:
        completions = DummyCompletions()

    # OpenAI() で返る最終クライアント
    class DummyClient:
        chat = DummyChat()

    # OpenAIクラスを強制的にこのモッククライアントに差し替える
    monkeypatch.setattr(
        "app.routers.message_logs.OpenAI", lambda api_key: DummyClient()
    )

    # random.choiceも強制的に「わん！」を返すようにする
    # → get_openai_message()がfallbackしたとき必ず「わん！」を返す
    monkeypatch.setattr("app.routers.message_logs.random.choice", lambda x: "わん！")

    # テスト対象実行
    result = get_openai_message()

    # 期待通りfallbackメッセージになることを確認
    assert result == "わん！"
