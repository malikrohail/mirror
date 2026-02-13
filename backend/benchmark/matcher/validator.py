"""False positive validator for the benchmark matcher pipeline.

Validates unmatched Mirror-detected issues to determine whether they are
genuine UX problems missed by the ground truth corpus, or false positives
produced by AI misinterpretation.
"""

from __future__ import annotations

import json
import re

from benchmark.matcher.judge import LLMJudge, MockLLMJudge
from benchmark.matcher.prompts import FP_VALIDATOR_SYSTEM, FP_VALIDATOR_USER
from benchmark.matcher.schema import ValidationResult


class FalsePositiveValidator:
    """Validates unmatched Mirror issues using an LLM judge.

    For each unmatched Mirror issue, asks the judge whether the issue
    is a real usability problem, borderline, or a false positive.

    Args:
        judge: An LLM judge implementation (defaults to MockLLMJudge).
    """

    def __init__(self, judge: LLMJudge | None = None) -> None:
        self.judge = judge or MockLLMJudge()

    async def validate_issues(
        self, unmatched_mirror: list[dict], site_url: str
    ) -> list[ValidationResult]:
        """Validate all unmatched Mirror issues for false positives.

        Args:
            unmatched_mirror: List of Mirror issue dicts that had no
                ground truth match.
            site_url: The site URL for context.

        Returns:
            List of ValidationResult objects, one per issue.
        """
        results: list[ValidationResult] = []
        for issue in unmatched_mirror:
            result = await self._validate_single(issue, site_url)
            results.append(result)
        return results

    async def _validate_single(
        self, issue: dict, site_url: str
    ) -> ValidationResult:
        """Validate a single unmatched Mirror issue.

        Args:
            issue: Mirror issue dict with keys like id, page_url, element,
                description, severity, heuristic, recommendation, persona_role,
                emotional_state, task_progress, session_completed,
                corroboration_count (or personas_also_found).
            site_url: The site URL for context.

        Returns:
            A ValidationResult with the verdict, reasoning, and confidence.
        """
        user_prompt = FP_VALIDATOR_USER.format(
            site_url=site_url,
            page_url=issue.get("page_url", "/"),
            element=issue.get("element", "unknown"),
            description=issue.get("description", ""),
            severity=issue.get("severity", "minor"),
            heuristic=issue.get("heuristic", "N/A"),
            recommendation=issue.get("recommendation", "N/A"),
            persona_role=issue.get("persona_role", "unknown"),
            emotional_state=issue.get("emotional_state", "neutral"),
            task_progress=issue.get("task_progress", 0),
            session_completed=issue.get("session_completed", False),
            corroboration_count=issue.get(
                "corroboration_count",
                issue.get("personas_also_found", 1),
            ),
        )

        response = await self.judge.judge_pair(FP_VALIDATOR_SYSTEM, user_prompt)
        return self._parse_validation_response(issue.get("id", "unknown"), response)

    @staticmethod
    def _parse_validation_response(
        issue_id: str, response: str
    ) -> ValidationResult:
        """Parse a JSON response from the validation judge.

        Args:
            issue_id: The Mirror issue identifier.
            response: Raw JSON string from the judge.

        Returns:
            A ValidationResult, or a default borderline verdict on parse failure.
        """
        try:
            data = json.loads(response)
            verdict = data.get("verdict", "borderline")
            if verdict not in ("real", "borderline", "false_positive"):
                verdict = "borderline"
            return ValidationResult(
                issue_id=issue_id,
                verdict=verdict,
                reasoning=str(data.get("reasoning", "")),
                confidence=float(data.get("confidence", 0.5)),
            )
        except (json.JSONDecodeError, TypeError, ValueError):
            return ValidationResult(
                issue_id=issue_id,
                verdict="borderline",
                reasoning=f"Failed to parse validator response: {response[:200]}",
                confidence=0.0,
            )


class MockFPValidator:
    """Mock validator for testing: classifies based on simple heuristics.

    Uses description length, element specificity, and recommendation
    presence to produce deterministic verdicts without API calls.
    """

    async def validate_issues(
        self, unmatched_mirror: list[dict], site_url: str
    ) -> list[ValidationResult]:
        """Validate all unmatched Mirror issues using simple heuristics.

        Args:
            unmatched_mirror: List of Mirror issue dicts.
            site_url: The site URL (unused in mock but accepted for interface).

        Returns:
            List of ValidationResult objects based on heuristic classification.
        """
        results: list[ValidationResult] = []
        for issue in unmatched_mirror:
            result = self._classify(issue)
            results.append(result)
        return results

    @staticmethod
    def _classify(issue: dict) -> ValidationResult:
        """Classify a single issue using simple text heuristics.

        Rules:
        - If description is short (<20 chars) or very generic, classify as false_positive.
        - If it mentions a specific element AND has a recommendation, classify as real.
        - Otherwise classify as borderline.

        Args:
            issue: Mirror issue dict.

        Returns:
            A ValidationResult with the heuristic-based verdict.
        """
        description = issue.get("description", "")
        element = issue.get("element", "")
        recommendation = issue.get("recommendation", "")

        # Very short or empty descriptions are likely false positives
        if len(description.strip()) < 20:
            return ValidationResult(
                issue_id=issue.get("id", "unknown"),
                verdict="false_positive",
                reasoning="Description is too short to be actionable.",
                confidence=0.8,
            )

        # Generic descriptions without specific elements
        generic_patterns = [
            r"^(issue|problem|error|bug)\s*$",
            r"^(could be better|needs improvement|not ideal)\s*$",
            r"^(something wrong|looks off)\s*$",
        ]
        desc_lower = description.lower().strip()
        for pattern in generic_patterns:
            if re.match(pattern, desc_lower):
                return ValidationResult(
                    issue_id=issue.get("id", "unknown"),
                    verdict="false_positive",
                    reasoning="Description is too generic to be actionable.",
                    confidence=0.7,
                )

        # Specific element + recommendation = likely real
        has_specific_element = len(element.strip()) > 5
        has_recommendation = len((recommendation or "").strip()) > 10

        if has_specific_element and has_recommendation:
            return ValidationResult(
                issue_id=issue.get("id", "unknown"),
                verdict="real",
                reasoning=(
                    "Issue mentions a specific element and provides "
                    "an actionable recommendation."
                ),
                confidence=0.7,
            )

        # Default to borderline
        return ValidationResult(
            issue_id=issue.get("id", "unknown"),
            verdict="borderline",
            reasoning="Issue has some specificity but lacks full context.",
            confidence=0.5,
        )
