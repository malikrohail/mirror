"""arq worker settings."""

from arq.connections import RedisSettings

from app.config import settings
from app.workers.tasks import run_study_task


async def startup(ctx):
    """Worker startup hook — initialize resources."""
    import redis.asyncio as aioredis

    from app.db.engine import async_session_factory

    ctx["db_factory"] = async_session_factory
    ctx["redis"] = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def shutdown(ctx):
    """Worker shutdown hook — cleanup resources."""
    redis_conn = ctx.get("redis")
    if redis_conn:
        await redis_conn.close()


def _parse_redis_url(url: str) -> RedisSettings:
    """Parse a Redis URL into arq RedisSettings."""
    from urllib.parse import urlparse

    parsed = urlparse(url)
    return RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        database=int(parsed.path.lstrip("/") or "0"),
        password=parsed.password,
    )


class WorkerSettings:
    """arq worker configuration."""

    functions = [run_study_task]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = _parse_redis_url(settings.REDIS_URL)
    max_jobs = settings.MAX_CONCURRENT_SESSIONS
    job_timeout = settings.STUDY_TIMEOUT_SECONDS
