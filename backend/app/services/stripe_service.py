# paymentルーターに呼ばれるStripeサービス層

import os
import stripe

# 環境変数からStripeの秘密鍵と価格IDを取得
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
PRICE_ID = os.getenv("STRIPE_PRICE_ID")
YOUR_DOMAIN = os.getenv("YOUR_DOMAIN")


def create_checkout_session(firebase_uid: str):
    checkout_session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        # 決済するアイテム情報のリスト
        # Stripeダッシュボードで事前に登録した商品・価格を使う
        line_items=[
            {
                "price": PRICE_ID,
                "quantity": 1,
            },
        ],
        mode="payment",
        success_url=YOUR_DOMAIN + "/admin/payment/success",
        cancel_url=YOUR_DOMAIN + "/admin/payment/cancel",
        metadata={
            "firebase_uid": firebase_uid,  # Firebase UIDをメタデータに保存
        },
    )
    # セッションのURLを返す
    return checkout_session.url
