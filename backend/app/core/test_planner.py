"""Natural language test planner — converts descriptions into study configurations."""

from __future__ import annotations

import logging

from app.llm.client import LLMClient
from app.llm.schemas import StudyPlan

logger = logging.getLogger(__name__)


class TestPlanner:
    """Converts natural language study descriptions into structured study plans.

    Uses the LLM client's plan_study method to interpret a user's plain-English
    description and generate tasks, persona recommendations, device settings,
    and estimated durations.
    """

    def __init__(self, llm_client: LLMClient) -> None:
        self._llm = llm_client

    async def plan_study(
        self,
        description: str,
        url: str,
    ) -> StudyPlan:
        """Generate a study plan from a natural language description.

        Args:
            description: Plain-English description of what to test
                (e.g., "Test the checkout flow for mobile users").
            url: The target website URL to test.

        Returns:
            StudyPlan with tasks, persona recommendations, device settings,
            estimated duration, and rationale.

        Raises:
            RuntimeError: If the LLM call fails after retries.
            ValueError: If the description or URL is empty.
        """
        if not description or not description.strip():
            raise ValueError("Study description cannot be empty")
        if not url or not url.strip():
            raise ValueError("Study URL cannot be empty")

        logger.info(
            "Planning study: url=%s, description='%s'",
            url,
            description[:100],
        )

        try:
            plan = await self._llm.plan_study(
                description=description,
                url=url,
            )
            logger.info(
                "Study plan generated: %d tasks, %d personas, device=%s, est=%d min",
                len(plan.tasks),
                len(plan.personas),
                plan.device_recommendation,
                plan.estimated_duration_minutes,
            )
            return plan
        except Exception as e:
            logger.error("Study planning failed: %s", e)
            raise
