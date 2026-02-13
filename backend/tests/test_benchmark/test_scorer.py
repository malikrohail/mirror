"""Comprehensive tests for the benchmark scorer, error analyzer, reporter, and optimizer.

Tests cover:
- BenchmarkScorer.score with various match scenarios
- SiteMetrics computation
- Severity-weighted recall calculation
- Severity accuracy computation
- Recall by severity and category breakdowns
- ErrorAnalyzer false negative categorization
- ErrorAnalyzer false positive categorization
- BenchmarkReporter markdown generation
- PromptOptimizer suggestion ranking
"""

from __future__ import annotations

import pytest

from benchmark.matcher.schema import IssueMatch, MatchResult, ValidationResult
from benchmark.optimizer.suggestions import PromptOptimizer
from benchmark.scorer.analyzer import ErrorAnalysis, ErrorAnalyzer, FailureMode
from benchmark.scorer.metrics import BenchmarkMetrics, BenchmarkScorer, SiteMetrics
from benchmark.scorer.reporter import BenchmarkReporter


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_gt_issue(
    issue_id: str,
    site_slug: str = "test_site",
    severity: str = "major",
    category: str = "forms",
    page_url: str = "/checkout",
) -> dict:
    """Create a ground truth issue dict for testing."""
    return {
        "id": issue_id,
        "site_slug": site_slug,
        "site_url": "https://example.com",
        "page_url": page_url,
        "page_pattern": f"^{page_url}/?$",
        "element": f"Element for {issue_id}",
        "description": f"Description of issue {issue_id} on {page_url}",
        "severity": severity,
        "category": category,
    }


def _make_mirror_issue(
    issue_id: str,
    site_slug: str = "test_site",
    severity: str = "major",
    page_url: str = "/checkout",
    persona_role: str = "power-user-impatient",
    element: str = "Submit button",
    description: str = "The submit button is hard to find",
) -> dict:
    """Create a Mirror issue dict for testing."""
    return {
        "id": issue_id,
        "site_slug": site_slug,
        "study_id": "study-001",
        "session_id": "session-001",
        "persona_role": persona_role,
        "step_number": 5,
        "page_url": page_url,
        "element": element,
        "description": description,
        "severity": severity,
    }


def _make_match_result(
    site_slug: str = "test_site",
    matches: list[IssueMatch] | None = None,
    unmatched_gt: list[dict] | None = None,
    unmatched_mirror: list[dict] | None = None,
    validated_unmatched: list[ValidationResult] | None = None,
    judge_scores: list[dict] | None = None,
) -> MatchResult:
    """Create a MatchResult for testing."""
    return MatchResult(
        site_slug=site_slug,
        matches=matches or [],
        unmatched_gt=unmatched_gt or [],
        unmatched_mirror=unmatched_mirror or [],
        validated_unmatched=validated_unmatched or [],
        judge_scores=judge_scores or [],
    )


# ---------------------------------------------------------------------------
# BenchmarkScorer Tests
# ---------------------------------------------------------------------------

class TestBenchmarkScorer:
    """Tests for the BenchmarkScorer class."""

    def test_perfect_scores(self) -> None:
        """All GT matched, no FP -> precision=1.0, recall=1.0, f1=1.0."""
        gt_issues = [
            _make_gt_issue("GT-test-001"),
            _make_gt_issue("GT-test-002"),
            _make_gt_issue("GT-test-003"),
        ]
        mirror_issues = [
            _make_mirror_issue("MI-001"),
            _make_mirror_issue("MI-002"),
            _make_mirror_issue("MI-003"),
        ]
        match_result = _make_match_result(
            matches=[
                IssueMatch(gt_id="GT-test-001", mirror_id="MI-001", score=3, reasoning="exact"),
                IssueMatch(gt_id="GT-test-002", mirror_id="MI-002", score=3, reasoning="exact"),
                IssueMatch(gt_id="GT-test-003", mirror_id="MI-003", score=3, reasoning="exact"),
            ],
        )

        scorer = BenchmarkScorer()
        metrics = scorer.score(
            [match_result],
            {"test_site": gt_issues},
            {"test_site": mirror_issues},
        )

        assert metrics.precision == 1.0
        assert metrics.recall == 1.0
        assert metrics.f1 == 1.0
        assert metrics.total_tp == 3
        assert metrics.total_fp == 0
        assert metrics.total_fn == 0

    def test_half_recall(self) -> None:
        """5/10 GT matched, 0 FP -> recall=0.5, precision=1.0."""
        gt_issues = [_make_gt_issue(f"GT-test-{i:03d}") for i in range(1, 11)]
        mirror_issues = [_make_mirror_issue(f"MI-{i:03d}") for i in range(1, 6)]
        unmatched_gt = [_make_gt_issue(f"GT-test-{i:03d}") for i in range(6, 11)]

        matches = [
            IssueMatch(
                gt_id=f"GT-test-{i:03d}",
                mirror_id=f"MI-{i:03d}",
                score=3,
                reasoning="match",
            )
            for i in range(1, 6)
        ]
        match_result = _make_match_result(
            matches=matches,
            unmatched_gt=unmatched_gt,
        )

        scorer = BenchmarkScorer()
        metrics = scorer.score(
            [match_result],
            {"test_site": gt_issues},
            {"test_site": mirror_issues},
        )

        assert metrics.recall == pytest.approx(0.5)
        assert metrics.precision == 1.0
        assert metrics.total_tp == 5
        assert metrics.total_fn == 5

    def test_with_false_positives(self) -> None:
        """5 TP, 5 FP -> precision=0.5."""
        gt_issues = [_make_gt_issue(f"GT-test-{i:03d}") for i in range(1, 6)]
        mirror_issues = [_make_mirror_issue(f"MI-{i:03d}") for i in range(1, 11)]
        unmatched_mirror = [_make_mirror_issue(f"MI-{i:03d}") for i in range(6, 11)]

        matches = [
            IssueMatch(
                gt_id=f"GT-test-{i:03d}",
                mirror_id=f"MI-{i:03d}",
                score=3,
                reasoning="match",
            )
            for i in range(1, 6)
        ]
        validated = [
            ValidationResult(
                issue_id=f"MI-{i:03d}",
                verdict="false_positive",
                reasoning="not real",
                confidence=0.9,
            )
            for i in range(6, 11)
        ]
        match_result = _make_match_result(
            matches=matches,
            unmatched_mirror=unmatched_mirror,
            validated_unmatched=validated,
        )

        scorer = BenchmarkScorer()
        metrics = scorer.score(
            [match_result],
            {"test_site": gt_issues},
            {"test_site": mirror_issues},
        )

        assert metrics.precision == pytest.approx(0.5)
        assert metrics.total_tp == 5
        assert metrics.total_fp == 5

    def test_no_matches(self) -> None:
        """No matches at all -> precision=0, recall=0, f1=0."""
        gt_issues = [_make_gt_issue(f"GT-test-{i:03d}") for i in range(1, 4)]
        mirror_issues = [_make_mirror_issue(f"MI-{i:03d}") for i in range(1, 4)]

        match_result = _make_match_result(
            unmatched_gt=[_make_gt_issue(f"GT-test-{i:03d}") for i in range(1, 4)],
            unmatched_mirror=[_make_mirror_issue(f"MI-{i:03d}") for i in range(1, 4)],
            validated_unmatched=[
                ValidationResult(
                    issue_id=f"MI-{i:03d}",
                    verdict="false_positive",
                    reasoning="not real",
                    confidence=0.9,
                )
                for i in range(1, 4)
            ],
        )

        scorer = BenchmarkScorer()
        metrics = scorer.score(
            [match_result],
            {"test_site": gt_issues},
            {"test_site": mirror_issues},
        )

        assert metrics.precision == 0.0
        assert metrics.recall == 0.0
        assert metrics.f1 == 0.0

    def test_multiple_sites_aggregation(self) -> None:
        """Metrics aggregate correctly across multiple sites."""
        # Site A: 2 TP, 0 FP, 1 FN
        gt_a = [_make_gt_issue(f"GT-a-{i:03d}", site_slug="site_a") for i in range(1, 4)]
        mirror_a = [_make_mirror_issue(f"MI-a-{i:03d}", site_slug="site_a") for i in range(1, 3)]
        mr_a = _make_match_result(
            site_slug="site_a",
            matches=[
                IssueMatch(gt_id="GT-a-001", mirror_id="MI-a-001", score=3, reasoning="m"),
                IssueMatch(gt_id="GT-a-002", mirror_id="MI-a-002", score=3, reasoning="m"),
            ],
            unmatched_gt=[_make_gt_issue("GT-a-003", site_slug="site_a")],
        )

        # Site B: 1 TP, 1 FP, 0 FN
        gt_b = [_make_gt_issue("GT-b-001", site_slug="site_b")]
        mirror_b = [_make_mirror_issue(f"MI-b-{i:03d}", site_slug="site_b") for i in range(1, 3)]
        mr_b = _make_match_result(
            site_slug="site_b",
            matches=[
                IssueMatch(gt_id="GT-b-001", mirror_id="MI-b-001", score=3, reasoning="m"),
            ],
            unmatched_mirror=[_make_mirror_issue("MI-b-002", site_slug="site_b")],
            validated_unmatched=[
                ValidationResult(
                    issue_id="MI-b-002",
                    verdict="false_positive",
                    reasoning="not real",
                    confidence=0.9,
                ),
            ],
        )

        scorer = BenchmarkScorer()
        metrics = scorer.score(
            [mr_a, mr_b],
            {"site_a": gt_a, "site_b": gt_b},
            {"site_a": mirror_a, "site_b": mirror_b},
        )

        # Total: 3 TP, 1 FP, 1 FN
        assert metrics.total_tp == 3
        assert metrics.total_fp == 1
        assert metrics.total_fn == 1
        assert metrics.precision == pytest.approx(3 / 4)
        assert metrics.recall == pytest.approx(3 / 4)
        assert len(metrics.per_site) == 2
        assert metrics.total_sites == 2

    def test_novel_finding_rate(self) -> None:
        """Novel finding rate = validated-real / total unmatched mirror."""
        gt_issues = [_make_gt_issue("GT-test-001")]
        mirror_issues = [_make_mirror_issue(f"MI-{i:03d}") for i in range(1, 5)]

        match_result = _make_match_result(
            matches=[
                IssueMatch(gt_id="GT-test-001", mirror_id="MI-001", score=3, reasoning="m"),
            ],
            unmatched_mirror=[
                _make_mirror_issue("MI-002"),
                _make_mirror_issue("MI-003"),
                _make_mirror_issue("MI-004"),
            ],
            validated_unmatched=[
                ValidationResult(issue_id="MI-002", verdict="real", reasoning="valid", confidence=0.9),
                ValidationResult(issue_id="MI-003", verdict="false_positive", reasoning="fp", confidence=0.8),
                ValidationResult(issue_id="MI-004", verdict="borderline", reasoning="edge", confidence=0.5),
            ],
        )

        scorer = BenchmarkScorer()
        metrics = scorer.score(
            [match_result],
            {"test_site": gt_issues},
            {"test_site": mirror_issues},
        )

        # 1 validated-real out of 3 unmatched mirror
        assert metrics.novel_finding_rate == pytest.approx(1 / 3)


# ---------------------------------------------------------------------------
# SiteMetrics Tests
# ---------------------------------------------------------------------------

class TestSiteMetrics:
    """Tests for SiteMetrics computation via _score_site."""

    def test_site_metrics_computed_correctly(self) -> None:
        """Site metrics reflect the match result counts."""
        mr = _make_match_result(
            site_slug="my_site",
            matches=[
                IssueMatch(gt_id="GT-1", mirror_id="MI-1", score=3, reasoning="m"),
            ],
            unmatched_gt=[_make_gt_issue("GT-2")],
            unmatched_mirror=[_make_mirror_issue("MI-2")],
            validated_unmatched=[
                ValidationResult(issue_id="MI-2", verdict="false_positive", reasoning="fp", confidence=0.9),
            ],
        )

        scorer = BenchmarkScorer()
        site = scorer._score_site(
            mr,
            [_make_gt_issue("GT-1"), _make_gt_issue("GT-2")],
            [_make_mirror_issue("MI-1"), _make_mirror_issue("MI-2")],
        )

        assert site.site_slug == "my_site"
        assert site.true_positives == 1
        assert site.false_positives == 1
        assert site.false_negatives == 1
        assert site.precision == pytest.approx(0.5)
        assert site.recall == pytest.approx(0.5)
        assert site.total_gt_issues == 2
        assert site.total_mirror_issues == 2


# ---------------------------------------------------------------------------
# Severity Weighted Recall Tests
# ---------------------------------------------------------------------------

class TestSeverityWeightedRecall:
    """Tests for severity-weighted recall computation."""

    def test_all_critical_found(self) -> None:
        """Finding all critical issues produces high weighted recall."""
        gt = [
            _make_gt_issue("GT-1", severity="critical"),
            _make_gt_issue("GT-2", severity="minor"),
            _make_gt_issue("GT-3", severity="minor"),
        ]
        mr = _make_match_result(
            matches=[
                IssueMatch(gt_id="GT-1", mirror_id="MI-1", score=3, reasoning="m"),
            ],
            unmatched_gt=[
                _make_gt_issue("GT-2", severity="minor"),
                _make_gt_issue("GT-3", severity="minor"),
            ],
        )

        scorer = BenchmarkScorer()
        weighted = scorer.compute_severity_weighted_recall(
            [mr], {"test_site": gt}
        )

        # Found: 4 (critical weight). Total: 4 + 2 + 2 = 8
        assert weighted == pytest.approx(4 / 8)

    def test_only_minor_found(self) -> None:
        """Finding only minor issues produces low weighted recall."""
        gt = [
            _make_gt_issue("GT-1", severity="critical"),
            _make_gt_issue("GT-2", severity="minor"),
        ]
        mr = _make_match_result(
            matches=[
                IssueMatch(gt_id="GT-2", mirror_id="MI-1", score=3, reasoning="m"),
            ],
            unmatched_gt=[_make_gt_issue("GT-1", severity="critical")],
        )

        scorer = BenchmarkScorer()
        weighted = scorer.compute_severity_weighted_recall(
            [mr], {"test_site": gt}
        )

        # Found: 2 (minor weight). Total: 4 + 2 = 6
        assert weighted == pytest.approx(2 / 6)


# ---------------------------------------------------------------------------
# Severity Accuracy Tests
# ---------------------------------------------------------------------------

class TestSeverityAccuracy:
    """Tests for severity accuracy computation."""

    def test_all_severities_match(self) -> None:
        """All matched pairs have same severity -> 1.0."""
        mr = _make_match_result(
            matches=[
                IssueMatch(gt_id="GT-1", mirror_id="MI-1", score=3, reasoning="m"),
                IssueMatch(gt_id="GT-2", mirror_id="MI-2", score=3, reasoning="m"),
            ],
            judge_scores=[
                {"gt_id": "GT-1", "gt_severity": "major", "mirror_id": "MI-1", "mirror_severity": "major"},
                {"gt_id": "GT-2", "gt_severity": "minor", "mirror_id": "MI-2", "mirror_severity": "minor"},
            ],
        )

        scorer = BenchmarkScorer()
        accuracy = scorer.compute_severity_accuracy([mr])
        assert accuracy == 1.0

    def test_no_severities_match(self) -> None:
        """No matched pairs have same severity -> 0.0."""
        mr = _make_match_result(
            matches=[
                IssueMatch(gt_id="GT-1", mirror_id="MI-1", score=3, reasoning="m"),
                IssueMatch(gt_id="GT-2", mirror_id="MI-2", score=3, reasoning="m"),
            ],
            judge_scores=[
                {"gt_id": "GT-1", "gt_severity": "critical", "mirror_id": "MI-1", "mirror_severity": "minor"},
                {"gt_id": "GT-2", "gt_severity": "major", "mirror_id": "MI-2", "mirror_severity": "enhancement"},
            ],
        )

        scorer = BenchmarkScorer()
        accuracy = scorer.compute_severity_accuracy([mr])
        assert accuracy == 0.0

    def test_partial_severity_match(self) -> None:
        """Half of matched pairs agree -> 0.5."""
        mr = _make_match_result(
            matches=[
                IssueMatch(gt_id="GT-1", mirror_id="MI-1", score=3, reasoning="m"),
                IssueMatch(gt_id="GT-2", mirror_id="MI-2", score=3, reasoning="m"),
            ],
            judge_scores=[
                {"gt_id": "GT-1", "gt_severity": "major", "mirror_id": "MI-1", "mirror_severity": "major"},
                {"gt_id": "GT-2", "gt_severity": "critical", "mirror_id": "MI-2", "mirror_severity": "minor"},
            ],
        )

        scorer = BenchmarkScorer()
        accuracy = scorer.compute_severity_accuracy([mr])
        assert accuracy == pytest.approx(0.5)

    def test_no_matches_returns_zero(self) -> None:
        """No matches -> severity accuracy is 0.0."""
        mr = _make_match_result()
        scorer = BenchmarkScorer()
        accuracy = scorer.compute_severity_accuracy([mr])
        assert accuracy == 0.0


# ---------------------------------------------------------------------------
# Recall by Severity / Category Tests
# ---------------------------------------------------------------------------

class TestRecallBySeverity:
    """Tests for recall broken down by severity level."""

    def test_recall_by_severity(self) -> None:
        """Severity recall is correct for mixed severities."""
        gt = [
            _make_gt_issue("GT-1", severity="critical"),
            _make_gt_issue("GT-2", severity="critical"),
            _make_gt_issue("GT-3", severity="minor"),
        ]
        mr = _make_match_result(
            matches=[
                IssueMatch(gt_id="GT-1", mirror_id="MI-1", score=3, reasoning="m"),
            ],
            unmatched_gt=[
                _make_gt_issue("GT-2", severity="critical"),
                _make_gt_issue("GT-3", severity="minor"),
            ],
        )

        scorer = BenchmarkScorer()
        by_sev = scorer.compute_recall_by_severity([mr], {"test_site": gt})

        assert by_sev["critical"] == pytest.approx(0.5)
        assert by_sev["minor"] == pytest.approx(0.0)


class TestRecallByCategory:
    """Tests for recall broken down by issue category."""

    def test_recall_by_category(self) -> None:
        """Category recall is correct for mixed categories."""
        gt = [
            _make_gt_issue("GT-1", category="forms"),
            _make_gt_issue("GT-2", category="forms"),
            _make_gt_issue("GT-3", category="navigation"),
        ]
        mr = _make_match_result(
            matches=[
                IssueMatch(gt_id="GT-1", mirror_id="MI-1", score=3, reasoning="m"),
                IssueMatch(gt_id="GT-3", mirror_id="MI-3", score=3, reasoning="m"),
            ],
            unmatched_gt=[_make_gt_issue("GT-2", category="forms")],
        )

        scorer = BenchmarkScorer()
        by_cat = scorer.compute_recall_by_category([mr], {"test_site": gt})

        assert by_cat["forms"] == pytest.approx(0.5)
        assert by_cat["navigation"] == pytest.approx(1.0)


# ---------------------------------------------------------------------------
# ErrorAnalyzer Tests
# ---------------------------------------------------------------------------

class TestErrorAnalyzerFalseNegative:
    """Tests for ErrorAnalyzer.categorize_false_negative."""

    def test_coverage_gap(self) -> None:
        """Page not visited -> COVERAGE_GAP."""
        analyzer = ErrorAnalyzer()
        gt_issue = _make_gt_issue("GT-1", page_url="/settings")
        mode = analyzer.categorize_false_negative(
            gt_issue,
            pages_visited=["/", "/checkout"],
            mirror_issues_on_page=[],
        )
        assert mode == FailureMode.COVERAGE_GAP

    def test_observation_gap(self) -> None:
        """Page visited, no issues found -> OBSERVATION_GAP."""
        analyzer = ErrorAnalyzer()
        gt_issue = _make_gt_issue("GT-1", page_url="/checkout")
        mode = analyzer.categorize_false_negative(
            gt_issue,
            pages_visited=["/", "/checkout"],
            mirror_issues_on_page=[],
        )
        assert mode == FailureMode.OBSERVATION_GAP

    def test_analysis_gap(self) -> None:
        """Issues on page but different ones -> ANALYSIS_GAP."""
        analyzer = ErrorAnalyzer()
        gt_issue = _make_gt_issue("GT-1", page_url="/checkout")
        mirror_on_page = [_make_mirror_issue("MI-1", page_url="/checkout")]
        mode = analyzer.categorize_false_negative(
            gt_issue,
            pages_visited=["/", "/checkout"],
            mirror_issues_on_page=mirror_on_page,
        )
        assert mode == FailureMode.ANALYSIS_GAP

    def test_coverage_gap_with_trailing_slash(self) -> None:
        """Page URL normalization handles trailing slashes."""
        analyzer = ErrorAnalyzer()
        gt_issue = _make_gt_issue("GT-1", page_url="/settings")
        mode = analyzer.categorize_false_negative(
            gt_issue,
            pages_visited=["/settings/"],
            mirror_issues_on_page=[],
        )
        # After normalization, /settings/ becomes /settings, so page IS visited
        assert mode == FailureMode.OBSERVATION_GAP


class TestErrorAnalyzerFalsePositive:
    """Tests for ErrorAnalyzer.categorize_false_positive."""

    def test_short_description_is_generic(self) -> None:
        """Short description (<30 chars) -> GENERIC_COMPLAINT."""
        analyzer = ErrorAnalyzer()
        issue = _make_mirror_issue(
            "MI-1",
            description="Button bad",
            element="button",
        )
        mode = analyzer.categorize_false_positive(issue)
        assert mode == FailureMode.GENERIC_COMPLAINT

    def test_no_element_is_generic(self) -> None:
        """No specific element -> GENERIC_COMPLAINT."""
        analyzer = ErrorAnalyzer()
        issue = _make_mirror_issue(
            "MI-1",
            description="This page has some issues that need attention and fixing",
            element="",
        )
        mode = analyzer.categorize_false_positive(issue)
        assert mode == FailureMode.GENERIC_COMPLAINT

    def test_hedging_language_is_severity_inflation(self) -> None:
        """Hedging language -> SEVERITY_INFLATION."""
        analyzer = ErrorAnalyzer()
        issue = _make_mirror_issue(
            "MI-1",
            description="The button placement could be better for user experience on mobile",
            element="Submit button",
        )
        mode = analyzer.categorize_false_positive(issue)
        assert mode == FailureMode.SEVERITY_INFLATION

    def test_might_is_severity_inflation(self) -> None:
        """'might' in description -> SEVERITY_INFLATION."""
        analyzer = ErrorAnalyzer()
        issue = _make_mirror_issue(
            "MI-1",
            description="Users might have trouble finding the navigation menu on mobile devices",
            element="Navigation menu",
        )
        mode = analyzer.categorize_false_positive(issue)
        assert mode == FailureMode.SEVERITY_INFLATION

    def test_default_is_context_wrong(self) -> None:
        """Normal description and element -> CONTEXT_WRONG."""
        analyzer = ErrorAnalyzer()
        issue = _make_mirror_issue(
            "MI-1",
            description="The search results page shows irrelevant items at the top of the list",
            element="Search results list",
        )
        mode = analyzer.categorize_false_positive(issue)
        assert mode == FailureMode.CONTEXT_WRONG

    def test_none_issue_is_context_wrong(self) -> None:
        """None issue -> CONTEXT_WRONG."""
        analyzer = ErrorAnalyzer()
        mode = analyzer.categorize_false_positive(None)
        assert mode == FailureMode.CONTEXT_WRONG


class TestErrorAnalyzerFullAnalysis:
    """Tests for ErrorAnalyzer.analyze end-to-end."""

    def test_full_analysis(self) -> None:
        """Full analysis categorizes FN and FP correctly."""
        mr = _make_match_result(
            site_slug="site_a",
            unmatched_gt=[
                _make_gt_issue("GT-1", page_url="/settings", severity="critical", category="forms"),
                _make_gt_issue("GT-2", page_url="/checkout", severity="major", category="navigation"),
            ],
            validated_unmatched=[
                ValidationResult(
                    issue_id="MI-fp-1",
                    verdict="false_positive",
                    reasoning="not real",
                    confidence=0.9,
                ),
            ],
            unmatched_mirror=[
                _make_mirror_issue(
                    "MI-fp-1",
                    description="Bad",
                    element="x",
                ),
            ],
        )

        analyzer = ErrorAnalyzer()
        analysis = analyzer.analyze(
            match_results=[mr],
            gt_by_site={"site_a": []},
            mirror_by_site={"site_a": [_make_mirror_issue("MI-1", page_url="/checkout")]},
            pages_visited_by_site={"site_a": ["/", "/checkout"]},
        )

        assert analysis.total_false_negatives == 2
        assert analysis.total_false_positives == 1
        # GT-1 page /settings not visited -> coverage_gap
        assert analysis.fn_by_mode.get("coverage_gap", 0) >= 1
        # GT-2 page /checkout visited, mirror issues there -> analysis_gap
        assert analysis.fn_by_mode.get("analysis_gap", 0) >= 1 or \
               analysis.fn_by_mode.get("observation_gap", 0) >= 1
        # FP has short description -> generic_complaint
        assert analysis.fp_by_mode.get("generic_complaint", 0) >= 1
        # Improvement areas generated
        assert len(analysis.top_improvement_areas) > 0


# ---------------------------------------------------------------------------
# BenchmarkReporter Tests
# ---------------------------------------------------------------------------

class TestBenchmarkReporter:
    """Tests for BenchmarkReporter.generate."""

    def _make_sample_metrics(self) -> BenchmarkMetrics:
        """Create sample metrics for testing report generation."""
        return BenchmarkMetrics(
            precision=0.75,
            recall=0.60,
            f1=0.6667,
            weighted_recall=0.70,
            severity_accuracy=0.80,
            recall_by_severity={"critical": 0.90, "major": 0.60, "minor": 0.40},
            recall_by_category={"forms": 0.80, "navigation": 0.50},
            total_sites=2,
            total_gt_issues=20,
            total_mirror_issues=18,
            total_tp=12,
            total_fp=4,
            total_fn=8,
            per_site=[
                SiteMetrics(
                    site_slug="site_a",
                    precision=0.80,
                    recall=0.70,
                    f1=0.7467,
                    true_positives=7,
                    false_positives=2,
                    false_negatives=3,
                    novel_findings=1,
                    borderline=0,
                    total_gt_issues=10,
                    total_mirror_issues=10,
                ),
                SiteMetrics(
                    site_slug="site_b",
                    precision=0.714,
                    recall=0.50,
                    f1=0.588,
                    true_positives=5,
                    false_positives=2,
                    false_negatives=5,
                    novel_findings=0,
                    borderline=1,
                    total_gt_issues=10,
                    total_mirror_issues=8,
                ),
            ],
        )

    def test_contains_header(self) -> None:
        """Report contains a header with the title."""
        reporter = BenchmarkReporter()
        report = reporter.generate(self._make_sample_metrics())
        assert "# Mirror Benchmark Report" in report

    def test_contains_custom_title(self) -> None:
        """Report uses a custom title when provided."""
        reporter = BenchmarkReporter()
        report = reporter.generate(
            self._make_sample_metrics(),
            title="Custom Title",
        )
        assert "# Custom Title" in report

    def test_contains_precision_recall(self) -> None:
        """Report contains precision and recall numbers."""
        reporter = BenchmarkReporter()
        report = reporter.generate(self._make_sample_metrics())
        assert "75.0%" in report  # precision
        assert "60.0%" in report  # recall

    def test_contains_per_site_table(self) -> None:
        """Report contains the per-site results table."""
        reporter = BenchmarkReporter()
        report = reporter.generate(self._make_sample_metrics())
        assert "Per-Site Results" in report
        assert "site_a" in report
        assert "site_b" in report

    def test_contains_severity_breakdown(self) -> None:
        """Report contains severity recall breakdown."""
        reporter = BenchmarkReporter()
        report = reporter.generate(self._make_sample_metrics())
        assert "Recall by Severity" in report
        assert "critical" in report
        assert "90.0%" in report

    def test_contains_category_breakdown(self) -> None:
        """Report contains category recall breakdown."""
        reporter = BenchmarkReporter()
        report = reporter.generate(self._make_sample_metrics())
        assert "Recall by Category" in report
        assert "forms" in report

    def test_contains_error_analysis_when_provided(self) -> None:
        """Report includes error analysis section when provided."""
        reporter = BenchmarkReporter()
        analysis = ErrorAnalysis(
            total_false_negatives=5,
            total_false_positives=3,
            fn_by_mode={"coverage_gap": 3, "analysis_gap": 2},
            fp_by_mode={"generic_complaint": 2, "context_wrong": 1},
            top_improvement_areas=["Fix coverage", "Fix analysis"],
        )
        report = reporter.generate(
            self._make_sample_metrics(),
            error_analysis=analysis,
        )
        assert "Error Analysis" in report
        assert "coverage_gap" in report
        assert "Fix coverage" in report

    def test_no_error_analysis_when_not_provided(self) -> None:
        """Report omits error analysis section when not provided."""
        reporter = BenchmarkReporter()
        report = reporter.generate(self._make_sample_metrics())
        assert "Error Analysis" not in report

    def test_contains_footer(self) -> None:
        """Report contains the footer."""
        reporter = BenchmarkReporter()
        report = reporter.generate(self._make_sample_metrics())
        assert "Mirror Benchmark Pipeline" in report

    def test_report_is_valid_markdown(self) -> None:
        """Report contains proper markdown headings and tables."""
        reporter = BenchmarkReporter()
        report = reporter.generate(self._make_sample_metrics())
        # Check for markdown table separators
        assert "|-----" in report
        # Check for markdown headings
        assert report.startswith("#")


# ---------------------------------------------------------------------------
# PromptOptimizer Tests
# ---------------------------------------------------------------------------

class TestPromptOptimizer:
    """Tests for PromptOptimizer.suggest."""

    def test_coverage_gap_suggests_navigation(self) -> None:
        """Coverage gaps produce navigation prompt suggestions."""
        analysis = ErrorAnalysis(
            fn_by_mode={"coverage_gap": 5},
            fp_by_mode={},
        )
        optimizer = PromptOptimizer()
        suggestions = optimizer.suggest(analysis)

        assert len(suggestions) >= 1
        assert suggestions[0]["mode"] == "coverage_gap"
        assert suggestions[0]["target"] == "navigation_system_prompt"
        assert suggestions[0]["count"] == 5

    def test_returns_top_3_sorted_by_frequency(self) -> None:
        """Suggestions are sorted by frequency, limited to top 3."""
        analysis = ErrorAnalysis(
            fn_by_mode={
                "coverage_gap": 10,
                "observation_gap": 5,
                "analysis_gap": 3,
                "classification_gap": 1,
            },
            fp_by_mode={
                "generic_complaint": 7,
            },
        )
        optimizer = PromptOptimizer()
        suggestions = optimizer.suggest(analysis)

        assert len(suggestions) == 3
        # Sorted by count: coverage_gap(10), generic_complaint(7), observation_gap(5)
        assert suggestions[0]["count"] == 10
        assert suggestions[1]["count"] == 7
        assert suggestions[2]["count"] == 5

    def test_empty_analysis_returns_empty(self) -> None:
        """Empty error analysis returns no suggestions."""
        analysis = ErrorAnalysis()
        optimizer = PromptOptimizer()
        suggestions = optimizer.suggest(analysis)
        assert suggestions == []

    def test_includes_also_consider(self) -> None:
        """Suggestions include the also_consider field."""
        analysis = ErrorAnalysis(
            fn_by_mode={"coverage_gap": 3},
            fp_by_mode={},
        )
        optimizer = PromptOptimizer()
        suggestions = optimizer.suggest(analysis)
        assert suggestions[0]["also_consider"] is not None

    def test_mixed_fn_fp_modes(self) -> None:
        """Suggestions combine FN and FP modes sorted by count."""
        analysis = ErrorAnalysis(
            fn_by_mode={"analysis_gap": 2},
            fp_by_mode={"severity_inflation": 8},
        )
        optimizer = PromptOptimizer()
        suggestions = optimizer.suggest(analysis)

        assert len(suggestions) == 2
        # severity_inflation(8) should be first
        assert suggestions[0]["mode"] == "severity_inflation"
        assert suggestions[0]["type"] == "false_positive"
        assert suggestions[1]["mode"] == "analysis_gap"
        assert suggestions[1]["type"] == "false_negative"


# ---------------------------------------------------------------------------
# BenchmarkMetrics.to_dict Tests
# ---------------------------------------------------------------------------

class TestBenchmarkMetricsSerialize:
    """Tests for BenchmarkMetrics serialization."""

    def test_to_dict_roundtrip(self) -> None:
        """Metrics can be serialized and key fields are preserved."""
        metrics = BenchmarkMetrics(
            precision=0.8,
            recall=0.6,
            f1=0.685,
            total_sites=1,
            total_tp=5,
            total_fp=1,
            total_fn=3,
            per_site=[
                SiteMetrics(
                    site_slug="test",
                    precision=0.8,
                    recall=0.6,
                    f1=0.685,
                    true_positives=5,
                    false_positives=1,
                    false_negatives=3,
                    novel_findings=0,
                    borderline=0,
                    total_gt_issues=8,
                    total_mirror_issues=6,
                ),
            ],
        )
        d = metrics.to_dict()
        assert d["precision"] == 0.8
        assert d["recall"] == 0.6
        assert len(d["per_site"]) == 1
        assert d["per_site"][0]["site_slug"] == "test"
