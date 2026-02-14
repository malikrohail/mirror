"""Natural language test planner endpoint — converts descriptions into study plans."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.test_planner import TestPlanner
from app.dependencies import get_db
from app.llm.client import LLMClient
from app.llm.schemas import PlannedPersona, PlannedTask, StudyPlan
from app.services.persona_service import PersonaService

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class StudyPlanRequest(BaseModel):
    """Request body for the study planner endpoint."""

    description: str = Field(
        ...,
        min_length=1,
        description="Plain-English description of what to test",
    )
    url: str = Field(
        ...,
        min_length=1,
        description="Target website URL to test",
    )


class PlannedTaskOut(BaseModel):
    """A task in the generated study plan."""

    description: str
    success_criteria: str

    model_config = {"from_attributes": True}


class PlannedPersonaOut(BaseModel):
    """A persona recommendation in the generated study plan."""

    name: str
    description: str
    template_id: str | None = None

    model_config = {"from_attributes": True}


class StudyPlanResponse(BaseModel):
    """Response from the study planner endpoint."""

    tasks: list[PlannedTaskOut]
    personas: list[PlannedPersonaOut]
    device_recommendation: str
    estimated_duration_minutes: int
    rationale: str


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

    # Match personas to templates by name
    svc = PersonaService(db)
    templates = await svc.list_templates()
    template_map = {t.name.lower(): str(t.id) for t in templates}

    personas = []
    for p in plan.personas:
        matched_id = template_map.get(p.name.lower())
        if not matched_id:
            for tname, tid in template_map.items():
                if tname in p.name.lower() or p.name.lower() in tname:
                    matched_id = tid
                    break
        personas.append(PlannedPersonaOut(
            name=p.name,
            description=p.description,
            template_id=matched_id,
        ))

    return StudyPlanResponse(
        tasks=[
            PlannedTaskOut(
                description=t.description,
                success_criteria=t.success_criteria,
            )
            for t in plan.tasks
        ],
        personas=personas,
        device_recommendation=plan.device_recommendation,
        estimated_duration_minutes=plan.estimated_duration_minutes,
        rationale=plan.rationale,
    )
