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


class ActualCostBreakdown(BaseModel):
    """Breakdown of actual costs from a completed study (Iteration 4)."""

    llm_input_tokens: int = 0
    llm_output_tokens: int = 0
    llm_total_tokens: int = 0
    llm_api_calls: int = 0
    llm_cost_usd: float = 0.0
    browser_mode: str = "unknown"
    browser_sessions: int = 0
    browser_time_seconds: float = 0.0
    browser_cost_usd: float = 0.0  # Only for Browserbase
    storage_screenshots: int = 0
    storage_size_mb: float = 0.0
    total_cost_usd: float = 0.0
    savings_vs_cloud_usd: float = 0.0


class CostTracker:
    """Tracks actual costs incurred during a study run (Iteration 4).

    Aggregates LLM token usage, browser time, and storage to compute
    real costs and savings from using local vs cloud mode.
    """

    # Browserbase pricing: $0.10 per minute of browser time (approximate)
    BB_COST_PER_MINUTE = 0.10

    def __init__(self) -> None:
        self._llm_input_tokens = 0
        self._llm_output_tokens = 0
        self._llm_api_calls = 0
        self._browser_mode = "unknown"
        self._browser_sessions = 0
        self._browser_start_times: dict[str, float] = {}
        self._browser_total_seconds = 0.0
        self._screenshot_count = 0
        self._storage_bytes = 0

    def record_llm_usage(self, input_tokens: int, output_tokens: int) -> None:
        """Record token usage from an LLM call."""
        self._llm_input_tokens += input_tokens
        self._llm_output_tokens += output_tokens
        self._llm_api_calls += 1

    def set_browser_mode(self, mode: str) -> None:
        """Set the browser mode used for this study."""
        self._browser_mode = mode

    def start_browser_session(self, session_id: str) -> None:
        """Record start of a browser session."""
        import time

        self._browser_sessions += 1
        self._browser_start_times[session_id] = time.monotonic()

    def end_browser_session(self, session_id: str) -> None:
        """Record end of a browser session."""
        import time

        start = self._browser_start_times.pop(session_id, None)
        if start:
            self._browser_total_seconds += time.monotonic() - start

    def record_screenshot(self, size_bytes: int) -> None:
        """Record a screenshot taken."""
        self._screenshot_count += 1
        self._storage_bytes += size_bytes

    def get_breakdown(self) -> ActualCostBreakdown:
        """Calculate the final cost breakdown."""
        # LLM costs
        llm_cost = 0.0
        # Use Opus pricing for a conservative estimate
        # (in practice, different stages use different models)
        opus_pricing = PRICING.get("claude-opus-4-6", {"input": 15.0, "output": 75.0})
        sonnet_pricing = PRICING.get("claude-sonnet-4-5-20250929", {"input": 3.0, "output": 15.0})

        # Rough split: ~70% of calls are navigation (Sonnet), ~30% are analysis/synthesis (Opus)
        nav_ratio = 0.7
        opus_ratio = 0.3

        input_cost = (
            (self._llm_input_tokens * nav_ratio / 1_000_000) * sonnet_pricing["input"]
            + (self._llm_input_tokens * opus_ratio / 1_000_000) * opus_pricing["input"]
        )
        output_cost = (
            (self._llm_output_tokens * nav_ratio / 1_000_000) * sonnet_pricing["output"]
            + (self._llm_output_tokens * opus_ratio / 1_000_000) * opus_pricing["output"]
        )
        llm_cost = input_cost + output_cost

        # Browser costs (only Browserbase has a cost)
        browser_cost = 0.0
        if self._browser_mode == "cloud":
            browser_minutes = self._browser_total_seconds / 60.0
            browser_cost = browser_minutes * self.BB_COST_PER_MINUTE

        # Savings calculation
        cloud_browser_cost = (self._browser_total_seconds / 60.0) * self.BB_COST_PER_MINUTE
        savings = cloud_browser_cost if self._browser_mode == "local" else 0.0

        total_cost = llm_cost + browser_cost

        return ActualCostBreakdown(
            llm_input_tokens=self._llm_input_tokens,
            llm_output_tokens=self._llm_output_tokens,
            llm_total_tokens=self._llm_input_tokens + self._llm_output_tokens,
            llm_api_calls=self._llm_api_calls,
            llm_cost_usd=round(llm_cost, 4),
            browser_mode=self._browser_mode,
            browser_sessions=self._browser_sessions,
            browser_time_seconds=round(self._browser_total_seconds, 1),
            browser_cost_usd=round(browser_cost, 4),
            storage_screenshots=self._screenshot_count,
            storage_size_mb=round(self._storage_bytes / (1024 * 1024), 2),
            total_cost_usd=round(total_cost, 4),
            savings_vs_cloud_usd=round(savings, 4),
        )
