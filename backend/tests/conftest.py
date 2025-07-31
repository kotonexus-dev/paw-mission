import pytest
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from unittest.mock import AsyncMock, MagicMock

@pytest.fixture(scope="session", autouse=True)
def setup_cache():
    """テスト用にFastAPICacheを初期化"""
    # モックRedisバックエンドを作成
    mock_backend = MagicMock()
    mock_backend.get = AsyncMock(return_value=None)
    mock_backend.set = AsyncMock()
    mock_backend.clear = AsyncMock()
    
    # FastAPICacheを初期化
    FastAPICache.init(backend=mock_backend, prefix="test-cache")
    
    yield
    
    # テスト終了後にクリーンアップ
    FastAPICache._coder = None
    FastAPICache._backend = None
    FastAPICache._prefix = ""