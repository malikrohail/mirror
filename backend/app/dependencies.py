from collections.abc import AsyncGenerator

import redis.asyncio as aioredis
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.engine import get_session
from app.storage.file_storage import FileStorage

_redis_pool: aioredis.Redis | None = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database sessions."""
    async for session in get_session():
        yield session


async def get_redis() -> aioredis.Redis:
    """FastAPI dependency for Redis connection."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_pool


async def get_storage() -> FileStorage:
    """FastAPI dependency for file storage."""
    return FileStorage(base_path=settings.STORAGE_PATH)


# Typed aliases for dependency injection
DBSession = Depends(get_db)
Redis = Depends(get_redis)
Storage = Depends(get_storage)
