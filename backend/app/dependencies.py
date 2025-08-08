"""Firebase authentication dependencies for FastAPI application."""

import json
import os

import firebase_admin
from dotenv import load_dotenv
from fastapi import HTTPException, status, Request
from firebase_admin import credentials, auth

load_dotenv()

# deploy時に環境変数を読み込むための設定
# FirebaseのサービスアカウントJSONファイルを読み込む
firebase_cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")

try:
    firebase_admin.get_app()
except ValueError as exc:
    # Firebase app not initialized yet
    if os.getenv("TESTING"):
        # テスト環境ではFirebaseを初期化しない
        firebase_admin.initialize_app(options={"projectId": "test-project"})
    elif not firebase_cred_json:
        raise RuntimeError(
            "FIREBASE_SERVICE_ACCOUNT 環境変数が設定されていません"
        ) from exc
    else:
        firebase_cred_dict = json.loads(firebase_cred_json)
        cred = credentials.Certificate(firebase_cred_dict)
        firebase_admin.initialize_app(cred)


def verify_firebase_token(request: Request) -> str:
    """Firebase IDトークンを検証して、UID（ユーザーID）を返す関数.

    Args:
        request: FastAPI Request object containing Authorization header

    Returns:
        str: Firebase UID of the authenticated user

    Raises:
        HTTPException: If token is missing or invalid
    """
    auth_header = request.headers.get("Authorization")

    # Authorization ヘッダーが存在しない、または "Bearer " で始まっていない場合はエラー
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
        )

    # "Bearer " の後のトークン部分を取得
    id_token = auth_header.split(" ")[1]

    try:
        # Firebase Admin SDK を使って　IDトークンを検証
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token["uid"]
        return uid
        # トークンの検証に失敗した場合は401エラーを返す
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}"
        ) from e
