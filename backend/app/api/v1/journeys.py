"""Emotional journey API — visualize each persona's emotional arc through a study."""

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db
from app.models.persona import Persona
from app.models.session import Session
from app.models.step import Step

router = APIRouter()


class JourneyStep(BaseModel):
    step: int
    emotion: str
    page: str
    think_aloud: str

    model_config = {"from_attributes": True}


class PersonaJourney(BaseModel):
    name: str
    emoji: str
    journey: list[JourneyStep]
    outcome: str
    peak_frustration_step: int | None = None
    peak_frustration_page: str | None = None


class EmotionalJourneysResponse(BaseModel):
    study_id: str
    personas: list[PersonaJourney]


@router.get("/studies/{study_id}/emotional-journeys", response_model=EmotionalJourneysResponse)
async def get_emotional_journeys(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get the emotional journey for each persona in a study.

    Returns the step-by-step emotional arc, outcome, and peak
    frustration point for each persona.
    """
    # Get all sessions with steps and persona info
    result = await db.execute(
        select(Session)
        .where(Session.study_id == study_id)
        .options(
            selectinload(Session.steps),
            selectinload(Session.persona),
        )
        .order_by(Session.created_at)
    )
    sessions = list(result.scalars().all())

    personas: list[PersonaJourney] = []

    for session in sessions:
        persona = session.persona
        profile = persona.profile if persona else {}
        name = profile.get("name", f"Persona {persona.id}" if persona else "Unknown")
        emoji = profile.get("emoji", "👤")

        # Build journey from steps
        steps = sorted(session.steps, key=lambda s: s.step_number)
        journey: list[JourneyStep] = []
        peak_frustration_step: int | None = None
        peak_frustration_page: str | None = None

        # Track frustration intensity
        frustration_emotions = {"frustrated", "confused", "anxious"}
        max_frustration_streak = 0
        current_streak = 0

        for step in steps:
            emotion = step.emotional_state or "neutral"
            journey.append(JourneyStep(
                step=step.step_number,
                emotion=emotion,
                page=step.page_url or "",
                think_aloud=step.think_aloud or "",
            ))

            # Track peak frustration
            if emotion in frustration_emotions:
                current_streak += 1
                if current_streak > max_frustration_streak:
                    max_frustration_streak = current_streak
                    peak_frustration_step = step.step_number
                    peak_frustration_page = step.page_url
            else:
                current_streak = 0

        # Determine outcome
        outcome = session.status.value if hasattr(session.status, "value") else str(session.status)

        personas.append(PersonaJourney(
            name=name,
            emoji=emoji,
            journey=journey,
            outcome=outcome,
            peak_frustration_step=peak_frustration_step,
            peak_frustration_page=peak_frustration_page,
        ))

    return EmotionalJourneysResponse(
        study_id=str(study_id),
        personas=personas,
    )
