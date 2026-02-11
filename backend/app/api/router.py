from fastapi import APIRouter

from app.api.v1 import health, personas, reports, screenshots, sessions, studies

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(studies.router, prefix="/studies", tags=["studies"])
api_router.include_router(sessions.router, tags=["sessions"])
api_router.include_router(personas.router, prefix="/personas", tags=["personas"])
api_router.include_router(reports.router, tags=["reports"])
api_router.include_router(screenshots.router, prefix="/screenshots", tags=["screenshots"])
