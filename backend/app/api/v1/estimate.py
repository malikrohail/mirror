"""Lightweight cost estimate endpoint.

Returns estimated cost and duration for a study WITHOUT requiring
a saved study — just persona count, task count, and model choices.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


# Model pricing per session (average ~15 steps/session + 20% analysis overhead)
MODEL_SESSION_PRICING = {
    "opus-4.6": 0.40,
    "sonnet-4.5": 0.08,
    "haiku-4.5": 0.02,
}

DEFAULT_MODEL = "sonnet-4.5"
AVG_STEPS_PER_SESSION = 15
ANALYSIS_OVERHEAD_FACTOR = 1.20
AVG_STEP_DURATION_SECONDS = 4


class ModelChoice(BaseModel):
    """Model selection for different pipeline stages."""

    navigation: str = Field(DEFAULT_MODEL, description="Model for navigation decisions")
    analysis: str = Field("opus-4.6", description="Model for screenshot analysis")


class EstimateRequest(BaseModel):
    """Request body for cost estimation."""

    persona_count: int = Field(..., ge=1, le=10, description="Number of personas")
    task_count: int = Field(..., ge=1, le=10, description="Number of tasks")
    model: str = Field(
        DEFAULT_MODEL,
        description="Primary model choice: opus-4.6, sonnet-4.5, or haiku-4.5",
    )


class EstimateBreakdown(BaseModel):
    """Cost breakdown by category."""

    navigation_cost: float
    analysis_cost: float
    synthesis_cost: float


class EstimateResponse(BaseModel):
    """Cost and duration estimate response."""

    estimated_cost_usd: float
    estimated_duration_seconds: int
    estimated_sessions: int
    estimated_total_steps: int
    breakdown: EstimateBreakdown
    model: str
    persona_count: int
    task_count: int


@router.post("", response_model=EstimateResponse)
async def estimate_cost(data: EstimateRequest) -> EstimateResponse:
    """Estimate cost and duration for a study configuration.

    Accepts persona count, task count, and model choice. Returns
    estimated cost in USD and duration in seconds without requiring
    a saved study.
    """
    model = data.model if data.model in MODEL_SESSION_PRICING else DEFAULT_MODEL
    cost_per_session = MODEL_SESSION_PRICING[model]

    num_sessions = data.persona_count * data.task_count
    total_steps = num_sessions * AVG_STEPS_PER_SESSION

    # Navigation cost: per-session cost based on model
    navigation_cost = num_sessions * cost_per_session

    # Analysis cost: always uses opus for quality, scaled by session count
    analysis_per_session = MODEL_SESSION_PRICING["opus-4.6"] * 0.3  # ~30% of a full session
    analysis_cost = num_sessions * analysis_per_session

    # Synthesis + report: fixed overhead per study
    synthesis_cost = MODEL_SESSION_PRICING["opus-4.6"] * 0.5  # half a session equivalent

    total_cost = (navigation_cost + analysis_cost + synthesis_cost) * ANALYSIS_OVERHEAD_FACTOR

    # Duration estimate
    duration = (
        data.persona_count * 3  # persona generation
        + total_steps * AVG_STEP_DURATION_SECONDS  # navigation
        + num_sessions * 5  # analysis per session
        + 15  # synthesis + report
    )

    return EstimateResponse(
        estimated_cost_usd=round(total_cost, 4),
        estimated_duration_seconds=duration,
        estimated_sessions=num_sessions,
        estimated_total_steps=total_steps,
        breakdown=EstimateBreakdown(
            navigation_cost=round(navigation_cost * ANALYSIS_OVERHEAD_FACTOR, 4),
            analysis_cost=round(analysis_cost * ANALYSIS_OVERHEAD_FACTOR, 4),
            synthesis_cost=round(synthesis_cost * ANALYSIS_OVERHEAD_FACTOR, 4),
        ),
        model=model,
        persona_count=data.persona_count,
        task_count=data.task_count,
    )
