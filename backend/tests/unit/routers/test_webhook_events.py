# pylint: disable=redefined-outer-name
# pylint: disable=unused-argument

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from app.main import app
import json
from app.routers.webhook_events import process_webhook_event

# テストクライアント
client = TestClient(app)


@pytest.fixture
def mock_prisma(monkeypatch):
    """
    prisma_clientをモックする
    - /api/webhook_eventsエンドポイントで使うものを全部AsyncMockで置き換え
    """

    mock_client = AsyncMock()

    # usersテーブル
    mock_client.users.find_unique.return_value = None
    mock_client.users.update.return_value = None

    # webhook_eventsテーブル
    mock_client.webhook_events.create.return_value = AsyncMock(
        id="evt_test_123",
        payload="{}",
        firebase_uid="test-uid",
        processed=False,
        error_message=None,
    )
    mock_client.webhook_events.find_many.return_value = []
    mock_client.webhook_events.update.return_value = None

    # paymentテーブル
    mock_client.payment.create.return_value = None

    # 実際のprisma_clientを差し替える
    monkeypatch.setattr("app.routers.webhook_events.prisma_client", mock_client)

    return mock_client


# ======================
#  TC-WEBHOOK-001
# ======================
# POST /api/webhook_eventsのテストコード
# 正常系（Webhook eventを保存）
# ① event_type = checkout.session.completed
def test_webhook_event_checkout_session_completed_triggers_processing(
    mock_prisma, monkeypatch
):
    """
    正常系：
    - event_typeがcheckout.session.completedなら
      webhook_events.createもprocess_webhook_eventも呼ばれる
    """
    # process_webhook_eventをモック
    process_mock = AsyncMock()
    monkeypatch.setattr(
        "app.routers.webhook_events.process_webhook_event", process_mock
    )

    payload = {
        "id": "evt_test_123",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_abc",
                "metadata": {"firebase_uid": "test-uid"},
                "payment_intent": "pi_test_123",
            }
        },
    }

    response = client.post(
        "/api/webhook_events/",
        data=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert "Webhook eventを保存しました" in response.text

    # DB保存
    mock_prisma.webhook_events.create.assert_awaited_once()
    # 自動処理
    process_mock.assert_awaited_once()


# ======================
#  TC-WEBHOOK-002
# ======================
# ② event_type = payment_intent.succeeded
def test_webhook_event_other_type_does_not_trigger_processing(mock_prisma, monkeypatch):
    """
    正常系：
    - 他のevent_typeなら
      webhook_events.createは呼ばれるが、process_webhook_eventは呼ばれない
    """
    process_mock = AsyncMock()
    monkeypatch.setattr(
        "app.routers.webhook_events.process_webhook_event", process_mock
    )

    payload = {
        "id": "evt_test_456",
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_test_456",
            }
        },
    }

    response = client.post(
        "/api/webhook_events/",
        data=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    assert "Webhook eventを保存しました" in response.text

    # DB保存はされる
    mock_prisma.webhook_events.create.assert_awaited_once()
    # 自動処理は呼ばれない
    process_mock.assert_not_awaited()


# ======================
#  TC-WEBHOOK-003
# ======================
# 異常系（prisma_client.webhook_events.create が例外を投げる）
def test_webhook_event_db_create_error_returns_500(mock_prisma, monkeypatch):
    """
    異常系：
    - prisma_client.webhook_events.create が例外を投げたら
      HTTP 500 が返る
    """
    # DB createが例外を投げるようにする
    mock_prisma.webhook_events.create.side_effect = RuntimeError("DB failure")

    payload = {
        "id": "evt_test_500",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_error",
                "metadata": {"firebase_uid": "test-uid"},
            }
        },
    }

    response = client.post(
        "/api/webhook_events/",
        data=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 500
    assert "Webhook processing failed" in response.text


# ======================
#  TC-WEBHOOK-004
# ======================
# 異常系（リクエストボディが不正）
def test_webhook_event_invalid_json_returns_500(mock_prisma):
    """
    異常系：
    - 不正なJSONを送るとHTTP 500が返る
    （実装上、全Exceptionをキャッチして500に変換してるため）
    """
    invalid_body = '{"id": "evt_test", "type": "checkout.session.completed"'

    response = client.post(
        "/api/webhook_events/",
        data=invalid_body,
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 500
    assert "Webhook processing failed" in response.text


# ======================
#  TC-WEBHOOK-005
# ======================
# POST /api/webhook_events/processのテストコード
# 正常系（未処理イベントがある → paymentテーブルに書き込む)
def test_process_webhook_events_with_unprocessed_events(mock_prisma):
    """
    正常系：
    - 未処理のcheckout.session.completedイベントがある場合
    - payment.create、users.update、webhook_events.updateが呼ばれる
    - 200 + 件数メッセージを返す
    """

    # イベントのpayloadをモック
    sample_payload = {
        "data": {
            "object": {
                "id": "cs_test",
                "payment_intent": "pi_test",
                "amount_total": 300,
                "currency": "jpy",
                "payment_status": "paid",
            }
        }
    }

    # 未処理イベントをモック
    mock_event = AsyncMock(
        id="evt_123", payload=json.dumps(sample_payload), firebase_uid="user-uid"
    )

    mock_prisma.webhook_events.find_many.return_value = [mock_event]
    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)
    mock_prisma.payment.create.return_value = AsyncMock()
    mock_prisma.users.update.return_value = AsyncMock()
    mock_prisma.webhook_events.update.return_value = AsyncMock()

    response = client.post("/api/webhook_events/process")

    assert response.status_code == 200
    data = response.json()
    assert "1 件のイベントを処理してpaymentテーブルに保存しました" in data["message"]

    # 各呼び出しが行われたことを確認
    mock_prisma.webhook_events.find_many.assert_awaited_once()
    mock_prisma.payment.create.assert_awaited_once()
    mock_prisma.users.update.assert_awaited_once()
    mock_prisma.webhook_events.update.assert_awaited()


# ======================
#  TC-WEBHOOK-006
# ======================
# 正常系(未処理イベントが0件の場合)
def test_process_webhook_events_no_unprocessed_events(mock_prisma):
    """
    正常系：
    - 未処理のイベントがない場合
    - payment.createなどは呼ばれない
    - 200 + メッセージを返す
    """
    # 未処理イベント0件
    mock_prisma.webhook_events.find_many.return_value = []

    response = client.post("/api/webhook_events/process")

    assert response.status_code == 200
    data = response.json()
    assert "未処理のWebhookイベントはありません" in data["message"]

    # 他のDB操作は呼ばれない
    mock_prisma.payment.create.assert_not_awaited()
    mock_prisma.users.update.assert_not_awaited()
    mock_prisma.webhook_events.update.assert_not_awaited()


# ======================
#  TC-WEBHOOK-007
# ======================
# 異常系（prisma_client.webhook_events.find_manyが例外を投げる）
def test_process_webhook_events_find_many_raises_500(mock_prisma):
    """
    異常系：
    - find_manyが例外を投げた場合
    - HTTP 500を返す
    """
    mock_prisma.webhook_events.find_many.side_effect = RuntimeError("DB Error!")

    response = client.post("/api/webhook_events/process")

    assert response.status_code == 500
    data = response.json()
    assert data["detail"] == "Webhook event processing failed"

    mock_prisma.webhook_events.find_many.assert_awaited_once()


# ======================
#  TC-WEBHOOK-008
# ======================
# 異常系（process中のpayment.createやusers.updateが例外→エラーをwebhook_events.updateに保存）
def test_process_webhook_events_partial_processing_error_returns_500(mock_prisma):
    """
    異常系：
    - payment.createなど途中のDB処理で例外発生
    - 500エラーを返す
    """
    sample_payload = {
        "data": {
            "object": {
                "id": "cs_test",
                "payment_intent": "pi_test",
                "amount_total": 300,
                "currency": "jpy",
                "payment_status": "paid",
            }
        }
    }

    mock_event = AsyncMock(
        id="evt_123", payload=json.dumps(sample_payload), firebase_uid="user-uid"
    )
    mock_prisma.webhook_events.find_many.return_value = [mock_event]

    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)
    mock_prisma.payment.create.side_effect = RuntimeError("Simulated Insert Failure")

    response = client.post("/api/webhook_events/process")

    # 失敗する場合は500
    assert response.status_code == 500
    data = response.json()
    assert data["detail"] == "Webhook event processing failed"

    mock_prisma.webhook_events.find_many.assert_awaited_once()
    mock_prisma.payment.create.assert_awaited_once()


# process_webhook_event関数の単体テスト
# ======================
#  TC-WEBHOOK-009
# ======================
# 正常系（payloadが文字列）
@pytest.mark.asyncio
async def test_process_event_with_string_payload(mock_prisma):
    payload_dict = {
        "data": {
            "object": {
                "id": "cs_test",
                "payment_intent": "pi_test",
                "amount_total": 500,
                "currency": "jpy",
                "payment_status": "paid",
            }
        }
    }
    event = AsyncMock(
        id="evt_123",
        payload=json.dumps(payload_dict),
        firebase_uid="user-uid",
    )

    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)

    await process_webhook_event(event)

    mock_prisma.payment.create.assert_awaited_once()
    mock_prisma.users.update.assert_awaited_once()
    mock_prisma.webhook_events.update.assert_awaited_with(
        where={"id": event.id}, data={"processed": True}
    )


# ======================
#  TC-WEBHOOK-010
# ======================
# 正常系（payloadがdict）
@pytest.mark.asyncio
async def test_process_event_with_dict_payload(mock_prisma):
    payload_dict = {
        "data": {
            "object": {
                "id": "cs_test",
                "payment_intent": "pi_test",
                "amount_total": 800,
                "currency": "usd",
                "payment_status": "paid",
            }
        }
    }
    event = AsyncMock(
        id="evt_456",
        payload=payload_dict,
        firebase_uid="user-uid",
    )

    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)

    await process_webhook_event(event)

    mock_prisma.payment.create.assert_awaited_once()
    mock_prisma.users.update.assert_awaited_once()
    mock_prisma.webhook_events.update.assert_awaited_with(
        where={"id": event.id}, data={"processed": True}
    )


# ======================
#  TC-WEBHOOK-011
# ======================
# 例外系
@pytest.mark.asyncio
async def test_process_event_db_error_logs_error_message(mock_prisma):
    payload_dict = {
        "data": {
            "object": {
                "id": "cs_test",
                "payment_intent": "pi_test",
                "amount_total": 1000,
                "currency": "usd",
                "payment_status": "paid",
            }
        }
    }
    event = AsyncMock(
        id="evt_error",
        payload=json.dumps(payload_dict),
        firebase_uid="user-uid",
    )

    mock_prisma.users.find_unique.return_value = AsyncMock(id=1)
    mock_prisma.payment.create.side_effect = RuntimeError("DB Insert Failure")

    await process_webhook_event(event)

    mock_prisma.webhook_events.update.assert_any_await(
        where={"id": event.id}, data={"error_message": "DB Insert Failure"}
    )


# ======================
#  TC-WEBHOOK-012
# ======================
# スキップ系
# ①stripe_session_idがない
@pytest.mark.asyncio
async def test_process_event_missing_stripe_session_id_skips(mock_prisma):
    payload_dict = {"data": {"object": {}}}
    event = AsyncMock(
        id="evt_no_session",
        payload=json.dumps(payload_dict),
        firebase_uid="user-uid",
    )

    await process_webhook_event(event)

    mock_prisma.payment.create.assert_not_awaited()
    mock_prisma.users.update.assert_not_awaited()


# ======================
#  TC-WEBHOOK-013
# ======================
# ②firebase_uidがNone
@pytest.mark.asyncio
async def test_process_event_missing_firebase_uid_skips(mock_prisma):
    payload_dict = {"data": {"object": {"id": "cs_test"}}}
    event = AsyncMock(
        id="evt_no_uid",
        payload=json.dumps(payload_dict),
        firebase_uid=None,
    )

    await process_webhook_event(event)

    mock_prisma.payment.create.assert_not_awaited()
    mock_prisma.users.update.assert_not_awaited()


# ======================
#  TC-WEBHOOK-014
# ======================
# ③users.find_uniqueがNone
@pytest.mark.asyncio
async def test_process_event_user_not_found_skips(mock_prisma):
    payload_dict = {"data": {"object": {"id": "cs_test"}}}
    event = AsyncMock(
        id="evt_user_not_found",
        payload=json.dumps(payload_dict),
        firebase_uid="user-uid",
    )

    mock_prisma.users.find_unique.return_value = None

    await process_webhook_event(event)

    mock_prisma.payment.create.assert_not_awaited()
    mock_prisma.users.update.assert_not_awaited()
