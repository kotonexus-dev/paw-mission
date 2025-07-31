# app/routers/payment.py

from fastapi import APIRouter, HTTPException, Depends
from app.services import stripe_service
from fastapi.responses import JSONResponse


# token追加
from app.dependencies import verify_firebase_token
from app.db import prisma_client

payment_router = APIRouter(prefix="/api/payments", tags=["payments"])


# @payment_router.post("/create-checkout-session")
# async def create_checkout_session(request_data: CheckoutSessionCreateRequest):
@payment_router.post("/create-checkout-session")
async def create_checkout_session(
    firebase_uid: str = Depends(verify_firebase_token),  # ← サーバー側で安全に取得
):
    """
    フロントが呼ぶ「Checkoutセッション作成API」
    → Stripe決済ページへのURLを返す
    """
    try:
        print(f"[INFO] サーバーで取り出したFirebase UID: {firebase_uid}")

        # ユーザー情報をDBから取得
        user = await prisma_client.users.find_unique(
            where={"firebase_uid": firebase_uid}
        )

        # 既にプレミアムプランなら弾く
        if user and user.current_plan == "premium":
            raise HTTPException(
                status_code=400,
                detail="すでにプレミアムプランです。再度の購入は不要です。",
            )

        # StripeのCheckoutセッションを作成
        session_url = stripe_service.create_checkout_session(firebase_uid)

        # セッションのURLを返す
        return JSONResponse(
            {"url": session_url},
            status_code=200,
        )

    except HTTPException as e:
        # 400など自分で投げたものはそのまま返す
        raise e
    except Exception as e:
        print(f"[ERROR] create_checkout_session: {e}")
        raise HTTPException(
            status_code=500,
            detail="決済セッション生成中にサーバーエラーが発生しました",
        ) from e


# 異常系（Stripe Service側が例外を投げる）
