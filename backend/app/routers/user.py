from fastapi import APIRouter, HTTPException, Depends, status
from app.db import prisma_client
from app.dependencies import verify_firebase_token
from app.schemas.user import (
    UserCreateRequest,
    UserCreateResponse,
    UserMeResponse,
)


user_router = APIRouter(prefix="/api/users", tags=["users"])


# POST/api/users のルーター
@user_router.post(
    "/",
    response_model=UserCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_users(user_data: UserCreateRequest):
    """
    ユーザーの新規登録API
    """
    try:
        # すでに登録済みのFirebase UIDか確認
        existing_user = await prisma_client.users.find_unique(
            where={"firebase_uid": user_data.firebase_uid}
        )
        if existing_user:
            raise HTTPException(status_code=409, detail="User already exists")

        # 新規登録
        new_user = await prisma_client.users.create(
            data={
                "firebase_uid": user_data.firebase_uid,
                "email": user_data.email,
                "current_plan": user_data.current_plan,
                "is_verified": user_data.is_verified,
            }
        )
        return new_user

    except HTTPException:
        raise
    except Exception as e:
        # DBエラー時
        raise HTTPException(
            status_code=500, detail="ユーザー登録時にエラーが発生しました"
        ) from e


# GET/api/users/me のルーター
@user_router.get(
    "/me",
    response_model=UserMeResponse,
)
async def get_my_user(firebase_uid: str = Depends(verify_firebase_token)):
    # verify_firebase_token 関数が Authorization: Bearer <Firebase_ID_Token> を解析して UID を返すようにする
    """
    ログインユーザー情報の取得API
    """
    try:
        user = await prisma_client.users.find_unique(
            where={"firebase_uid": firebase_uid}
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="ユーザー情報取得時にエラーが発生しました"
        ) from e
