"""Accessibility auditor — deep WCAG compliance analysis using Opus vision."""

from __future__ import annotations

import logging
from typing import Any

from app.llm.client import LLMClient
from app.llm.schemas import AccessibilityAudit

logger = logging.getLogger(__name__)


class AccessibilityAuditor:
    """Performs deep accessibility audits on page screenshots using Opus vision.

    Uses the LLM client's audit_accessibility method to analyze screenshots
    alongside their accessibility trees, producing per-page WCAG compliance
    results that can be aggregated into a site-wide report.
    """

    def __init__(self, llm_client: LLMClient) -> None:
        self._llm = llm_client

    async def audit_page(
        self,
        screenshot: bytes,
        a11y_tree: str,
        page_url: str,
        page_title: str,
    ) -> AccessibilityAudit:
        """Run a deep accessibility audit on a single page.

        Args:
            screenshot: Raw PNG screenshot bytes of the page.
            a11y_tree: Serialized accessibility tree from Playwright.
            page_url: The URL of the page being audited.
            page_title: The title of the page being audited.

        Returns:
            AccessibilityAudit with WCAG criterion results, visual issues,
            and compliance percentages.

        Raises:
            RuntimeError: If the LLM call fails after retries.
        """
        logger.info("Auditing accessibility for %s (%s)", page_title, page_url)

        try:
            audit = await self._llm.audit_accessibility(
                screenshot=screenshot,
                a11y_tree=a11y_tree,
                page_url=page_url,
                page_title=page_title,
            )
            logger.info(
                "Accessibility audit complete for %s: %d criteria, %.1f%% compliant",
                page_url,
                len(audit.criteria),
                audit.compliance_percentage,
            )
            return audit
        except Exception as e:
            logger.error("Accessibility audit failed for %s: %s", page_url, e)
            raise

    async def generate_compliance_report(
        self,
        audits: list[AccessibilityAudit],
    ) -> dict[str, Any]:
        """Aggregate per-page audits into a site-wide WCAG compliance summary.

        Args:
            audits: List of per-page AccessibilityAudit results.

        Returns:
            A dictionary containing:
                - overall_compliance_percentage: Weighted average compliance.
                - total_pages: Number of pages audited.
                - total_pass: Total passing criteria across all pages.
                - total_fail: Total failing criteria across all pages.
                - wcag_level: Target WCAG level (from first audit or "AA").
                - pages: Per-page summary with URL, compliance, and issue count.
                - failing_criteria: Deduplicated list of failing WCAG criteria
                  with affected pages.
                - visual_issues: All visual accessibility issues across pages.
                - summary: Human-readable compliance summary.
        """
        if not audits:
            logger.warning("No audits provided for compliance report generation")
            return {
                "overall_compliance_percentage": 0.0,
                "total_pages": 0,
                "total_pass": 0,
                "total_fail": 0,
                "wcag_level": "AA",
                "pages": [],
                "failing_criteria": [],
                "visual_issues": [],
                "summary": "No pages were audited.",
            }

        total_pass = 0
        total_fail = 0
        wcag_level = audits[0].wcag_level if audits else "AA"

        pages: list[dict[str, Any]] = []
        failing_criteria_map: dict[str, list[str]] = {}
        all_visual_issues: list[dict[str, Any]] = []

        for audit in audits:
            total_pass += audit.pass_count
            total_fail += audit.fail_count

            pages.append({
                "page_url": audit.page_url,
                "compliance_percentage": audit.compliance_percentage,
                "pass_count": audit.pass_count,
                "fail_count": audit.fail_count,
                "visual_issue_count": len(audit.visual_issues),
                "summary": audit.summary,
            })

            # Collect failing criteria with affected pages
            for criterion in audit.criteria:
                if criterion.status == "fail":
                    key = criterion.criterion
                    if key not in failing_criteria_map:
                        failing_criteria_map[key] = []
                    failing_criteria_map[key].append(audit.page_url)

            # Collect visual issues with page context
            for issue in audit.visual_issues:
                issue_dict = issue.model_dump()
                issue_dict["page_url"] = audit.page_url
                all_visual_issues.append(issue_dict)

        # Compute overall compliance
        total_criteria = total_pass + total_fail
        overall_compliance = (
            (total_pass / total_criteria * 100.0) if total_criteria > 0 else 0.0
        )

        # Build failing criteria summary
        failing_criteria = [
            {
                "criterion": criterion,
                "affected_pages": page_urls,
                "affected_page_count": len(page_urls),
            }
            for criterion, page_urls in sorted(failing_criteria_map.items())
        ]

        # Generate human-readable summary
        summary = (
            f"Audited {len(audits)} page(s) against WCAG {wcag_level}. "
            f"Overall compliance: {overall_compliance:.1f}% "
            f"({total_pass} pass, {total_fail} fail). "
            f"Found {len(all_visual_issues)} visual accessibility issue(s) "
            f"across {len(failing_criteria)} failing criteria."
        )

        logger.info(
            "Compliance report generated: %d pages, %.1f%% compliant, %d failing criteria",
            len(audits),
            overall_compliance,
            len(failing_criteria),
        )

        return {
            "overall_compliance_percentage": round(overall_compliance, 1),
            "total_pages": len(audits),
            "total_pass": total_pass,
            "total_fail": total_fail,
            "wcag_level": wcag_level,
            "pages": pages,
            "failing_criteria": failing_criteria,
            "visual_issues": all_visual_issues,
            "summary": summary,
        }
