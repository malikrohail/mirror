from fastapi import APIRouter

from app.api.v1 import (
    accessibility,
    compare,
    estimate,
    favorites,
    fixes,
    github_export,
    health,
    history,
    journeys,
    narration,
    personas,
    preferences,
    proxy,
    reports,
    schedules,
    screenshots,
    scroll_depth,
    sessions,
    showcase,
    studies,
    teams,
    test_planner,
    videos,
)

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
api_router.include_router(schedules.router, prefix="/schedules", tags=["schedules"])
api_router.include_router(schedules.webhook_router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(history.router, tags=["history"])
api_router.include_router(videos.router, tags=["videos"])
api_router.include_router(narration.router, tags=["narration"])
api_router.include_router(fixes.router, tags=["fixes"])
api_router.include_router(accessibility.router, tags=["accessibility"])
api_router.include_router(test_planner.router, tags=["test-planner"])
api_router.include_router(github_export.router, tags=["github-export"])
api_router.include_router(estimate.router, prefix="/estimate", tags=["estimate"])
api_router.include_router(teams.router, prefix="/teams", tags=["teams"])
api_router.include_router(preferences.router, prefix="/preferences", tags=["preferences"])
api_router.include_router(favorites.router, prefix="/favorites", tags=["favorites"])
api_router.include_router(showcase.router, tags=["showcase"])
