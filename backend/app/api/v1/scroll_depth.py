"""Scroll depth API — aggregate scroll behavior across personas."""

import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db
from app.models.session import Session
from app.models.step import Step

router = APIRouter()


class PersonaScrollDepth(BaseModel):
    name: str
    max_depth_px: int
    max_depth_pct: float


class ScrollDepthResponse(BaseModel):
    page_url: str
    page_height: int
    personas: list[PersonaScrollDepth]


@router.get("/studies/{study_id}/scroll-depth", response_model=ScrollDepthResponse)
async def get_scroll_depth(
    study_id: uuid.UUID,
    page_url: str = Query(..., description="URL of the page to analyze"),
    db: AsyncSession = Depends(get_db),
):
    """Get scroll depth data per persona for a specific page."""
    result = await db.execute(
        select(Step)
        .join(Session)
        .where(
            Session.study_id == study_id,
            Step.page_url == page_url,
            Step.max_scroll_y.is_not(None),
        )
        .options(selectinload(Step.session).selectinload(Session.persona))
    )
    steps = list(result.scalars().all())

    if not steps:
        return ScrollDepthResponse(page_url=page_url, page_height=0, personas=[])

    # Aggregate max scroll depth per persona
    persona_depths: dict[str, dict] = {}
    max_page_height = 0

    for step in steps:
        persona = step.session.persona
        profile = persona.profile if persona else {}
        name = profile.get("name", str(persona.id) if persona else "Unknown")

        max_scroll = step.max_scroll_y or 0
        viewport_h = step.viewport_height or 1080
        page_height = max_scroll + viewport_h
        max_page_height = max(max_page_height, page_height)

        current_depth = step.scroll_y or 0
        if name not in persona_depths or current_depth > persona_depths[name]["depth"]:
            persona_depths[name] = {
                "depth": current_depth + viewport_h,
                "page_height": page_height,
            }

    personas = []
    for name, data in persona_depths.items():
        depth_px = data["depth"]
        page_h = data["page_height"] or 1
        depth_pct = min(100.0, (depth_px / page_h) * 100)
        personas.append(PersonaScrollDepth(
            name=name,
            max_depth_px=depth_px,
            max_depth_pct=round(depth_pct, 1),
        ))

    return ScrollDepthResponse(
        page_url=page_url,
        page_height=max_page_height,
        personas=personas,
    )
