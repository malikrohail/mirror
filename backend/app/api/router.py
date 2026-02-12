from fastapi import APIRouter

from app.api.v1 import compare, health, journeys, personas, proxy, reports, screenshots, scroll_depth, sessions, studies

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(studies.router, prefix="/studies", tags=["studies"])
api_router.include_router(sessions.router, tags=["sessions"])
api_router.include_router(personas.router, prefix="/personas", tags=["personas"])
api_router.include_router(reports.router, tags=["reports"])
api_router.include_router(screenshots.router, prefix="/screenshots", tags=["screenshots"])
api_router.include_router(journeys.router, tags=["journeys"])
api_router.include_router(scroll_depth.router, tags=["scroll-depth"])
api_router.include_router(compare.router, tags=["compare"])
api_router.include_router(proxy.router, prefix="/proxy", tags=["proxy"])
