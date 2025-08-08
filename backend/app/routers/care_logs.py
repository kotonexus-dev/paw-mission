"""お世話記録（care_logs）APIルーターの定義"""

# 標準ライブラリ
from datetime import datetime
from typing import Any

# サードパーティライブラリ
from fastapi import APIRouter, HTTPException, status, Query, Depends

# ローカルアプリケーション
from app.db import prisma_client
from app.schemas.care_logs import (
    CareLogResponse,
    CareLogCreateRequest,
    CareLogUpdateRequest,
    CareLogTodayResponse,
)
from app.dependencies import verify_firebase_token

# NOTE: キャッシュ機能は使用していません
# 理由: お世話記録は即時性が重要で、リアルタイムでの正確な情報提供が必要なため

care_logs_router = APIRouter(prefix="/api/care_logs", tags=["care_logs"])


@care_logs_router.patch(
    "/{care_log_id}",
    response_model=CareLogResponse,
    status_code=status.HTTP_200_OK,
)
async def update_care_log(
    care_log_id: int,
    request: CareLogUpdateRequest,
    firebase_uid: str = Depends(verify_firebase_token),
):
    """
    お世話記録の更新API（fed_morning / fed_night / walk_result の部分更新）
    """
    try:
        print(f"[care_logs] PATCH受信: care_log_id={care_log_id}, request={request}")

        # care_log_id と firebase_uid が紐づくかチェック（不正なIDで他人のログ更新を防ぐ）
        where_clause: Any = {
            "id": care_log_id,
            "care_setting": {"user": {"firebase_uid": firebase_uid}},
        }
        existing_log = await prisma_client.care_logs.find_first(where=where_clause)

        if not existing_log:
            print(f"[care_logs] care_log not found or not authorized: {care_log_id}")
            raise HTTPException(status_code=404, detail="Care log not found")

        update_data = request.model_dump(exclude_unset=True)
        print(f"[care_logs] 更新データ: {update_data}")

        # Type-safe update data
        data_update: Any = update_data
        where_update: Any = {"id": care_log_id}
        updated_log = await prisma_client.care_logs.update(
            where=where_update,
            data=data_update,
        )

        print(f"[care_logs] 更新成功: {updated_log.id if updated_log else 'Unknown'}")
        return updated_log

    except HTTPException:
        raise
    except Exception as e:
        print(f"[care_logs] PATCH エラー詳細: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500,
            detail="お世話記録の更新中にエラーが発生しました",
        ) from e


# POST /api/care_logs のルーター
@care_logs_router.post(
    "",
    response_model=CareLogResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_care_log(
    request: CareLogCreateRequest, firebase_uid: str = Depends(verify_firebase_token)
):
    """
    お世話記録の新規作成API
    ※ 通常は1日1件。重複記録は不可（エラー返却）
    """
    try:
        print(f"[care_logs] POST受信: firebase_uid={firebase_uid}, request={request}")

        # UID → users.id を取得
        user = await prisma_client.users.find_unique(
            where={"firebase_uid": firebase_uid}
        )
        if not user:
            raise HTTPException(status_code=401, detail="ユーザーが存在しません")

        # 対象ユーザーの care_setting を取得
        where_clause_setting: Any = {"user_id": user.id}
        care_setting = await prisma_client.care_settings.find_first(
            where=where_clause_setting
        )
        if not care_setting:
            raise HTTPException(status_code=404, detail="Care setting not found")

        # 同じ日付の記録がすでにあるかチェック
        where_clause_existing: Any = {
            "care_setting_id": care_setting.id,
            "date": request.date,
        }
        existing_log = await prisma_client.care_logs.find_first(
            where=where_clause_existing
        )

        if existing_log:
            print(f"[care_logs] 既存記録発見: {existing_log.id}")
            raise HTTPException(
                status_code=400,
                detail="この日付の記録は既に存在します。PATCHで更新してください。",
            )

        # 新規作成
        print(f"[care_logs] POST受信: firebase_uid={firebase_uid}, request={request}")
        print(f"[care_logs] 新規記録作成: request={request}, date={request.date}")
        dt = datetime.fromisoformat(request.date)
        print(f"[care_logs] 日付変換成功: {dt}")
        formatted_date = dt.strftime("%Y-%m-%d")
        print(f"[care_logs] フォーマット済み日付: {formatted_date}")
        new_log = await prisma_client.care_logs.create(
            data={
                "care_setting_id": care_setting.id,
                "date": formatted_date,  # そのまま文字列で保存
                "fed_morning": request.fed_morning,
                "fed_night": request.fed_night,
                "walk_result": request.walk_result,
                "walk_total_distance_m": request.walk_total_distance_m,
            }
        )

        print(f"[care_logs] 新規記録作成成功: {new_log.id}")
        return new_log

    except HTTPException:
        raise
    except Exception as e:
        print(f"[care_logs] POST エラー詳細: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500, detail="お世話記録の登録中にエラーが発生しました"
        ) from e


# GET /api/care_logs/today のルーター→ フロントで日本時間をUTCにしてリクエストしてもらう
@care_logs_router.get(
    "/today",
    response_model=CareLogTodayResponse,
    status_code=status.HTTP_200_OK,
)
async def get_today_care_log(
    care_setting_id: int = Query(...),
    date: str = Query(...),
    firebase_uid: str = Depends(verify_firebase_token),
):
    """
    指定日付文字列（例: "2025-07-01"）のお世話記録と散歩タスク完了状況を取得するAPI
    """
    try:
        print(
            f"[care_logs] GET today受信: "
            f"care_setting_id={care_setting_id}, firebase_uid={firebase_uid}"
        )
        print(f"[care_logs] 検索日付: {date}")

        # care_setting_id が本人のものか確認
        where_clause_auth: Any = {
            "id": care_setting_id,
            "user": {"firebase_uid": firebase_uid},
        }
        care_setting = await prisma_client.care_settings.find_first(
            where=where_clause_auth
        )
        if not care_setting:
            raise HTTPException(status_code=403, detail="不正な care_setting_id です")

        # 今日の care_log を取得
        where_clause_today: Any = {
            "care_setting_id": care_setting_id,
            "date": date,
        }
        care_log = await prisma_client.care_logs.find_first(where=where_clause_today)

        if not care_log:
            print("[care_logs] 今日の記録なし、デフォルト値で返却")
            return CareLogTodayResponse(
                care_log_id=None,
                fed_morning=False,
                fed_night=False,
                walked=False,
            )
        print(
            f"[care_logs] 今日の記録取得成功: {care_log.id if care_log else 'Unknown'}"
        )
        return CareLogTodayResponse(
            care_log_id=care_log.id if care_log else None,
            fed_morning=care_log.fed_morning or False,
            fed_night=care_log.fed_night or False,
            walked=care_log.walk_result or False,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[care_logs] GET today エラー詳細: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500,
            detail="今日のお世話記録取得中にエラーが発生しました",
        ) from e


# GET /api/care_logs/by_date のルーター（昨日の散歩状態を確認し、未実施ならば sad-departure ページへリダイレクト用のAPI）
@care_logs_router.get(
    "/by_date",
    response_model=CareLogTodayResponse,
    status_code=status.HTTP_200_OK,
)
# NOTE: このエンドポイントにはキャッシュを適用しない
# 理由: お世話記録の更新があった場合、すぐに最新の情報を取得する必要があるため
# 特に散歩状態の確認は、ユーザーの行動判定（reflection-writing ページへのリダイレクト等）に
# 直接影響するため、リアルタイムでの正確な情報が重要
async def get_care_log_by_date(
    care_setting_id: int = Query(...),
    date: str = Query(...),
    firebase_uid: str = Depends(verify_firebase_token),
):
    """
    指定日付文字列（例: "2025-07-01"）のお世話記録を取得するAPI
    """

    try:
        print(
            f"[care_logs] GET by_date受信: "
            f"care_setting_id={care_setting_id}, firebase_uid={firebase_uid}"
        )
        print(f"[care_logs] 検索日付: {date}")

        # care_setting_id が本人のものか確認
        where_clause_auth_by_date: Any = {
            "id": care_setting_id,
            "user": {"firebase_uid": firebase_uid},
        }
        care_setting = await prisma_client.care_settings.find_first(
            where=where_clause_auth_by_date
        )
        if not care_setting:
            raise HTTPException(status_code=403, detail="不正な care_setting_id です")

        # 該当日の care_log を取得
        where_clause_by_date: Any = {
            "care_setting_id": care_setting_id,
            "date": date,
        }
        care_log = await prisma_client.care_logs.find_first(where=where_clause_by_date)

        if not care_log:
            return CareLogTodayResponse(
                care_log_id=None,
                fed_morning=False,
                fed_night=False,
                walked=False,
            )

        return CareLogTodayResponse(
            care_log_id=care_log.id if care_log else None,
            fed_morning=care_log.fed_morning or False,
            fed_night=care_log.fed_night or False,
            walked=care_log.walk_result or False,
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[care_logs] GET by_date エラー詳細: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500,
            detail="指定日の記録取得中にエラーが発生しました",
        ) from e


# GET /api/care_logs/list のルーター（特定care_setting_idの全care_logs取得用）
@care_logs_router.get(
    "/list",
    status_code=status.HTTP_200_OK,
)
# NOTE: このエンドポイントにはキャッシュを適用しない
# 理由: 管理者画面（admin/reflections）で反省文機能に使用される際、
# ダッシュボードで新規作成されたlogsをリアルタイムで取得する必要があるため
# キャッシュがあると最新のcare_logs情報が反映されず、反省文の判定に影響する
async def get_care_logs_list(
    care_setting_id: int = Query(...),
    firebase_uid: str = Depends(verify_firebase_token),
):
    """
    特定care_setting_idの全care_logsを取得するAPI

    主な用途：
    - 管理者画面での反省文機能（admin/reflections）
    """

    try:
        print(f"[care_logs] GET list受信: care_setting_id={care_setting_id}")

        # care_setting_id が本人のものか確認
        where_clause_auth_list: Any = {
            "id": care_setting_id,
            "user": {"firebase_uid": firebase_uid},
        }
        care_setting = await prisma_client.care_settings.find_first(
            where=where_clause_auth_list
        )
        if not care_setting:
            raise HTTPException(status_code=403, detail="不正な care_setting_id です")

        # 全care_logsを取得
        where_clause_list: Any = {"care_setting_id": care_setting_id}
        care_logs = await prisma_client.care_logs.find_many(
            where=where_clause_list,
            order={"date": "asc"},
        )

        print(f"[care_logs] 取得したcare_logs数: {len(care_logs)}")

        # 必要な情報のみ返却
        result = []
        for log in care_logs:
            if log and log.id is not None:  # Type safety check
                result.append(
                    {
                        "id": log.id,
                        "date": log.date,
                        "walk_result": log.walk_result,
                        "care_setting_id": log.care_setting_id,
                    }
                )

        return {"care_logs": result}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[care_logs] GET list エラー詳細: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500,
            detail="care_logs一覧取得中にエラーが発生しました",
        ) from e
