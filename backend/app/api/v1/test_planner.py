"""Natural language test planner endpoint — converts descriptions into study plans."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.test_planner import TestPlanner
from app.llm.client import LLMClient
from app.llm.schemas import PlannedPersona, PlannedTask, StudyPlan

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
async def plan_study(body: StudyPlanRequest):
    """Generate a study plan from a natural language description.

    Accepts a plain-English description of what to test and a target URL,
    then uses the LLM to generate tasks, persona recommendations, device
    settings, and an estimated duration.
    """
    llm = LLMClient()
    planner = TestPlanner(llm)

    plan: StudyPlan = await planner.plan_study(
        description=body.description,
        url=body.url,
    )

    return StudyPlanResponse(
        tasks=[
            PlannedTaskOut(
                description=t.description,
                success_criteria=t.success_criteria,
            )
            for t in plan.tasks
        ],
        personas=[
            PlannedPersonaOut(
                name=p.name,
                description=p.description,
                template_id=p.template_id,
            )
            for p in plan.personas
        ],
        device_recommendation=plan.device_recommendation,
        estimated_duration_minutes=plan.estimated_duration_minutes,
        rationale=plan.rationale,
    )
