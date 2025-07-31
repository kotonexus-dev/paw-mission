"""お世話記録（care_logs）用のPydanticスキーマ定義"""

# 標準ライブラリ
from datetime import datetime, date
from typing import Optional

# サードパーティライブラリ
from pydantic import BaseModel, Field


# /api/care_logs のレスポンスモデル
class CareLogResponse(BaseModel):
    """お世話記録のレスポンス用モデル"""

    id: int
    care_setting_id: int
    date: str  # Prismaスキーマに合わせてstrに変更
    fed_morning: Optional[bool]
    fed_night: Optional[bool]
    walk_result: Optional[bool]  # 追加
    walk_total_distance_m: Optional[int]  # 追加
    created_at: datetime

    class Config:
        """Pydantic設定クラス（ORMモデル対応）"""

        from_attributes = True


# POST /api/care_logs のリクエストモデル
class CareLogCreateRequest(BaseModel):
    """お世話記録の新規作成用リクエストモデル"""

    date: str  # フロントエンドからはstr形式で受信
    fed_morning: Optional[bool] = None  # 散歩のみの場合は任意項目
    fed_night: Optional[bool] = None  # 散歩のみの場合は任意項目
    walk_result: Optional[bool] = None  # 散歩結果（boolean）
    walk_total_distance_m: Optional[int] = None  # 散歩距離（メートル）


# PATCH /api/care_logs/:id のリクエストモデル
class CareLogUpdateRequest(BaseModel):
    """お世話記録の更新用リクエストモデル"""

    fed_morning: Optional[bool] = None
    fed_night: Optional[bool] = None
    walk_result: Optional[bool] = None  # 追加
    walk_total_distance_m: Optional[int] = None  # 追加


# 今日のお世話記録取得用レスポンスモデル
class CareLogTodayResponse(BaseModel):
    """今日のお世話記録取得用レスポンスモデル"""

    care_log_id: int | None
    fed_morning: bool
    fed_night: bool
    walked: bool
