"""Benchmark scoring: computes precision, recall, F1, and detailed breakdowns.

Takes MatchResult objects from the matcher and ground truth / Mirror issue
lists to compute aggregate and per-site metrics for evaluating Mirror's
UX issue detection quality.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from benchmark.matcher.schema import MatchResult

SEVERITY_WEIGHTS: dict[str, int] = {
    "critical": 4,
    "major": 3,
    "minor": 2,
    "enhancement": 1,
}


@dataclass
class SiteMetrics:
    """Computed metrics for a single benchmark site.

    Attributes:
        site_slug: Short identifier for the site.
        precision: Fraction of Mirror findings that are true positives.
        recall: Fraction of ground truth issues that were detected.
        f1: Harmonic mean of precision and recall.
        true_positives: Count of correctly detected issues.
        false_positives: Count of incorrectly reported issues.
        false_negatives: Count of missed ground truth issues.
        novel_findings: Mirror issues validated as real but not in ground truth.
        borderline: Mirror issues with borderline validation verdict.
        total_gt_issues: Total ground truth issues for this site.
        total_mirror_issues: Total Mirror-detected issues for this site.
    """

    site_slug: str
    precision: float
    recall: float
    f1: float
    true_positives: int
    false_positives: int
    false_negatives: int
    novel_findings: int
    borderline: int
    total_gt_issues: int
    total_mirror_issues: int


@dataclass
class BenchmarkMetrics:
    """Aggregate benchmark metrics across all evaluated sites.

    Includes core precision/recall/F1, severity-weighted variants,
    breakdowns by severity, category, and persona, coverage metrics,
    cost tracking, and per-site details.

    Attributes:
        precision: Aggregate precision across all sites.
        recall: Aggregate recall across all sites.
        f1: Aggregate F1 score.
        weighted_recall: Recall weighted by issue severity.
        severity_accuracy: Fraction of matched pairs with agreeing severity.
        recall_by_severity: Recall broken down by severity level.
        recall_by_category: Recall broken down by issue category.
        precision_by_persona: Precision broken down by persona role.
        page_coverage: Fraction of ground truth pages that were visited.
        novel_finding_rate: Fraction of unmatched Mirror issues validated as real.
        total_api_cost: Estimated total API cost in USD.
        cost_per_true_positive: API cost divided by number of true positives.
        per_site: List of per-site metric breakdowns.
        total_sites: Number of evaluated sites.
        total_gt_issues: Sum of ground truth issues across all sites.
        total_mirror_issues: Sum of Mirror issues across all sites.
        total_tp: Sum of true positives across all sites.
        total_fp: Sum of false positives across all sites.
        total_fn: Sum of false negatives across all sites.
    """

    # Core
    precision: float = 0.0
    recall: float = 0.0
    f1: float = 0.0
    # Severity-weighted
    weighted_recall: float = 0.0
    severity_accuracy: float = 0.0
    # Breakdowns
    recall_by_severity: dict[str, float] = field(default_factory=dict)
    recall_by_category: dict[str, float] = field(default_factory=dict)
    precision_by_persona: dict[str, float] = field(default_factory=dict)
    # Coverage
    page_coverage: float = 0.0
    # Quality
    novel_finding_rate: float = 0.0
    # Cost
    total_api_cost: float = 0.0
    cost_per_true_positive: float = 0.0
    # Per-site
    per_site: list[SiteMetrics] = field(default_factory=list)
    # Summary
    total_sites: int = 0
    total_gt_issues: int = 0
    total_mirror_issues: int = 0
    total_tp: int = 0
    total_fp: int = 0
    total_fn: int = 0

    def to_dict(self) -> dict:
        """Serialize metrics to a plain dictionary for JSON export."""
        d = asdict(self)
        d["per_site"] = [asdict(s) for s in self.per_site]
        return d


class BenchmarkScorer:
    """Computes benchmark metrics from match results.

    Given a list of MatchResult objects (one per site) along with the
    original ground truth and Mirror issue lists, computes precision,
    recall, F1, severity-weighted variants, and per-site breakdowns.
    """

    def score(
        self,
        match_results: list[MatchResult],
        gt_issues_by_site: dict[str, list],
        mirror_issues_by_site: dict[str, list],
    ) -> BenchmarkMetrics:
        """Compute all metrics across all sites.

        Args:
            match_results: One MatchResult per site from the matcher.
            gt_issues_by_site: Ground truth issues keyed by site slug.
            mirror_issues_by_site: Mirror-detected issues keyed by site slug.

        Returns:
            A BenchmarkMetrics instance with aggregate and per-site scores.
        """
        metrics = BenchmarkMetrics()
        metrics.total_sites = len(match_results)

        total_tp = 0
        total_fp = 0
        total_fn = 0
        total_gt = 0
        total_mirror = 0

        for result in match_results:
            slug = result.site_slug
            gt_issues = gt_issues_by_site.get(slug, [])
            mirror_issues = mirror_issues_by_site.get(slug, [])

            site_metrics = self._score_site(result, gt_issues, mirror_issues)
            metrics.per_site.append(site_metrics)

            total_tp += site_metrics.true_positives
            total_fp += site_metrics.false_positives
            total_fn += site_metrics.false_negatives
            total_gt += site_metrics.total_gt_issues
            total_mirror += site_metrics.total_mirror_issues

        metrics.total_tp = total_tp
        metrics.total_fp = total_fp
        metrics.total_fn = total_fn
        metrics.total_gt_issues = total_gt
        metrics.total_mirror_issues = total_mirror

        # Aggregate precision, recall, F1
        metrics.precision = (
            total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
        )
        metrics.recall = (
            total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
        )
        metrics.f1 = (
            2 * metrics.precision * metrics.recall / (metrics.precision + metrics.recall)
            if (metrics.precision + metrics.recall) > 0
            else 0.0
        )

        # Severity-weighted recall
        metrics.weighted_recall = self.compute_severity_weighted_recall(
            match_results, gt_issues_by_site
        )

        # Severity accuracy
        metrics.severity_accuracy = self.compute_severity_accuracy(match_results)

        # Recall by severity
        metrics.recall_by_severity = self.compute_recall_by_severity(
            match_results, gt_issues_by_site
        )

        # Recall by category
        metrics.recall_by_category = self.compute_recall_by_category(
            match_results, gt_issues_by_site
        )

        # Novel finding rate
        total_validated_real = sum(
            1
            for r in match_results
            for v in r.validated_unmatched
            if v.verdict == "real"
        )
        total_unmatched_mirror = sum(
            len(r.unmatched_mirror) for r in match_results
        )
        metrics.novel_finding_rate = (
            total_validated_real / total_unmatched_mirror
            if total_unmatched_mirror > 0
            else 0.0
        )

        return metrics

    def _score_site(
        self,
        result: MatchResult,
        gt_issues: list,
        mirror_issues: list,
    ) -> SiteMetrics:
        """Compute metrics for a single site.

        Args:
            result: The MatchResult for this site.
            gt_issues: Ground truth issue list for this site.
            mirror_issues: Mirror-detected issue list for this site.

        Returns:
            A SiteMetrics instance with per-site precision, recall, and F1.
        """
        tp = result.true_positives
        fp = result.false_positives
        fn = result.false_negatives

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (
            2 * precision * recall / (precision + recall)
            if (precision + recall) > 0
            else 0.0
        )

        novel_findings = sum(
            1 for v in result.validated_unmatched if v.verdict == "real"
        )
        borderline = sum(
            1 for v in result.validated_unmatched if v.verdict == "borderline"
        )

        return SiteMetrics(
            site_slug=result.site_slug,
            precision=precision,
            recall=recall,
            f1=f1,
            true_positives=tp,
            false_positives=fp,
            false_negatives=fn,
            novel_findings=novel_findings,
            borderline=borderline,
            total_gt_issues=len(gt_issues),
            total_mirror_issues=len(mirror_issues),
        )

    def compute_severity_weighted_recall(
        self,
        match_results: list[MatchResult],
        gt_by_site: dict[str, list],
    ) -> float:
        """Compute recall weighted by severity importance.

        Critical issues are weighted 4x, major 3x, minor 2x, enhancement 1x.
        This ensures that missing a critical issue penalizes the score more
        heavily than missing an enhancement.

        Args:
            match_results: One MatchResult per site.
            gt_by_site: Ground truth issues keyed by site slug.

        Returns:
            Weighted recall as a float between 0.0 and 1.0.
        """
        total_weighted = 0.0
        found_weighted = 0.0

        # Collect matched GT issue IDs across all sites
        matched_gt_ids: set[str] = set()
        for result in match_results:
            for match in result.matches:
                matched_gt_ids.add(match.gt_id)

        for slug, issues in gt_by_site.items():
            for issue in issues:
                issue_id = _get_issue_id(issue)
                severity = _get_issue_severity(issue)
                weight = SEVERITY_WEIGHTS.get(severity, 1)
                total_weighted += weight
                if issue_id in matched_gt_ids:
                    found_weighted += weight

        return found_weighted / total_weighted if total_weighted > 0 else 0.0

    def compute_recall_by_severity(
        self,
        match_results: list[MatchResult],
        gt_by_site: dict[str, list],
    ) -> dict[str, float]:
        """Compute recall broken down by severity level.

        Args:
            match_results: One MatchResult per site.
            gt_by_site: Ground truth issues keyed by site slug.

        Returns:
            Dictionary mapping severity level to recall for that level.
        """
        total_by_severity: dict[str, int] = {}
        found_by_severity: dict[str, int] = {}

        matched_gt_ids: set[str] = set()
        for result in match_results:
            for match in result.matches:
                matched_gt_ids.add(match.gt_id)

        for slug, issues in gt_by_site.items():
            for issue in issues:
                issue_id = _get_issue_id(issue)
                severity = _get_issue_severity(issue)
                total_by_severity[severity] = total_by_severity.get(severity, 0) + 1
                if issue_id in matched_gt_ids:
                    found_by_severity[severity] = (
                        found_by_severity.get(severity, 0) + 1
                    )

        result: dict[str, float] = {}
        for severity, total in total_by_severity.items():
            found = found_by_severity.get(severity, 0)
            result[severity] = found / total if total > 0 else 0.0

        return result

    def compute_recall_by_category(
        self,
        match_results: list[MatchResult],
        gt_by_site: dict[str, list],
    ) -> dict[str, float]:
        """Compute recall broken down by issue category.

        Args:
            match_results: One MatchResult per site.
            gt_by_site: Ground truth issues keyed by site slug.

        Returns:
            Dictionary mapping category to recall for that category.
        """
        total_by_category: dict[str, int] = {}
        found_by_category: dict[str, int] = {}

        matched_gt_ids: set[str] = set()
        for result in match_results:
            for match in result.matches:
                matched_gt_ids.add(match.gt_id)

        for slug, issues in gt_by_site.items():
            for issue in issues:
                issue_id = _get_issue_id(issue)
                category = _get_issue_category(issue)
                total_by_category[category] = total_by_category.get(category, 0) + 1
                if issue_id in matched_gt_ids:
                    found_by_category[category] = (
                        found_by_category.get(category, 0) + 1
                    )

        result: dict[str, float] = {}
        for category, total in total_by_category.items():
            found = found_by_category.get(category, 0)
            result[category] = found / total if total > 0 else 0.0

        return result

    def compute_severity_accuracy(
        self,
        match_results: list[MatchResult],
    ) -> float:
        """Compute severity agreement on matched pairs.

        For each matched pair, checks whether Mirror assigned the same
        severity as the ground truth. Returns the fraction that agree.

        Args:
            match_results: One MatchResult per site.

        Returns:
            Fraction of matched pairs with the same severity (0.0 to 1.0).
        """
        total_matched = 0
        same_severity = 0

        for result in match_results:
            # Build lookup for GT and Mirror issues by ID
            gt_by_id = {_get_issue_id(i): i for i in result.unmatched_gt}
            mirror_by_id = {_get_issue_id(i): i for i in result.unmatched_mirror}

            # For matches, we need to look up severities in the original data
            # The unmatched lists don't contain matched items, so we use
            # the judge_scores list which has the raw data
            for match in result.matches:
                total_matched += 1
                gt_severity = _find_severity_by_id(
                    match.gt_id, result.judge_scores
                )
                mirror_severity = _find_severity_by_id(
                    match.mirror_id, result.judge_scores
                )
                if gt_severity and mirror_severity and gt_severity == mirror_severity:
                    same_severity += 1

        return same_severity / total_matched if total_matched > 0 else 0.0


def _get_issue_id(issue: Any) -> str:
    """Extract the ID from an issue (dict or object with .id attribute).

    Args:
        issue: An issue dict or dataclass instance.

    Returns:
        The issue ID string.
    """
    if isinstance(issue, dict):
        return issue.get("id", "")
    return getattr(issue, "id", "")


def _get_issue_severity(issue: Any) -> str:
    """Extract the severity from an issue (dict or object with .severity attribute).

    Args:
        issue: An issue dict or dataclass instance.

    Returns:
        The severity string.
    """
    if isinstance(issue, dict):
        return issue.get("severity", "minor")
    return getattr(issue, "severity", "minor")


def _get_issue_category(issue: Any) -> str:
    """Extract the category from an issue (dict or object with .category attribute).

    Args:
        issue: An issue dict or dataclass instance.

    Returns:
        The category string.
    """
    if isinstance(issue, dict):
        return issue.get("category", "unknown")
    return getattr(issue, "category", "unknown")


def _find_severity_by_id(issue_id: str, judge_scores: list[dict]) -> str | None:
    """Find the severity of an issue by its ID in the judge scores list.

    Searches through judge score entries which may contain issue metadata.

    Args:
        issue_id: The issue ID to look up.
        judge_scores: List of judge score dicts from a MatchResult.

    Returns:
        The severity string, or None if not found.
    """
    for entry in judge_scores:
        if entry.get("gt_id") == issue_id:
            return entry.get("gt_severity")
        if entry.get("mirror_id") == issue_id:
            return entry.get("mirror_severity")
    return None
