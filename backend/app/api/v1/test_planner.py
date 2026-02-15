"""Natural language test planner endpoint — converts descriptions into study plans."""

from __future__ import annotations

import logging
import re

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.test_planner import TestPlanner
from app.dependencies import get_db
from app.llm.client import LLMClient
from app.llm.schemas import StudyPlan
from app.services.persona_service import PersonaService

router = APIRouter()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Request / Response schemas  (must match the frontend StudyPlanResponse)
# ---------------------------------------------------------------------------

class StudyPlanRequest(BaseModel):
    description: str = Field(..., min_length=1)
    url: str = Field(..., min_length=1)


class PlannedTaskOut(BaseModel):
    description: str
    order_index: int = 0


class PlannedPersonaOut(BaseModel):
    template_id: str | None = None
    name: str
    emoji: str = "👤"
    reason: str = ""


class StudyPlanResponse(BaseModel):
    url: str
    tasks: list[PlannedTaskOut]
    personas: list[PlannedPersonaOut]
    summary: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_STOP_WORDS = frozenset(
    "a an the and or of for to in on with is are was were be been "
    "that this it its by from at as into user users".split()
)


def _keywords(text: str) -> set[str]:
    """Extract meaningful lowercase keywords from text."""
    words = set(re.findall(r"[a-z]+", text.lower()))
    return words - _STOP_WORDS


def _match_persona_to_template(
    persona_name: str,
    persona_desc: str,
    templates: list,
) -> tuple[str | None, str, str]:
    """Match an LLM-generated persona to the best template.

    Returns (template_id, emoji, template_name).
    """
    persona_kw = _keywords(persona_name) | _keywords(persona_desc)
    if not persona_kw:
        return None, "👤", persona_name

    best_id: str | None = None
    best_emoji: str = "👤"
    best_name: str = persona_name
    best_score: int = 0

    for t in templates:
        template_kw = _keywords(t.name) | _keywords(t.short_description)
        overlap = len(persona_kw & template_kw)
        if overlap > best_score:
            best_score = overlap
            best_id = str(t.id)
            best_emoji = t.emoji or "👤"
            best_name = t.name

    # Require at least 2 keyword overlaps for a match
    if best_score < 2:
        return None, "👤", persona_name

    return best_id, best_emoji, best_name


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/studies/plan", response_model=StudyPlanResponse)
async def plan_study(body: StudyPlanRequest, db: AsyncSession = Depends(get_db)):
    """Generate a study plan from a natural language description."""
    llm = LLMClient()
    planner = TestPlanner(llm)

    plan: StudyPlan = await planner.plan_study(
        description=body.description,
        url=body.url,
    )

    # Load persona templates for matching
    svc = PersonaService(db)
    templates = await svc.list_templates()

    personas: list[PlannedPersonaOut] = []
    for p in plan.personas:
        tid, emoji, matched_name = _match_persona_to_template(
            p.name, p.description, templates,
        )
        personas.append(PlannedPersonaOut(
            template_id=tid,
            name=matched_name if tid else p.name,
            emoji=emoji,
            reason=p.description,
        ))

    # If no personas matched, fall back to first 3 templates
    if not any(p.template_id for p in personas) and templates:
        logger.warning("No personas matched templates — falling back to defaults")
        personas = [
            PlannedPersonaOut(
                template_id=str(t.id),
                name=t.name,
                emoji=t.emoji or "👤",
                reason=t.short_description,
            )
            for t in templates[:3]
        ]

    return StudyPlanResponse(
        url=body.url,
        tasks=[
            PlannedTaskOut(description=t.description, order_index=i)
            for i, t in enumerate(plan.tasks)
        ],
        personas=personas,
        summary=plan.rationale,
    )
