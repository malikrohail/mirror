import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown."""
    # Startup
    app.state.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

    # Auto-seed persona templates if DB is available
    try:
        from app.db.engine import async_session_factory
        from app.services.persona_service import PersonaService

        async with async_session_factory() as db:
            svc = PersonaService(db)
            count = await svc.seed_templates()
            await db.commit()
            if count > 0:
                logger.info("Seeded %d persona templates into database", count)
            else:
                logger.debug("Persona templates already seeded")
    except Exception as e:
        logger.warning("Could not seed persona templates (DB may not be ready): %s", e)

    yield
    # Shutdown
    await app.state.redis.close()


def create_app() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title="Mirror API",
        description="AI-powered usability testing platform",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount routers
    from app.api.router import api_router
    from app.api.ws.progress import router as ws_router

    app.include_router(api_router, prefix="/api/v1")
    app.include_router(ws_router)

    return app


app = create_app()
