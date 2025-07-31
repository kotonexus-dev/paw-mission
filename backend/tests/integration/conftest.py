import pytest
import asyncio
import uuid
from datetime import datetime
from app.main import app
from app.dependencies import verify_firebase_token
from app.db import prisma_client
from fastapi_cache import FastAPICache
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture(scope="session", autouse=True)
async def setup_test_db():
    """セッション単位でのデータベース初期化"""
    # FastAPICacheを初期化
    mock_backend = MagicMock()
    mock_backend.get = AsyncMock(return_value=None)
    mock_backend.set = AsyncMock()
    mock_backend.clear = AsyncMock()
    FastAPICache.init(backend=mock_backend, prefix="test-cache")
    
    # グローバルなprisma_clientが常に接続されていることを保証します
    if not prisma_client.is_connected():
        await prisma_client.connect()

    yield

    # セッション終了時に切断とクリーンアップ
    try:
        if prisma_client.is_connected():
            await prisma_client.disconnect()
    except Exception as e:
        print(f"セッションクリーンアップ時のエラー: {e}")
    
    # FastAPICacheクリーンアップ
    FastAPICache._coder = None
    FastAPICache._backend = None
    FastAPICache._prefix = ""


@pytest.fixture(scope="function")
async def test_db():
    """各テスト関数ごとにクリーンなデータベース状態を用意します"""
    # グローバルなprisma_clientが常に接続されていることを保証します
    if not prisma_client.is_connected():
        await prisma_client.connect()

    # データベースの初期化（全データ削除）
    try:
        await prisma_client.care_logs.delete_many()
        await prisma_client.reflection_notes.delete_many()
        await prisma_client.care_settings.delete_many()
        await prisma_client.payment.delete_many()
        await prisma_client.webhook_events.delete_many()
        await prisma_client.users.delete_many()
    except Exception as e:
        print(f"初期化時のエラー: {e}")

    yield prisma_client

    # テスト後にデータを削除（即時クリーンアップ。エラー時は無視）
    try:
        await prisma_client.care_logs.delete_many()
        await prisma_client.reflection_notes.delete_many()
        await prisma_client.care_settings.delete_many()
        await prisma_client.payment.delete_many()
        await prisma_client.webhook_events.delete_many()
        await prisma_client.users.delete_many()
    except Exception:
        pass  # クリーンアップエラーは無視


# Firebase認証トークンのオーバーライド - テスト毎に動的に設定可能
def override_verify_firebase_token():
    # 動的なUIDが必要な場合は別の実装に切り替えてください
    return "test_uid_care_001"


app.dependency_overrides[verify_firebase_token] = override_verify_firebase_token
