"""Screenshot UX analyzer — post-session deep analysis pass using Opus vision."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.llm.client import LLMClient
from app.llm.schemas import FlowAnalysis, ScreenshotAnalysis, UXIssue

logger = logging.getLogger(__name__)


@dataclass
class AnalysisResult:
    """Aggregated analysis results for a session."""

    session_id: str
    analyses: list[ScreenshotAnalysis] = field(default_factory=list)
    all_issues: list[UXIssue] = field(default_factory=list)
    deduplicated_issues: list[UXIssue] = field(default_factory=list)


class Analyzer:
    """Performs deep UX analysis on screenshots from completed sessions."""

    def __init__(self, llm_client: LLMClient) -> None:
        self._llm = llm_client

    async def analyze_step(
        self,
        screenshot: bytes,
        page_url: str,
        page_title: str,
        persona_context: str | None = None,
    ) -> ScreenshotAnalysis:
        """Analyze a single screenshot for UX issues."""
        return await self._llm.analyze_screenshot(
            screenshot=screenshot,
            page_url=page_url,
            page_title=page_title,
            persona_context=persona_context,
        )

    async def analyze_session(
        self,
        session_id: str,
        steps: list[dict[str, Any]],
        persona_context: str | None = None,
    ) -> AnalysisResult:
        """Analyze all unique pages in a session.

        Only analyzes unique page URLs to avoid redundant analysis of
        the same page seen across multiple steps.
        """
        result = AnalysisResult(session_id=session_id)
        seen_urls: set[str] = set()

        for step in steps:
            page_url = step.get("page_url", "")
            if page_url in seen_urls:
                continue
            seen_urls.add(page_url)

            screenshot_bytes = step.get("screenshot_bytes")
            if not screenshot_bytes:
                logger.debug("No screenshot for step %s, skipping", step.get("step_number"))
                continue

            try:
                analysis = await self.analyze_step(
                    screenshot=screenshot_bytes,
                    page_url=page_url,
                    page_title=step.get("page_title", ""),
                    persona_context=persona_context,
                )
                result.analyses.append(analysis)
                result.all_issues.extend(analysis.issues)
            except Exception as e:
                logger.error("Failed to analyze step %s: %s", step.get("step_number"), e)

        result.deduplicated_issues = self._deduplicate_issues(result.all_issues)
        logger.info(
            "Session %s analysis: %d pages, %d issues (%d after dedup)",
            session_id, len(result.analyses), len(result.all_issues),
            len(result.deduplicated_issues),
        )
        return result

    @staticmethod
    def _deduplicate_issues(issues: list[UXIssue]) -> list[UXIssue]:
        """Deduplicate similar issues based on element + description similarity.

        Uses a simple approach: cluster by element name and merge issues
        that reference the same element with similar descriptions.
        """
        if not issues:
            return []

        seen: dict[str, UXIssue] = {}
        for issue in issues:
            # Create a dedup key from element + first 50 chars of description
            key = f"{issue.element.lower().strip()}:{issue.description[:50].lower().strip()}"
            if key not in seen:
                seen[key] = issue
            else:
                # Keep the higher severity version
                severity_rank = {"critical": 0, "major": 1, "minor": 2, "enhancement": 3}
                existing_rank = severity_rank.get(seen[key].severity.value, 3)
                new_rank = severity_rank.get(issue.severity.value, 3)
                if new_rank < existing_rank:
                    seen[key] = issue

        return list(seen.values())

    async def analyze_flows(
        self,
        steps: list[dict[str, Any]],
        persona_context: str | None = None,
    ) -> list[FlowAnalysis]:
        """Group steps into flows and analyze transitions between pages.

        Groups consecutive steps by URL sequence to identify user flows
        (e.g., homepage → product → cart → checkout), then sends each flow
        to Opus for multi-image analysis.
        """
        flows = self._group_steps_into_flows(steps)
        results: list[FlowAnalysis] = []

        for flow_name, flow_steps in flows.items():
            screenshots = [s["screenshot_bytes"] for s in flow_steps if s.get("screenshot_bytes")]
            urls = [s["page_url"] for s in flow_steps]

            if len(screenshots) < 2:
                continue

            try:
                analysis = await self._llm.analyze_flow(
                    screenshots=screenshots[:5],  # Max 5 images per flow
                    page_urls=urls[:5],
                    flow_name=flow_name,
                    persona_context=persona_context,
                )
                results.append(analysis)
            except Exception as e:
                logger.error("Flow analysis failed for '%s': %s", flow_name, e)

        return results

    @staticmethod
    def _group_steps_into_flows(
        steps: list[dict[str, Any]],
    ) -> dict[str, list[dict[str, Any]]]:
        """Group consecutive steps into named flows based on URL patterns."""
        if not steps:
            return {}

        flows: dict[str, list[dict[str, Any]]] = {}
        current_flow: list[dict[str, Any]] = []
        seen_urls: list[str] = []

        for step in steps:
            url = step.get("page_url", "")
            if url not in seen_urls:
                seen_urls.append(url)
                current_flow.append(step)
            elif current_flow:
                # URL repeated — end current flow
                flow_name = f"flow_{len(flows) + 1}"
                if len(current_flow) >= 2:
                    flows[flow_name] = current_flow
                current_flow = [step]
                seen_urls = [url]

        if len(current_flow) >= 2:
            flows[f"flow_{len(flows) + 1}"] = current_flow

        return flows

    @staticmethod
    def issues_to_dicts(issues: list[UXIssue]) -> list[dict[str, Any]]:
        """Convert UXIssue list to dicts for storage/synthesis."""
        return [issue.model_dump() for issue in issues]
