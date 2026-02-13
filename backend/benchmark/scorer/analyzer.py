"""Error analysis for benchmark results.

Categorizes false negatives and false positives into failure modes
to guide prompt optimization and identify systematic weaknesses in
Mirror's UX issue detection pipeline.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any

from benchmark.matcher.schema import MatchResult


class FailureMode(Enum):
    """Categorization of why Mirror missed or hallucinated a UX issue.

    False Negative modes (Mirror missed a real issue):
        COVERAGE_GAP: The page containing the issue was never visited.
        OBSERVATION_GAP: The page was visited but no issues were reported there.
        ANALYSIS_GAP: Issues were found on the page but this specific one was missed.
        CLASSIFICATION_GAP: A similar issue was found but the matcher could not match it.
        TASK_MISMATCH: The issue is on a page unrelated to the assigned tasks.

    False Positive modes (Mirror reported a non-issue):
        DESIGN_MISINTERPRETATION: A valid design choice misread as a problem.
        GENERIC_COMPLAINT: A vague, non-specific complaint without clear element reference.
        DUPLICATE_VARIANT: A duplicate of another reported issue, phrased differently.
        CONTEXT_WRONG: Mirror misunderstood the page context.
        SEVERITY_INFLATION: Real issue but reported at inflated severity.
    """

    # False Negative modes
    COVERAGE_GAP = "coverage_gap"
    OBSERVATION_GAP = "observation_gap"
    ANALYSIS_GAP = "analysis_gap"
    CLASSIFICATION_GAP = "classification_gap"
    TASK_MISMATCH = "task_mismatch"
    # False Positive modes
    DESIGN_MISINTERPRETATION = "design_misinterp"
    GENERIC_COMPLAINT = "generic_complaint"
    DUPLICATE_VARIANT = "duplicate_variant"
    CONTEXT_WRONG = "context_wrong"
    SEVERITY_INFLATION = "severity_inflation"


@dataclass
class ErrorAnalysis:
    """Aggregate error analysis results across all evaluated sites.

    Attributes:
        total_false_negatives: Total count of missed ground truth issues.
        total_false_positives: Total count of incorrectly reported issues.
        fn_by_mode: False negative counts by FailureMode value.
        fp_by_mode: False positive counts by FailureMode value.
        fn_by_category: False negative counts by issue category.
        fn_by_severity: False negative counts by issue severity.
        fp_by_persona: False positive counts by persona role.
        top_improvement_areas: Ranked list of improvement suggestions.
    """

    total_false_negatives: int = 0
    total_false_positives: int = 0
    fn_by_mode: dict[str, int] = field(default_factory=dict)
    fp_by_mode: dict[str, int] = field(default_factory=dict)
    fn_by_category: dict[str, int] = field(default_factory=dict)
    fn_by_severity: dict[str, int] = field(default_factory=dict)
    fp_by_persona: dict[str, int] = field(default_factory=dict)
    top_improvement_areas: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Serialize to a plain dictionary for JSON export."""
        return asdict(self)


# Hedging language patterns that suggest severity inflation
_HEDGING_PATTERNS = frozenset({
    "could be better",
    "might",
    "perhaps",
    "possibly",
    "arguably",
    "somewhat",
    "slightly",
    "a bit",
    "may not",
    "could potentially",
})


class ErrorAnalyzer:
    """Analyzes failure patterns to guide prompt improvements.

    Examines false negatives (missed ground truth issues) and false positives
    (hallucinated issues) to categorize each into a specific FailureMode.
    This categorization drives targeted prompt optimization suggestions.
    """

    def analyze(
        self,
        match_results: list[MatchResult],
        gt_by_site: dict[str, list],
        mirror_by_site: dict[str, list],
        pages_visited_by_site: dict[str, list[str]],
    ) -> ErrorAnalysis:
        """Perform full error analysis across all sites.

        Args:
            match_results: One MatchResult per site from the matcher.
            gt_by_site: Ground truth issues keyed by site slug.
            mirror_by_site: Mirror-detected issues keyed by site slug.
            pages_visited_by_site: Pages visited keyed by site slug.

        Returns:
            An ErrorAnalysis with categorized failure modes and improvement areas.
        """
        analysis = ErrorAnalysis()

        for result in match_results:
            slug = result.site_slug
            pages_visited = pages_visited_by_site.get(slug, [])
            mirror_issues = mirror_by_site.get(slug, [])

            # Analyze false negatives (unmatched ground truth issues)
            for gt_issue in result.unmatched_gt:
                analysis.total_false_negatives += 1

                # Find mirror issues on the same page for context
                gt_page = _get_page_url(gt_issue)
                mirror_on_page = [
                    mi for mi in mirror_issues
                    if _normalize_path(_get_page_url(mi)) == _normalize_path(gt_page)
                ]

                mode = self.categorize_false_negative(
                    gt_issue, pages_visited, mirror_on_page
                )
                mode_key = mode.value
                analysis.fn_by_mode[mode_key] = analysis.fn_by_mode.get(mode_key, 0) + 1

                # Track by category and severity
                category = _get_field(gt_issue, "category", "unknown")
                severity = _get_field(gt_issue, "severity", "unknown")
                analysis.fn_by_category[category] = (
                    analysis.fn_by_category.get(category, 0) + 1
                )
                analysis.fn_by_severity[severity] = (
                    analysis.fn_by_severity.get(severity, 0) + 1
                )

            # Analyze false positives (validated as false_positive)
            for validation in result.validated_unmatched:
                if validation.verdict != "false_positive":
                    continue

                analysis.total_false_positives += 1

                # Find the original Mirror issue for this validation
                fp_issue = _find_issue_by_id(
                    validation.issue_id, result.unmatched_mirror
                )

                mode = self.categorize_false_positive(fp_issue)
                mode_key = mode.value
                analysis.fp_by_mode[mode_key] = analysis.fp_by_mode.get(mode_key, 0) + 1

                # Track by persona
                persona = _get_field(fp_issue, "persona_role", "unknown")
                analysis.fp_by_persona[persona] = (
                    analysis.fp_by_persona.get(persona, 0) + 1
                )

        # Generate improvement suggestions
        analysis.top_improvement_areas = self.get_top_improvements(analysis)

        return analysis

    def categorize_false_negative(
        self,
        gt_issue: dict | Any,
        pages_visited: list[str],
        mirror_issues_on_page: list[dict | Any],
    ) -> FailureMode:
        """Determine why Mirror missed a ground truth issue.

        Applies a cascade of checks:
        1. If the issue's page was never visited -> COVERAGE_GAP
        2. If the page was visited but no Mirror issues on that page -> OBSERVATION_GAP
        3. If Mirror issues exist on the page but not this one -> ANALYSIS_GAP
        4. Default -> CLASSIFICATION_GAP (similar issue exists but didn't match)

        Args:
            gt_issue: The missed ground truth issue (dict or dataclass).
            pages_visited: List of page URLs visited during the run.
            mirror_issues_on_page: Mirror issues found on the same page.

        Returns:
            The FailureMode categorizing why this issue was missed.
        """
        gt_page = _normalize_path(_get_page_url(gt_issue))

        # Normalize visited pages for comparison
        visited_normalized = [_normalize_path(p) for p in pages_visited]

        # 1. Coverage gap: page not visited
        if gt_page not in visited_normalized:
            return FailureMode.COVERAGE_GAP

        # 2. Observation gap: page visited but no issues found there
        if not mirror_issues_on_page:
            return FailureMode.OBSERVATION_GAP

        # 3. Analysis gap: issues found on page but not this specific one
        # (If we have mirror issues on the page, the matcher already tried and
        # failed to match them, so this is an analysis gap)
        return FailureMode.ANALYSIS_GAP

    def categorize_false_positive(
        self,
        issue: dict | Any | None,
    ) -> FailureMode:
        """Determine why Mirror hallucinated a false issue.

        Uses heuristic-based classification:
        - Short description (<30 chars) or no specific element -> GENERIC_COMPLAINT
        - Hedging language ("could be better", "might") -> SEVERITY_INFLATION
        - Default -> CONTEXT_WRONG

        Args:
            issue: The false positive Mirror issue (dict, dataclass, or None).

        Returns:
            The FailureMode categorizing why this issue is a false positive.
        """
        if issue is None:
            return FailureMode.CONTEXT_WRONG

        description = _get_field(issue, "description", "")
        element = _get_field(issue, "element", "")

        # Short or missing description -> generic complaint
        if len(description) < 30:
            return FailureMode.GENERIC_COMPLAINT

        # No specific element referenced -> generic complaint
        if not element or element.lower() in ("unknown", "page", "general", ""):
            return FailureMode.GENERIC_COMPLAINT

        # Hedging language -> severity inflation
        desc_lower = description.lower()
        for pattern in _HEDGING_PATTERNS:
            if pattern in desc_lower:
                return FailureMode.SEVERITY_INFLATION

        # Default
        return FailureMode.CONTEXT_WRONG

    def get_top_improvements(self, analysis: ErrorAnalysis) -> list[str]:
        """Generate a ranked list of improvement suggestions.

        Examines the most frequent failure modes and translates them into
        actionable recommendations for prompt and configuration changes.

        Args:
            analysis: The error analysis to derive suggestions from.

        Returns:
            A list of human-readable improvement suggestion strings,
            ordered by impact (most frequent failure modes first).
        """
        suggestions: list[str] = []

        # Combine all failure modes with their counts
        all_modes: list[tuple[str, int, str]] = []

        for mode, count in analysis.fn_by_mode.items():
            label = _FAILURE_MODE_LABELS.get(mode, mode)
            all_modes.append((mode, count, f"FN: {label}"))

        for mode, count in analysis.fp_by_mode.items():
            label = _FAILURE_MODE_LABELS.get(mode, mode)
            all_modes.append((mode, count, f"FP: {label}"))

        # Sort by count descending
        all_modes.sort(key=lambda x: x[1], reverse=True)

        for mode, count, label in all_modes:
            suggestion = _IMPROVEMENT_SUGGESTIONS.get(mode)
            if suggestion:
                suggestions.append(f"[{count}x {label}] {suggestion}")

        return suggestions


# Human-readable labels for failure modes
_FAILURE_MODE_LABELS: dict[str, str] = {
    "coverage_gap": "Coverage gap (page not visited)",
    "observation_gap": "Observation gap (page visited, no issues found)",
    "analysis_gap": "Analysis gap (issues on page but missed this one)",
    "classification_gap": "Classification gap (similar issue not matched)",
    "task_mismatch": "Task mismatch (issue unrelated to task)",
    "design_misinterp": "Design misinterpretation",
    "generic_complaint": "Generic/vague complaint",
    "duplicate_variant": "Duplicate variant",
    "context_wrong": "Wrong context understanding",
    "severity_inflation": "Severity inflation",
}

# Improvement suggestions mapped to failure modes
_IMPROVEMENT_SUGGESTIONS: dict[str, str] = {
    "coverage_gap": (
        "Improve navigation coverage: increase max_steps or add explicit "
        "instructions to visit all main sections."
    ),
    "observation_gap": (
        "Improve screenshot analysis: add a structured checklist for each page "
        "to ensure all element types are evaluated."
    ),
    "analysis_gap": (
        "Improve issue detection depth: add prompts to check for commonly "
        "missed issue categories on each page."
    ),
    "classification_gap": (
        "Improve issue description specificity: ensure each finding references "
        "a specific element and describes the exact problem."
    ),
    "task_mismatch": (
        "Review task definitions: ensure tasks cover the pages where known "
        "issues exist."
    ),
    "design_misinterp": (
        "Reduce design misinterpretation: add instructions to only flag issues "
        "that prevent or frustrate task completion."
    ),
    "generic_complaint": (
        "Reduce generic complaints: require every issue to reference a specific "
        "element and describe concrete user impact."
    ),
    "duplicate_variant": (
        "Improve deduplication: add a post-processing step to merge similar "
        "issues from different personas."
    ),
    "context_wrong": (
        "Improve context understanding: provide more site background in the "
        "navigation prompt to reduce misinterpretations."
    ),
    "severity_inflation": (
        "Calibrate severity: add severity calibration examples to the prompt "
        "with clear criteria for each level."
    ),
}


def _get_field(issue: dict | Any | None, field_name: str, default: str = "") -> str:
    """Extract a field from an issue (dict or object).

    Args:
        issue: An issue dict or dataclass instance, or None.
        field_name: The field name to extract.
        default: Default value if the field is not found.

    Returns:
        The field value as a string.
    """
    if issue is None:
        return default
    if isinstance(issue, dict):
        return str(issue.get(field_name, default))
    return str(getattr(issue, field_name, default))


def _get_page_url(issue: dict | Any) -> str:
    """Extract the page URL from an issue.

    Tries 'page_url' first, then 'page_pattern' for ground truth issues.

    Args:
        issue: An issue dict or dataclass instance.

    Returns:
        The page URL or pattern string.
    """
    if isinstance(issue, dict):
        return issue.get("page_url", issue.get("page_pattern", "/"))
    return getattr(issue, "page_url", getattr(issue, "page_pattern", "/"))


def _normalize_path(url: str) -> str:
    """Normalize a URL path for comparison.

    Strips trailing slashes (except for root '/') and converts to lowercase.

    Args:
        url: A URL path or full URL.

    Returns:
        Normalized path string.
    """
    from urllib.parse import urlparse

    parsed = urlparse(url)
    path = parsed.path if parsed.path else "/"
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
    return path.lower()


def _find_issue_by_id(issue_id: str, issues: list[dict | Any]) -> dict | Any | None:
    """Find an issue by its ID in a list of issues.

    Args:
        issue_id: The issue ID to search for.
        issues: List of issue dicts or dataclass instances.

    Returns:
        The matching issue, or None if not found.
    """
    for issue in issues:
        if isinstance(issue, dict):
            if issue.get("id") == issue_id:
                return issue
        elif getattr(issue, "id", None) == issue_id:
            return issue
    return None
