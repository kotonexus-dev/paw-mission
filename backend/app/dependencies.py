# File: backend/app/dependencies.py
from dotenv import load_dotenv

load_dotenv()

import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, status, Request
import json

# deploy時に環境変数を読み込むための設定
# FirebaseのサービスアカウントJSONファイルを読み込む
firebase_cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")

if not firebase_admin._apps:
    if not firebase_cred_json:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT 環境変数が設定されていません")
    firebase_cred_dict = json.loads(firebase_cred_json)
    cred = credentials.Certificate(firebase_cred_dict)
    firebase_admin.initialize_app(cred)

# # FirebaseのサービスアカウントJSONファイルを読み込む
# cred_path = os.getenv("FIREBASE_CREDENTIAL_PATH")


# # すでに初期化されていない場合のみ初期化する（2重初期化防止）
# if not firebase_admin._apps:
#     cred = credentials.Certificate(cred_path)
#     firebase_admin.initialize_app(cred)


# Firebase IDトークンを検証して、UID（ユーザーID）を返す関数
def verify_firebase_token(request: Request) -> str:
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
