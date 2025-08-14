"""FastAPIメインアプリケーションのエントリーポイント"""

import os
from contextlib import asynccontextmanager

# NOTE: 本番環境ではコメントアウト or 削除しておくこと
# import time

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from dotenv import load_dotenv


# fastapi-cache2
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend

# NOTE: キャッシュ機能の検証が完了したら削除または専用ルーターに移動する
# from fastapi_cache.decorator import cache

# Redis をimport
import redis.asyncio as redis

# FastAPI Exporterを使ってメトリクス収集のためimport
from prometheus_fastapi_instrumentator import Instrumentator

# .envファイルから環境変数を読み込む（依存関係のあるモジュールより先に実行する必要がある）
load_dotenv()

# NOTE: 以下の import は load_dotenv() の後に配置する必要がある
# pylint: disable-next=wrong-import-position,wrong-import-order
from app.routers.user import user_router
from app.routers.care_logs import care_logs_router
from app.routers.care_settings import care_settings_router
from app.routers.reflection_notes import reflection_notes_router
from app.routers.message_logs import message_logs_router
from app.routers.payment import payment_router
from app.routers.webhook_events import webhook_events_router


# Prisma Client を使うための import
from app.db import prisma_client


# Prisma Client の lifespan context manager（FastAPI v0.95以降の推奨）
@asynccontextmanager
async def lifespan(_: FastAPI):
    """起動時と終了時の処理をまとめて管理"""
    # Redis接続
    # NOTE: Redisはローカル環境（localhost:6379）を想定しているため、Docker環境では別途設定が必要
    # redis_client = redis.Redis(host="localhost", port=6379, decode_responses=True)
    # docker環境でのRedis接続を考慮
    redis_client = redis.Redis(host="redis", port=6379, decode_responses=True)

    # FastAPICacheを先に初期化
    FastAPICache.init(RedisBackend(redis_client), prefix="fastapi-cache")

    # Prisma起動
    await prisma_client.connect()  # 起動時の処理
    yield
    await prisma_client.disconnect()  # 終了時の処理


# lifespanを使ったFastAPIインスタンス
app = FastAPI(lifespan=lifespan)

origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001"
).split(",")

# CORSの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターを登録
app.include_router(user_router)
app.include_router(care_logs_router)
app.include_router(care_settings_router)
app.include_router(reflection_notes_router)
app.include_router(message_logs_router)
app.include_router(payment_router)
app.include_router(webhook_events_router)


# ルートパス
@app.get("/")
async def read_root():
    """ルートパスのテスト用エンドポイント"""
    return {"message": "Hello from FastAPI!"}


# メトリクス収集器の初期化と有効化
Instrumentator().instrument(app).expose(app)


# レスポンスタイム遅延テスト用エンドポイント
# NOTE: Prometheusのアラート発火を意図的に検証するために使用する
# @app.get("/slow")
# async def slow_endpoint():
#     """わざと5.0秒待つ遅いレスポンス（Prometheusのalertテスト用）"""
#     time.sleep(5.0)
#     return {"message": "This is a slow response"}


# Redisキャッシュテスト用エンドポイント
# NOTE: 現状ではキャッシュの有効性テストのみに使われており、仕様上の制約に注意
# @app.get("/cache-test")
# @cache(expire=60)
# async def cache_test():
#     """Redisキャッシュ機能をテストするエンドポイント

#     Returns:
#         dict: キャッシュテスト用メッセージ
#     """
#     print("🔥 この関数が実行された！（キャッシュなし時）")
#     return {"message": "キャッシュされるはず！"}
