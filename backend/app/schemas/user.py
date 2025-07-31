from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# POST/api/usersのリクエストモデル
class UserCreateRequest(BaseModel):
    firebase_uid: str
    email: str
    current_plan: str
    is_verified: bool


# POST /api/usersのレスポンスモデル
class UserCreateResponse(BaseModel):
    id: str
    firebase_uid: str
    email: str
    current_plan: str
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # Prismaの戻り値をそのまま変換


# GET /api/users/meのレスポンスモデル
class UserMeResponse(BaseModel):
    id: str
    email: str
    current_plan: str
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
