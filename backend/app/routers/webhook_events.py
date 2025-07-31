from app.db import prisma_client
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
import json

webhook_events_router = APIRouter(prefix="/api/webhook_events", tags=["webhook_events"])


@webhook_events_router.post("/")
async def stripe_webhook(request: Request):
    """
    StripeのWebhookイベントを受け取るエンドポイント
    """
    try:
        # ここにStripeのWebhookイベント処理ロジックを実装
        # 例: 支払い成功時の処理など
        event = await request.json()
        # print(f"[INFO] Webhook event のjson形式を確認: {event}")

        # 必要な中身を取り出す
        event_id = event.get("id")  # Stripeが発行する「このWebhookイベント自体のID」
        event_type = event.get("type")
        data_object = event.get("data", {}).get("object", {})

        if event_type == "checkout.session.completed":
            # Checkoutセッション完了イベントの場合、セッションIDを取得
            stripe_session_id = data_object.get("id")
            firebase_uid = data_object.get("metadata", {}).get("firebase_uid")
        else:
            # 他のイベントタイプの場合はセッションIDはNone
            stripe_session_id = None
            firebase_uid = None

        payment_intent_id = data_object.get("payment_intent")
        customer_email = data_object.get("billing_details", {}).get("email")
        amount = data_object.get("amount")
        currency = data_object.get("currency")
        payment_status = data_object.get("status")

        # webhook_eventsテーブルに保存
        saved_event = await prisma_client.webhook_events.create(
            data={
                "id": event_id,
                "event_type": event_type,
                "stripe_session_id": stripe_session_id,  # CheckoutセッションID
                "stripe_payment_intent_id": payment_intent_id,
                "customer_email": customer_email,
                "amount": amount,
                "currency": currency,
                "payment_status": payment_status,
                "payload": json.dumps(event),  # Webhookイベントの全体を保存
                "processed": False,  # 未処理フラグ
                "firebase_uid": firebase_uid,  # Firebase UIDを保存
            }
        )

        # 受信直後に即処理を呼ぶ
        if event_type == "checkout.session.completed":
            # checkout.session.completed イベントの場合、即座に処理を開始
            await process_webhook_event(saved_event)

        return JSONResponse(
            {"message": "Webhook eventを保存しました"},
            status_code=200,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Webhook処理失敗: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed") from e


# 条件に合う未処理のWebhookイベントを処理してpaymentテーブルに送る関数
async def process_webhook_event(event):
    """
    未処理のWebhookイベントを処理してpaymentテーブルに送る関数
    """
    print(f"[INFO] 自動処理開始: {event.id}")
    try:
        # payloadを復元する(文字列ならjson.loads、dictならそのまま)
        if isinstance(event.payload, dict):
            payload = event.payload
        else:
            payload = json.loads(event.payload)
        data_object = payload.get("data", {}).get("object", {})

        # 必要な情報を取り出す
        stripe_session_id = data_object.get("id")
        if not stripe_session_id:
            print(f"[WARN] session_idが取れないのでスキップ: {event.id}")
            return

        payment_intent_id = data_object.get("payment_intent")
        amount = data_object.get("amount_total")
        currency = data_object.get("currency")
        payment_status = data_object.get("payment_status")

        # webhook_eventsテーブルからeventを取って、event.firebase_uidを取り出す
        firebase_uid = event.firebase_uid
        if not firebase_uid:
            print(f"[WARN] Firebase UIDが見つからないのでスキップ: {event.id}")
            return

        # ユーザーをfirebase_uidで探す
        user_record = await prisma_client.users.find_unique(
            where={"firebase_uid": firebase_uid}
        )
        if not user_record:
            print(
                f"[WARN] Firebase UIDに対応するユーザーが見つからないのでスキップ: {firebase_uid}"
            )
            return

        user_id = user_record.id  # ユーザーIDを取得

        # paymentテーブルにINSERT
        await prisma_client.payment.create(
            data={
                "user_id": user_id,  # 本当はFirebaseUIDからマッピングする
                "firebase_uid": event.firebase_uid,  # webhook_eventsテーブルに入ってるfirebase_uidカラムの値
                "stripe_session_id": stripe_session_id,
                "stripe_payment_intent_id": payment_intent_id,
                "amount": amount,
                "currency": currency,
                "status": payment_status,
            }
        )

        # ユーザープランをpremiumに更新
        await prisma_client.users.update(
            where={"id": user_id},
            data={"current_plan": "premium"},  # ユーザープランをプレミアムに更新
        )

        # 処理が完了したら、webhook_events.processedをTrueに更新
        await prisma_client.webhook_events.update(
            where={"id": event.id}, data={"processed": True}
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Webhookイベントの処理に失敗しました: {e}")
        # エラー内容をwebhook_eventsテーブルに保存
        await prisma_client.webhook_events.update(
            where={"id": event.id}, data={"error_message": str(e)}
        )


# 手動操作によるWebhookイベント処理エンドポイント
@webhook_events_router.post("/process")
async def process_webhook_events():
    """
    未処理のWebhookイベントを処理してpaymentテーブルに送るエンドポイント
    """
    try:
        # 未処理のcheckout.session.completed のWebhookイベントを取得
        events = await prisma_client.webhook_events.find_many(
            where={"processed": False, "event_type": "checkout.session.completed"}
        )

        # もし0件なら早期リターン
        if not events:
            return JSONResponse(
                {"message": "未処理のWebhookイベントはありません"},
                status_code=200,
            )

        # 1件ずつループ処理を行う
        for event in events:
            # イベントの処理ロジックを実装
            print(f"[INFO] 処理中のWebhookイベント: {event.id}")

            # payloadを復元する(文字列ならjson.loads、dictならそのまま)
            if isinstance(event.payload, dict):
                payload = event.payload
            else:
                payload = json.loads(event.payload)
            data_object = payload.get("data", {}).get("object", {})

            # 必要な情報を取り出す
            stripe_session_id = data_object.get("id")

            if not stripe_session_id:
                print(f"[WARN] session_idが取れないのでスキップ: {event.id}")
                continue

            payment_intent_id = data_object.get("payment_intent")
            amount = data_object.get("amount_total")
            currency = data_object.get("currency")
            payment_status = data_object.get("payment_status")

            # webhook_eventsテーブルからeventを取って、event.firebase_uidを取り出す
            firebase_uid = event.firebase_uid
            if not firebase_uid:
                print(f"[WARN] Firebase UIDが見つからないのでスキップ: {event.id}")
                continue

            # firebase_uidでusersテーブルからユーザーを取得
            user_record = await prisma_client.users.find_unique(
                where={"firebase_uid": firebase_uid}
            )
            if not user_record:
                print(
                    f"[WARN] Firebase UIDに対応するユーザーが見つからないのでスキップ: {firebase_uid}"
                )
                continue

            user_id = user_record.id  # ユーザーIDを取得

            # paymentテーブルにINSERT
            await prisma_client.payment.create(
                data={
                    "user_id": user_id,  # 本当はFirebaseUIDからマッピングする
                    "firebase_uid": event.firebase_uid,  # webhook_eventsテーブルに入ってるfirebase_uidカラムの値
                    "stripe_session_id": stripe_session_id,
                    "stripe_payment_intent_id": payment_intent_id,
                    "amount": amount,
                    "currency": currency,
                    "status": payment_status,
                }
            )

            # ユーザープランをpremiumに更新
            await prisma_client.users.update(
                where={"id": user_id},
                data={"current_plan": "premium"},  # ユーザープランをプレミアムに更新
            )

            # 処理が完了したら、DBのprocessedをTrueに更新
            await prisma_client.webhook_events.update(
                where={"id": event.id}, data={"processed": True}
            )

        return JSONResponse(
            {
                "message": f"{len(events)} 件のイベントを処理してpaymentテーブルに保存しました"
            },
            status_code=200,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Webhookイベントの処理に失敗しました: {e}")
        raise HTTPException(
            status_code=500, detail="Webhook event processing failed"
        ) from e
