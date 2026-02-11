from collections.abc import AsyncGenerator

import redis.asyncio as aioredis
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.engine import get_session
from app.storage.file_storage import FileStorage, create_storage

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


_storage_instance: FileStorage | None = None


async def get_storage() -> FileStorage:
    """FastAPI dependency for file storage. Auto-selects R2 or local."""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = create_storage()
    return _storage_instance


# Typed aliases for dependency injection
DBSession = Depends(get_db)
Redis = Depends(get_redis)
Storage = Depends(get_storage)
