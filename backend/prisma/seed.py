"""seed.py: ダミーデータを挿入するためのスクリプト"""

import asyncio
import uuid
import json
from datetime import datetime, timedelta
from app.db import prisma_client


async def main():
    """データベースにテスト用のダミーデータを挿入する非同期関数。
    各テーブルに1件ずつレコードを作成する。
    """  # C0116対策
    # Prisma クライアントの接続
    db = prisma_client
    await db.connect()

    # 1. ユーザーを作成（users テーブル）
    user = await db.users.create(
        data={
            "id": str(uuid.uuid4()),
            "firebase_uid": "test-firebase-uid",
            "email": "test@example.com",
            "current_plan": "free",
            "is_verified": True,
        }
    )

    # 2. お世話設定を作成（care_settings テーブル）
    care_setting = await db.care_settings.create(
        data={
            "user_id": user.id,
            "parent_name": "お母さん",
            "child_name": "たろう",
            "dog_name": "ポチ",
            "care_start_date": datetime.now() - timedelta(days=30),
            "care_end_date": datetime.now() + timedelta(days=30),
            "morning_meal_time": datetime.now().replace(hour=7, minute=0),
            "night_meal_time": datetime.now().replace(hour=18, minute=0),
            "walk_time": datetime.now().replace(hour=8, minute=0),
            "care_password": "1234",
            "care_clear_status": "未達成",
        }
    )

    # 3. お世話記録を作成（care_logs テーブル）
    care_log = await db.care_logs.create(
        data={
            "care_setting_id": care_setting.id,
            "date": datetime.now(),
            "fed_morning": True,
            "fed_night": False,
        }
    )

    # 4. 散歩ミッションを作成（walk_missions テーブル）
    await db.walk_missions.create(
        data={
            "care_log_id": care_log.id,
            "started_at": datetime.now() - timedelta(minutes=30),
            "ended_at": datetime.now(),
            "total_distance_m": 1500,
            "result": "success",
        }
    )

    # 5. 反省ノートを作成（reflection_notes テーブル）
    await db.reflection_notes.create(
        data={
            "care_setting_id": care_setting.id,
            "content": "きちんとお世話できました。",
            "approved_by_parent": True,
        }
    )

    # 6. メッセージログを作成（message_logs テーブル）
    await db.message_logs.create(
        data={
            "user_id": user.id,
            "content": "今日のポチの散歩、がんばったね！",
            "is_llm_based": True,
        }
    )

    # 7. 支払い記録を作成（payment テーブル）
    await db.payment.create(
        data={
            "user_id": user.id,
            "firebase_uid": user.firebase_uid,
            "stripe_session_id": "sess_test_123",
            "stripe_payment_intent_id": "pi_test_123",
            "stripe_charge_id": "ch_test_123",
            "amount": 980,
            "currency": "JPY",
            "status": "paid",
        }
    )

    # 8. Webhookイベントを作成（webhook_events テーブル）
    await db.webhook_events.create(
        data={
            "id": str(uuid.uuid4()),
            "event_type": "checkout.session.completed",
            "stripe_session_id": "sess_test_123",
            "stripe_payment_intent_id": "pi_test_123",
            "customer_email": user.email,
            "amount": 980,
            "currency": "JPY",
            "payment_status": "paid",
            "payload": json.dumps({"message": "テストデータ"}),
        }
    )

    # Prisma クライアントの切断
    await db.disconnect()


# メイン関数の実行
if __name__ == "__main__":
    asyncio.run(main())
