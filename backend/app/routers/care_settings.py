"""
Care settings router module.

このモジュールは、お世話設定に関するAPIエンドポイントを提供します。
"""

from datetime import time, datetime

from fastapi import APIRouter, HTTPException, Depends, status

from app.db import prisma_client
from app.schemas.care_settings import (
    CareSettingCreateRequest,
    CareSettingCreateResponse,
    CareSettingMeResponse,
    VerifyPinRequest,
    VerifyPinResponse,
)

from app.dependencies import verify_firebase_token

from fastapi_cache.decorator import cache
from fastapi_cache.key_builder import default_key_builder

care_settings_router = APIRouter(prefix="/api/care_settings", tags=["care_settings"])


# POST/api/care_settingsのルーター
@care_settings_router.post(
    "",
    response_model=CareSettingCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_care_setting(
    request: CareSettingCreateRequest,
    firebase_uid: str = Depends(verify_firebase_token),
):
    """
    お世話設定の新規作成API
    """
    try:
        # Firebase UIDからユーザー取得
        user = await prisma_client.users.find_unique(
            where={"firebase_uid": firebase_uid}
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # ケア設定を作成
        care_setting = await prisma_client.care_settings.create(
            data={
                "user_id": user.id,
                "parent_name": request.parent_name,
                "child_name": request.child_name,
                "dog_name": request.dog_name,
                "care_start_date": datetime.combine(request.care_start_date, time.min),
                "care_end_date": datetime.combine(request.care_end_date, time.min),
                "morning_meal_time": datetime.combine(
                    request.care_start_date, request.morning_meal_time
                ),
                "night_meal_time": datetime.combine(
                    request.care_start_date, request.night_meal_time
                ),
                "walk_time": datetime.combine(
                    request.care_start_date, request.walk_time
                ),
                "care_password": request.care_password,
                "care_clear_status": request.care_clear_status,
            }
        )

        return CareSettingCreateResponse(
            id=care_setting.id,
            user_id=care_setting.user_id,
            parent_name=care_setting.parent_name,
            child_name=care_setting.child_name,
            dog_name=care_setting.dog_name,
            care_start_date=care_setting.care_start_date.date(),
            care_end_date=care_setting.care_end_date.date(),
            morning_meal_time=care_setting.morning_meal_time.time(),
            night_meal_time=care_setting.night_meal_time.time(),
            walk_time=care_setting.walk_time.time(),
            care_password=care_setting.care_password,
            care_clear_status=care_setting.care_clear_status,
            created_at=care_setting.created_at,
            updated_at=care_setting.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="お世話設定の登録中にエラーが発生しました"
        ) from e


# GET/api/care_settings/meのルーター
@care_settings_router.get(
    "/me",
    response_model=CareSettingMeResponse,
    status_code=status.HTTP_200_OK,
)
@cache(expire=60, key_builder=default_key_builder)  # キャッシュ追加
async def get_my_care_setting(firebase_uid: str = Depends(verify_firebase_token)):
    """
    ログインユーザーのケア設定取得API
    """
    print("🔥 /me：キャッシュ未使用時だけ表示される！")

    try:
        print("✅ firebase_uid:", firebase_uid)
        # Firebase UID からユーザー取得
        user = await prisma_client.users.find_unique(
            where={"firebase_uid": firebase_uid}
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # 該当ユーザーのケア設定を取得
        care_setting = await prisma_client.care_settings.find_first(
            where={"user_id": user.id}
        )

        print("✅ care_setting:", care_setting)

        if not care_setting:
            raise HTTPException(status_code=404, detail="Care setting not found")

        return CareSettingMeResponse(
            id=care_setting.id,
            parent_name=care_setting.parent_name,
            child_name=care_setting.child_name,
            dog_name=care_setting.dog_name,
            care_start_date=care_setting.care_start_date.date(),
            care_end_date=care_setting.care_end_date.date(),
            morning_meal_time=care_setting.morning_meal_time.time(),
            night_meal_time=care_setting.night_meal_time.time(),
            walk_time=care_setting.walk_time.time(),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="お世話設定の取得中にエラーが発生しました"
        ) from e


# POST /api/care_settings/verify_pinのルーター
@care_settings_router.post(
    "/verify_pin",
    response_model=VerifyPinResponse,
    status_code=status.HTTP_200_OK,
)
async def verify_care_setting_pin(
    request: VerifyPinRequest,
    firebase_uid: str = Depends(verify_firebase_token),
):
    """
    管理者PINの新規登録API
    """
    try:
        user = await prisma_client.users.find_unique(
            where={"firebase_uid": firebase_uid}
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        care_setting = await prisma_client.care_settings.find_first(
            where={"user_id": user.id}
        )
        if not care_setting:
            return VerifyPinResponse(verified=False)

        is_match = request.input_password == care_setting.care_password
        return VerifyPinResponse(verified=is_match)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="PIN認証中にエラーが発生しました"
        ) from e
