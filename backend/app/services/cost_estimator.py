"""Study cost estimation — predict API costs before running a study.

Based on: personas x tasks x avg_steps x cost_per_model_per_1k_tokens.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.study import Study

logger = logging.getLogger(__name__)

# Anthropic pricing (per 1M tokens, approximate)
PRICING = {
    "claude-opus-4-6": {"input": 15.0, "output": 75.0},
    "claude-sonnet-4-5-20250929": {"input": 3.0, "output": 15.0},
}

# Average tokens per pipeline stage (estimated)
STAGE_ESTIMATES = {
    "persona_generation": {
        "model": "claude-opus-4-6",
        "input_tokens": 1500,
        "output_tokens": 800,
        "calls_per_persona": 1,
    },
    "navigation_step": {
        "model": "claude-sonnet-4-5-20250929",
        "input_tokens": 4000,  # Includes screenshot
        "output_tokens": 500,
        "calls_per_step": 1,
    },
    "screenshot_analysis": {
        "model": "claude-opus-4-6",
        "input_tokens": 3000,
        "output_tokens": 1000,
        "calls_per_unique_page": 1,
    },
    "synthesis": {
        "model": "claude-opus-4-6",
        "input_tokens": 6000,
        "output_tokens": 3000,
        "calls_per_study": 1,
    },
    "report": {
        "model": "claude-opus-4-6",
        "input_tokens": 4000,
        "output_tokens": 4000,
        "calls_per_study": 1,
    },
}

AVG_STEPS_PER_SESSION = 15
AVG_UNIQUE_PAGES_PER_SESSION = 5
AVG_STEP_DURATION_SECONDS = 4


class CostBreakdown(BaseModel):
    persona_generation: float
    navigation_steps: float
    screenshot_analysis: float
    synthesis: float
    report: float


class CostEstimate(BaseModel):
    estimated_cost_usd: float
    breakdown: CostBreakdown
    estimated_duration_seconds: int
    estimated_api_calls: int
    num_personas: int
    num_tasks: int
    estimated_sessions: int
    estimated_total_steps: int


class CostEstimator:
    """Estimates the cost of running a study."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def estimate(self, study_id: uuid.UUID) -> CostEstimate:
        """Estimate cost for a study based on its configuration."""
        result = await self.db.execute(
            select(Study)
            .where(Study.id == study_id)
            .options(
                selectinload(Study.tasks),
                selectinload(Study.personas),
            )
        )
        study = result.scalar_one_or_none()
        if not study:
            return CostEstimate(
                estimated_cost_usd=0,
                breakdown=CostBreakdown(
                    persona_generation=0,
                    navigation_steps=0,
                    screenshot_analysis=0,
                    synthesis=0,
                    report=0,
                ),
                estimated_duration_seconds=0,
                estimated_api_calls=0,
                num_personas=0,
                num_tasks=0,
                estimated_sessions=0,
                estimated_total_steps=0,
            )

        num_personas = len(study.personas)
        num_tasks = len(study.tasks)
        num_sessions = num_personas * num_tasks
        total_steps = num_sessions * AVG_STEPS_PER_SESSION
        unique_pages = num_sessions * AVG_UNIQUE_PAGES_PER_SESSION

        # Calculate costs per stage
        persona_cost = self._calc_stage_cost(
            "persona_generation", num_personas
        )
        nav_cost = self._calc_stage_cost(
            "navigation_step", total_steps
        )
        analysis_cost = self._calc_stage_cost(
            "screenshot_analysis", unique_pages
        )
        synthesis_cost = self._calc_stage_cost("synthesis", 1)
        report_cost = self._calc_stage_cost("report", 1)

        total_cost = persona_cost + nav_cost + analysis_cost + synthesis_cost + report_cost

        # Estimate API calls
        api_calls = num_personas + total_steps + unique_pages + 1 + 1

        # Estimate duration
        duration = (
            num_personas * 3  # persona generation
            + total_steps * AVG_STEP_DURATION_SECONDS  # navigation
            + unique_pages * 2  # analysis
            + 10  # synthesis
            + 5  # report
        )

        return CostEstimate(
            estimated_cost_usd=round(total_cost, 4),
            breakdown=CostBreakdown(
                persona_generation=round(persona_cost, 4),
                navigation_steps=round(nav_cost, 4),
                screenshot_analysis=round(analysis_cost, 4),
                synthesis=round(synthesis_cost, 4),
                report=round(report_cost, 4),
            ),
            estimated_duration_seconds=duration,
            estimated_api_calls=api_calls,
            num_personas=num_personas,
            num_tasks=num_tasks,
            estimated_sessions=num_sessions,
            estimated_total_steps=total_steps,
        )

    @staticmethod
    def _calc_stage_cost(stage: str, multiplier: int) -> float:
        """Calculate cost for a pipeline stage."""
        est = STAGE_ESTIMATES.get(stage)
        if not est:
            return 0

        model = est["model"]
        pricing = PRICING.get(model, PRICING["claude-sonnet-4-5-20250929"])

        input_cost = (est["input_tokens"] / 1_000_000) * pricing["input"]
        output_cost = (est["output_tokens"] / 1_000_000) * pricing["output"]
        per_call_cost = input_cost + output_cost

        return per_call_cost * multiplier
