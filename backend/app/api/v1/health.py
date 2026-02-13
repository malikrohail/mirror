import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_redis

router = APIRouter()


@router.get("")
async def health_check(
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Health check — validates DB and Redis connectivity."""
    checks = {"status": "ok", "db": "unknown", "redis": "unknown"}

    # Check PostgreSQL
    try:
        await db.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception as e:
        checks["db"] = f"error: {e}"
        checks["status"] = "degraded"

    # Check Redis
    try:
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"
        checks["status"] = "degraded"

    return checks


@router.get("/browser")
async def browser_health(request: Request):
    """Browser pool health endpoint (Iteration 5).

    Reports pool status: mode, active sessions, uptime, crash count,
    failover state, memory usage.
    """
    pool = getattr(request.app.state, "browser_pool", None)

    if pool is None:
        return {
            "status": "not_initialized",
            "message": "No active browser pool — studies have not been run yet",
        }

    try:
        stats = pool.stats
        return {
            "status": "ok" if not pool.is_failover_active else "failover_active",
            "pool": stats.to_dict(),
            "failover_active": pool.is_failover_active,
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
        }
