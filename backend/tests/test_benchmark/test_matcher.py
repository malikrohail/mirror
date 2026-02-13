"""Tests for the benchmark matcher: judge, validator, and schema."""

from __future__ import annotations

import json

import pytest

from benchmark.matcher.judge import IssueMatcher, MockLLMJudge
from benchmark.matcher.schema import (
    IssueMatch,
    JudgeScore,
    MatchResult,
    ValidationResult,
)
from benchmark.matcher.validator import FalsePositiveValidator, MockFPValidator


# ──────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────


@pytest.fixture
def mock_judge() -> MockLLMJudge:
    """Provide a MockLLMJudge instance."""
    return MockLLMJudge()


@pytest.fixture
def matcher() -> IssueMatcher:
    """Provide an IssueMatcher with the default mock judge."""
    return IssueMatcher()


@pytest.fixture
def fp_validator() -> FalsePositiveValidator:
    """Provide a FalsePositiveValidator with the default mock judge."""
    return FalsePositiveValidator()


@pytest.fixture
def mock_fp_validator() -> MockFPValidator:
    """Provide a MockFPValidator instance."""
    return MockFPValidator()


def _make_gt_issue(
    id: str = "GT-test-001",
    page_url: str = "/checkout",
    element: str = "submit button",
    description: str = "Submit button is too small to click",
    severity: str = "major",
    heuristic: str | None = "H7",
) -> dict:
    """Create a ground truth issue dict for testing."""
    return {
        "id": id,
        "page_url": page_url,
        "element": element,
        "description": description,
        "severity": severity,
        "heuristic": heuristic,
    }


def _make_mirror_issue(
    id: str = "MI-test0001-001",
    page_url: str = "/checkout",
    element: str = "submit button",
    description: str = "The submit button is very small and hard to tap",
    severity: str = "major",
    heuristic: str | None = "H7",
    recommendation: str | None = "Increase button size to at least 44x44px",
    persona_role: str = "low-tech-elderly",
    emotional_state: str = "frustrated",
    task_progress: float = 20.0,
    session_completed: bool = False,
    personas_also_found: int = 1,
) -> dict:
    """Create a Mirror issue dict for testing."""
    return {
        "id": id,
        "page_url": page_url,
        "element": element,
        "description": description,
        "severity": severity,
        "heuristic": heuristic,
        "recommendation": recommendation,
        "persona_role": persona_role,
        "emotional_state": emotional_state,
        "task_progress": task_progress,
        "session_completed": session_completed,
        "personas_also_found": personas_also_found,
    }


# ──────────────────────────────────────────────────────────────────
# MockLLMJudge tests
# ──────────────────────────────────────────────────────────────────


class TestMockLLMJudge:
    """Tests for the MockLLMJudge string similarity implementation."""

    async def test_identical_descriptions_high_score(self, mock_judge: MockLLMJudge) -> None:
        """Identical descriptions should produce score 3."""
        from benchmark.matcher.prompts import JUDGE_SYSTEM_PROMPT, JUDGE_USER_PROMPT

        prompt = JUDGE_USER_PROMPT.format(
            site_url="https://example.com",
            source_a="ground truth",
            page_url_a="/checkout",
            element_a="submit button",
            description_a="Submit button is too small to click",
            severity_a="major",
            heuristic_a="H7",
            source_b="mirror",
            page_url_b="/checkout",
            element_b="submit button",
            description_b="Submit button is too small to click",
            severity_b="major",
            heuristic_b="H7",
        )
        response = await mock_judge.judge_pair(JUDGE_SYSTEM_PROMPT, prompt)
        data = json.loads(response)
        assert data["score"] == 3

    async def test_similar_descriptions_moderate_score(self, mock_judge: MockLLMJudge) -> None:
        """Similar but not identical descriptions should produce score 2 or 3."""
        from benchmark.matcher.prompts import JUDGE_SYSTEM_PROMPT, JUDGE_USER_PROMPT

        prompt = JUDGE_USER_PROMPT.format(
            site_url="https://example.com",
            source_a="ground truth",
            page_url_a="/checkout",
            element_a="submit button",
            description_a="Submit button is too small to click",
            severity_a="major",
            heuristic_a="H7",
            source_b="mirror",
            page_url_b="/checkout",
            element_b="submit button",
            description_b="The submit button is very small and hard to tap",
            severity_b="major",
            heuristic_b="H7",
        )
        response = await mock_judge.judge_pair(JUDGE_SYSTEM_PROMPT, prompt)
        data = json.loads(response)
        assert data["score"] >= 2

    async def test_completely_different_low_score(self, mock_judge: MockLLMJudge) -> None:
        """Completely unrelated issues should produce score 0 or 1."""
        from benchmark.matcher.prompts import JUDGE_SYSTEM_PROMPT, JUDGE_USER_PROMPT

        prompt = JUDGE_USER_PROMPT.format(
            site_url="https://example.com",
            source_a="ground truth",
            page_url_a="/checkout",
            element_a="submit button",
            description_a="Submit button is too small to click",
            severity_a="major",
            heuristic_a="H7",
            source_b="mirror",
            page_url_b="/about",
            element_b="hero image",
            description_b="Hero image is missing alt text for screen readers",
            severity_b="minor",
            heuristic_b="H4",
        )
        response = await mock_judge.judge_pair(JUDGE_SYSTEM_PROMPT, prompt)
        data = json.loads(response)
        assert data["score"] <= 1

    async def test_response_is_valid_json(self, mock_judge: MockLLMJudge) -> None:
        """Mock response should always be valid JSON with required fields."""
        from benchmark.matcher.prompts import JUDGE_SYSTEM_PROMPT, JUDGE_USER_PROMPT

        prompt = JUDGE_USER_PROMPT.format(
            site_url="https://example.com",
            source_a="ground truth",
            page_url_a="/",
            element_a="nav",
            description_a="Navigation is confusing",
            severity_a="minor",
            heuristic_a="N/A",
            source_b="mirror",
            page_url_b="/",
            element_b="menu",
            description_b="Menu layout is unclear",
            severity_b="minor",
            heuristic_b="N/A",
        )
        response = await mock_judge.judge_pair(JUDGE_SYSTEM_PROMPT, prompt)
        data = json.loads(response)
        assert "score" in data
        assert "reasoning" in data
        assert isinstance(data["score"], int)
        assert 0 <= data["score"] <= 3

    async def test_extract_descriptions(self, mock_judge: MockLLMJudge) -> None:
        """Verify description extraction from formatted prompt."""
        prompt = (
            "ISSUE A (from ground truth):\n"
            "  Page: /checkout\n"
            "  Element: button\n"
            "  Description: Button is too small\n"
            "  Severity: major\n"
            "  Heuristic: H7\n\n"
            "ISSUE B (from mirror):\n"
            "  Page: /checkout\n"
            "  Element: button\n"
            "  Description: Button needs to be larger\n"
            "  Severity: major\n"
            "  Heuristic: H7\n"
        )
        desc_a, desc_b = mock_judge._extract_descriptions(prompt)
        assert desc_a == "Button is too small"
        assert desc_b == "Button needs to be larger"


# ──────────────────────────────────────────────────────────────────
# IssueMatcher._pages_could_match tests
# ──────────────────────────────────────────────────────────────────


class TestPagesCouldMatch:
    """Tests for IssueMatcher._pages_could_match."""

    def test_exact_match(self, matcher: IssueMatcher) -> None:
        """Exact page path match should return True."""
        assert matcher._pages_could_match("/checkout", "/checkout") is True

    def test_exact_match_with_full_url(self, matcher: IssueMatcher) -> None:
        """Full URLs with matching paths should return True."""
        assert matcher._pages_could_match(
            "https://example.com/checkout",
            "https://other.com/checkout",
        ) is True

    def test_homepage_wildcard(self, matcher: IssueMatcher) -> None:
        """Ground truth '/' should match any page."""
        assert matcher._pages_could_match("/", "/about") is True
        assert matcher._pages_could_match("/", "/checkout") is True
        assert matcher._pages_could_match("/", "/products/shoes") is True

    def test_different_pages(self, matcher: IssueMatcher) -> None:
        """Completely different top-level paths should return False."""
        assert matcher._pages_could_match("/cart", "/profile") is False

    def test_similar_paths_shared_prefix(self, matcher: IssueMatcher) -> None:
        """Pages sharing first path segment should return True."""
        assert matcher._pages_could_match("/products/shoes", "/products/hats") is True

    def test_root_vs_root(self, matcher: IssueMatcher) -> None:
        """Both root pages should match."""
        assert matcher._pages_could_match("/", "/") is True

    def test_trailing_slash_normalization(self, matcher: IssueMatcher) -> None:
        """Trailing slashes should be stripped for matching."""
        assert matcher._pages_could_match("/checkout/", "/checkout") is True
        assert matcher._pages_could_match("/checkout", "/checkout/") is True

    def test_empty_string_treated_as_root(self, matcher: IssueMatcher) -> None:
        """Empty string should be treated as root '/'."""
        assert matcher._pages_could_match("", "/about") is True
        assert matcher._pages_could_match("", "") is True

    def test_non_matching_single_segments(self, matcher: IssueMatcher) -> None:
        """Single segments that differ should not match."""
        assert matcher._pages_could_match("/login", "/signup") is False

    def test_homepage_wildcard_only_for_gt(self, matcher: IssueMatcher) -> None:
        """Only ground truth '/' is a wildcard; Mirror '/' matching GT '/about' needs shared prefix."""
        # GT="/about", mirror="/" -> "/" normalizes to "/"
        # gt_segments=["about"], mi_segments=[] (root has no segments)
        # No shared first segment, and gt_path != "/"
        assert matcher._pages_could_match("/about", "/") is False


# ──────────────────────────────────────────────────────────────────
# IssueMatcher._parse_judge_response tests
# ──────────────────────────────────────────────────────────────────


class TestParseJudgeResponse:
    """Tests for IssueMatcher._parse_judge_response."""

    def test_valid_json(self) -> None:
        """Valid JSON with all fields should parse correctly."""
        response = json.dumps({
            "score": 3,
            "reasoning": "Same button, same problem.",
            "matched_aspect": "submit button size",
            "difference": None,
        })
        result = IssueMatcher._parse_judge_response(response)
        assert isinstance(result, JudgeScore)
        assert result.score == 3
        assert result.reasoning == "Same button, same problem."
        assert result.matched_aspect == "submit button size"
        assert result.difference is None

    def test_invalid_json(self) -> None:
        """Invalid JSON should return default score 0."""
        result = IssueMatcher._parse_judge_response("not valid json at all")
        assert result.score == 0
        assert "Failed to parse" in result.reasoning

    def test_missing_fields_use_defaults(self) -> None:
        """JSON with missing optional fields should use defaults."""
        response = json.dumps({"score": 2})
        result = IssueMatcher._parse_judge_response(response)
        assert result.score == 2
        assert result.reasoning == ""
        assert result.matched_aspect is None
        assert result.difference is None

    def test_empty_string(self) -> None:
        """Empty string should return default score 0."""
        result = IssueMatcher._parse_judge_response("")
        assert result.score == 0

    def test_partial_json(self) -> None:
        """Truncated JSON should return default score 0."""
        result = IssueMatcher._parse_judge_response('{"score": 2, "reasoning":')
        assert result.score == 0
        assert "Failed to parse" in result.reasoning

    def test_non_integer_score_converted(self) -> None:
        """Score as float should be converted to int."""
        response = json.dumps({"score": 2.7, "reasoning": "Close match"})
        result = IssueMatcher._parse_judge_response(response)
        assert result.score == 2
        assert isinstance(result.score, int)


# ──────────────────────────────────────────────────────────────────
# IssueMatcher._greedy_assign tests
# ──────────────────────────────────────────────────────────────────


class TestGreedyAssign:
    """Tests for IssueMatcher._greedy_assign."""

    def test_simple_two_by_two(self, matcher: IssueMatcher) -> None:
        """Simple case: 2 GT, 2 MI, clear matches."""
        score_matrix = {
            "GT-001": {
                "MI-001": JudgeScore(score=3, reasoning="Exact match"),
                "MI-002": JudgeScore(score=0, reasoning="No match"),
            },
            "GT-002": {
                "MI-001": JudgeScore(score=1, reasoning="Partial"),
                "MI-002": JudgeScore(score=2, reasoning="Substantial match"),
            },
        }
        matches = matcher._greedy_assign(
            score_matrix,
            ["GT-001", "GT-002"],
            ["MI-001", "MI-002"],
        )
        assert len(matches) == 2
        match_map = {m.gt_id: m.mirror_id for m in matches}
        assert match_map["GT-001"] == "MI-001"
        assert match_map["GT-002"] == "MI-002"

    def test_conflict_higher_score_wins(self, matcher: IssueMatcher) -> None:
        """When 2 GT issues both want the same MI, the higher score wins."""
        score_matrix = {
            "GT-001": {
                "MI-001": JudgeScore(score=2, reasoning="Good match"),
            },
            "GT-002": {
                "MI-001": JudgeScore(score=3, reasoning="Better match"),
            },
        }
        matches = matcher._greedy_assign(
            score_matrix,
            ["GT-001", "GT-002"],
            ["MI-001"],
        )
        assert len(matches) == 1
        assert matches[0].gt_id == "GT-002"
        assert matches[0].mirror_id == "MI-001"
        assert matches[0].score == 3

    def test_no_matches_all_below_threshold(self, matcher: IssueMatcher) -> None:
        """All scores below threshold should produce no matches."""
        score_matrix = {
            "GT-001": {
                "MI-001": JudgeScore(score=1, reasoning="Partial only"),
                "MI-002": JudgeScore(score=0, reasoning="No match"),
            },
            "GT-002": {
                "MI-001": JudgeScore(score=0, reasoning="No match"),
                "MI-002": JudgeScore(score=1, reasoning="Partial only"),
            },
        }
        matches = matcher._greedy_assign(
            score_matrix,
            ["GT-001", "GT-002"],
            ["MI-001", "MI-002"],
        )
        assert len(matches) == 0

    def test_partial_matches(self, matcher: IssueMatcher) -> None:
        """Some issues match, others don't."""
        score_matrix = {
            "GT-001": {
                "MI-001": JudgeScore(score=3, reasoning="Exact"),
                "MI-002": JudgeScore(score=0, reasoning="None"),
            },
            "GT-002": {
                "MI-001": JudgeScore(score=0, reasoning="None"),
                "MI-002": JudgeScore(score=1, reasoning="Partial only"),
            },
        }
        matches = matcher._greedy_assign(
            score_matrix,
            ["GT-001", "GT-002"],
            ["MI-001", "MI-002"],
        )
        assert len(matches) == 1
        assert matches[0].gt_id == "GT-001"
        assert matches[0].mirror_id == "MI-001"

    def test_empty_score_matrix(self, matcher: IssueMatcher) -> None:
        """Empty score matrix should produce no matches."""
        matches = matcher._greedy_assign({}, ["GT-001"], ["MI-001"])
        assert len(matches) == 0

    def test_one_gt_multiple_mi(self, matcher: IssueMatcher) -> None:
        """One GT issue should match at most one MI issue."""
        score_matrix = {
            "GT-001": {
                "MI-001": JudgeScore(score=2, reasoning="Match 1"),
                "MI-002": JudgeScore(score=3, reasoning="Match 2"),
                "MI-003": JudgeScore(score=2, reasoning="Match 3"),
            },
        }
        matches = matcher._greedy_assign(
            score_matrix,
            ["GT-001"],
            ["MI-001", "MI-002", "MI-003"],
        )
        assert len(matches) == 1
        assert matches[0].mirror_id == "MI-002"  # Highest score


# ──────────────────────────────────────────────────────────────────
# Full match_site tests with mock judge
# ──────────────────────────────────────────────────────────────────


class TestMatchSite:
    """Tests for IssueMatcher.match_site end-to-end with mock judge."""

    async def test_matching_issues_found(self, matcher: IssueMatcher) -> None:
        """Issues with similar descriptions on the same page should match."""
        gt_issues = [
            _make_gt_issue(
                id="GT-test-001",
                page_url="/checkout",
                element="submit button",
                description="Submit button is too small to click",
            ),
        ]
        mirror_issues = [
            _make_mirror_issue(
                id="MI-test0001-001",
                page_url="/checkout",
                element="submit button",
                description="The submit button is very small and hard to tap",
            ),
        ]
        result = await matcher.match_site(
            gt_issues, mirror_issues, "test_site", "https://example.com"
        )
        assert isinstance(result, MatchResult)
        assert len(result.matches) == 1
        assert result.matches[0].gt_id == "GT-test-001"
        assert result.matches[0].mirror_id == "MI-test0001-001"
        assert result.matches[0].score >= 2

    async def test_unmatched_issues_tracked(self, matcher: IssueMatcher) -> None:
        """Issues with no match should appear in unmatched lists."""
        gt_issues = [
            _make_gt_issue(
                id="GT-test-001",
                page_url="/checkout",
                element="submit button",
                description="Submit button is too small to click",
            ),
            _make_gt_issue(
                id="GT-test-002",
                page_url="/login",
                element="password field",
                description="Password field has no visibility toggle",
            ),
        ]
        mirror_issues = [
            _make_mirror_issue(
                id="MI-test0001-001",
                page_url="/about",
                element="hero image",
                description="Hero image is missing alt text for screen readers",
            ),
        ]
        result = await matcher.match_site(
            gt_issues, mirror_issues, "test_site", "https://example.com"
        )
        # Different pages: /checkout and /login don't share prefix with /about
        assert len(result.matches) == 0
        assert len(result.unmatched_gt) == 2
        assert len(result.unmatched_mirror) == 1

    async def test_empty_gt_issues(self, matcher: IssueMatcher) -> None:
        """Empty ground truth should produce all Mirror issues as unmatched."""
        mirror_issues = [
            _make_mirror_issue(id="MI-test0001-001"),
        ]
        result = await matcher.match_site(
            [], mirror_issues, "test_site", "https://example.com"
        )
        assert len(result.matches) == 0
        assert len(result.unmatched_gt) == 0
        assert len(result.unmatched_mirror) == 1

    async def test_empty_mirror_issues(self, matcher: IssueMatcher) -> None:
        """Empty Mirror issues should produce all GT issues as unmatched."""
        gt_issues = [_make_gt_issue(id="GT-test-001")]
        result = await matcher.match_site(
            gt_issues, [], "test_site", "https://example.com"
        )
        assert len(result.matches) == 0
        assert len(result.unmatched_gt) == 1
        assert len(result.unmatched_mirror) == 0

    async def test_both_empty(self, matcher: IssueMatcher) -> None:
        """Both empty should produce empty result."""
        result = await matcher.match_site(
            [], [], "test_site", "https://example.com"
        )
        assert len(result.matches) == 0
        assert len(result.unmatched_gt) == 0
        assert len(result.unmatched_mirror) == 0

    async def test_multiple_matches(self, matcher: IssueMatcher) -> None:
        """Multiple matching pairs should all be found."""
        gt_issues = [
            _make_gt_issue(
                id="GT-test-001",
                page_url="/checkout",
                element="submit button",
                description="Submit button is too small to click",
            ),
            _make_gt_issue(
                id="GT-test-002",
                page_url="/checkout",
                element="error message",
                description="Error message disappears too quickly",
            ),
        ]
        mirror_issues = [
            _make_mirror_issue(
                id="MI-test0001-001",
                page_url="/checkout",
                element="submit button",
                description="The submit button is very small and hard to tap",
            ),
            _make_mirror_issue(
                id="MI-test0001-002",
                page_url="/checkout",
                element="error message",
                description="Error message disappears before user can read it",
            ),
        ]
        result = await matcher.match_site(
            gt_issues, mirror_issues, "test_site", "https://example.com"
        )
        assert len(result.matches) == 2
        matched_gt_ids = {m.gt_id for m in result.matches}
        assert "GT-test-001" in matched_gt_ids
        assert "GT-test-002" in matched_gt_ids

    async def test_judge_scores_recorded(self, matcher: IssueMatcher) -> None:
        """All pairwise judge scores should be recorded for analysis."""
        gt_issues = [_make_gt_issue(id="GT-test-001", page_url="/checkout")]
        mirror_issues = [
            _make_mirror_issue(id="MI-test0001-001", page_url="/checkout"),
        ]
        result = await matcher.match_site(
            gt_issues, mirror_issues, "test_site", "https://example.com"
        )
        assert len(result.judge_scores) >= 1
        for score_entry in result.judge_scores:
            assert "gt_id" in score_entry
            assert "mirror_id" in score_entry
            assert "score" in score_entry
            assert "reasoning" in score_entry

    async def test_site_slug_preserved(self, matcher: IssueMatcher) -> None:
        """Site slug should be preserved in the result."""
        result = await matcher.match_site(
            [], [], "my_special_site", "https://special.com"
        )
        assert result.site_slug == "my_special_site"


# ──────────────────────────────────────────────────────────────────
# FalsePositiveValidator tests
# ──────────────────────────────────────────────────────────────────


class TestFalsePositiveValidator:
    """Tests for the FalsePositiveValidator with mock judge."""

    async def test_validate_single_issue(self, fp_validator: FalsePositiveValidator) -> None:
        """Should return a ValidationResult for a single issue."""
        issues = [
            _make_mirror_issue(
                id="MI-fp-001",
                description="Submit button is too small to click on mobile devices",
                element="submit button",
                recommendation="Increase button tap target to 44x44px",
            ),
        ]
        results = await fp_validator.validate_issues(issues, "https://example.com")
        assert len(results) == 1
        assert isinstance(results[0], ValidationResult)
        assert results[0].issue_id == "MI-fp-001"
        assert results[0].verdict in ("real", "borderline", "false_positive")

    async def test_validate_empty_list(self, fp_validator: FalsePositiveValidator) -> None:
        """Empty list should return empty results."""
        results = await fp_validator.validate_issues([], "https://example.com")
        assert results == []

    async def test_validate_multiple_issues(self, fp_validator: FalsePositiveValidator) -> None:
        """Should return one ValidationResult per issue."""
        issues = [
            _make_mirror_issue(id="MI-fp-001"),
            _make_mirror_issue(id="MI-fp-002", description="Another issue here"),
        ]
        results = await fp_validator.validate_issues(issues, "https://example.com")
        assert len(results) == 2
        result_ids = {r.issue_id for r in results}
        assert "MI-fp-001" in result_ids
        assert "MI-fp-002" in result_ids


# ──────────────────────────────────────────────────────────────────
# MockFPValidator tests
# ──────────────────────────────────────────────────────────────────


class TestMockFPValidator:
    """Tests for the MockFPValidator heuristic-based classification."""

    async def test_specific_element_with_recommendation_is_real(
        self, mock_fp_validator: MockFPValidator
    ) -> None:
        """Issue with specific element and detailed recommendation should be 'real'."""
        issues = [
            {
                "id": "MI-real-001",
                "element": "submit button in checkout form",
                "description": "The submit button lacks sufficient color contrast against the background",
                "recommendation": "Change the button background color to achieve at least 4.5:1 contrast ratio",
            },
        ]
        results = await mock_fp_validator.validate_issues(issues, "https://example.com")
        assert len(results) == 1
        assert results[0].verdict == "real"

    async def test_short_description_is_false_positive(
        self, mock_fp_validator: MockFPValidator
    ) -> None:
        """Issue with very short description should be 'false_positive'."""
        issues = [
            {
                "id": "MI-fp-001",
                "element": "button",
                "description": "Looks bad",
                "recommendation": None,
            },
        ]
        results = await mock_fp_validator.validate_issues(issues, "https://example.com")
        assert len(results) == 1
        assert results[0].verdict == "false_positive"

    async def test_empty_description_is_false_positive(
        self, mock_fp_validator: MockFPValidator
    ) -> None:
        """Issue with empty description should be 'false_positive'."""
        issues = [
            {
                "id": "MI-fp-002",
                "element": "div",
                "description": "",
                "recommendation": None,
            },
        ]
        results = await mock_fp_validator.validate_issues(issues, "https://example.com")
        assert len(results) == 1
        assert results[0].verdict == "false_positive"

    async def test_moderate_description_no_recommendation_is_borderline(
        self, mock_fp_validator: MockFPValidator
    ) -> None:
        """Issue with reasonable description but no recommendation should be 'borderline'."""
        issues = [
            {
                "id": "MI-bl-001",
                "element": "navigation menu at the top of the page",
                "description": "The navigation menu is somewhat confusing for first-time visitors",
                "recommendation": "",
            },
        ]
        results = await mock_fp_validator.validate_issues(issues, "https://example.com")
        assert len(results) == 1
        assert results[0].verdict == "borderline"

    async def test_empty_input_returns_empty(
        self, mock_fp_validator: MockFPValidator
    ) -> None:
        """Empty input should return empty results."""
        results = await mock_fp_validator.validate_issues([], "https://example.com")
        assert results == []

    async def test_missing_fields_handled_gracefully(
        self, mock_fp_validator: MockFPValidator
    ) -> None:
        """Issues with missing fields should not crash."""
        issues = [{"id": "MI-partial-001"}]
        results = await mock_fp_validator.validate_issues(issues, "https://example.com")
        assert len(results) == 1
        # Empty description -> false_positive
        assert results[0].verdict == "false_positive"


# ──────────────────────────────────────────────────────────────────
# MatchResult property tests
# ──────────────────────────────────────────────────────────────────


class TestMatchResultProperties:
    """Tests for MatchResult computed properties."""

    def test_true_positives_from_matches_only(self) -> None:
        """True positives should count matched issues."""
        result = MatchResult(
            site_slug="test",
            matches=[
                IssueMatch(gt_id="GT-001", mirror_id="MI-001", score=3, reasoning="Match"),
                IssueMatch(gt_id="GT-002", mirror_id="MI-002", score=2, reasoning="Match"),
            ],
        )
        assert result.true_positives == 2

    def test_true_positives_includes_validated_real(self) -> None:
        """True positives should also count validated-as-real unmatched Mirror issues."""
        result = MatchResult(
            site_slug="test",
            matches=[
                IssueMatch(gt_id="GT-001", mirror_id="MI-001", score=3, reasoning="Match"),
            ],
            validated_unmatched=[
                ValidationResult(issue_id="MI-002", verdict="real", reasoning="Real", confidence=0.9),
                ValidationResult(issue_id="MI-003", verdict="false_positive", reasoning="FP", confidence=0.8),
            ],
        )
        assert result.true_positives == 2  # 1 match + 1 validated real

    def test_false_positives(self) -> None:
        """False positives should count validated-as-false-positive issues."""
        result = MatchResult(
            site_slug="test",
            validated_unmatched=[
                ValidationResult(issue_id="MI-001", verdict="false_positive", reasoning="FP", confidence=0.8),
                ValidationResult(issue_id="MI-002", verdict="false_positive", reasoning="FP", confidence=0.7),
                ValidationResult(issue_id="MI-003", verdict="real", reasoning="Real", confidence=0.9),
                ValidationResult(issue_id="MI-004", verdict="borderline", reasoning="Maybe", confidence=0.5),
            ],
        )
        assert result.false_positives == 2

    def test_false_negatives(self) -> None:
        """False negatives should count unmatched ground truth issues."""
        result = MatchResult(
            site_slug="test",
            unmatched_gt=[
                {"id": "GT-001", "description": "Issue 1"},
                {"id": "GT-002", "description": "Issue 2"},
                {"id": "GT-003", "description": "Issue 3"},
            ],
        )
        assert result.false_negatives == 3

    def test_all_zero_when_empty(self) -> None:
        """Empty result should have all zero metrics."""
        result = MatchResult(site_slug="test")
        assert result.true_positives == 0
        assert result.false_positives == 0
        assert result.false_negatives == 0

    def test_to_dict_includes_computed_properties(self) -> None:
        """to_dict should include computed TP/FP/FN counts."""
        result = MatchResult(
            site_slug="test",
            matches=[
                IssueMatch(gt_id="GT-001", mirror_id="MI-001", score=3, reasoning="Match"),
            ],
            unmatched_gt=[{"id": "GT-002"}],
            validated_unmatched=[
                ValidationResult(issue_id="MI-002", verdict="false_positive", reasoning="FP", confidence=0.8),
            ],
        )
        d = result.to_dict()
        assert d["true_positives"] == 1
        assert d["false_positives"] == 1
        assert d["false_negatives"] == 1
        assert d["site_slug"] == "test"
        assert len(d["matches"]) == 1
        assert len(d["unmatched_gt"]) == 1
        assert len(d["validated_unmatched"]) == 1


# ──────────────────────────────────────────────────────────────────
# Schema serialization tests
# ──────────────────────────────────────────────────────────────────


class TestSchemasSerialization:
    """Tests for dataclass serialization."""

    def test_judge_score_to_dict(self) -> None:
        score = JudgeScore(
            score=3,
            reasoning="Exact match",
            matched_aspect="button size",
            difference=None,
        )
        d = score.to_dict()
        assert d["score"] == 3
        assert d["reasoning"] == "Exact match"
        assert d["matched_aspect"] == "button size"
        assert d["difference"] is None

    def test_validation_result_to_dict(self) -> None:
        result = ValidationResult(
            issue_id="MI-001",
            verdict="real",
            reasoning="Specific and actionable",
            confidence=0.9,
        )
        d = result.to_dict()
        assert d["issue_id"] == "MI-001"
        assert d["verdict"] == "real"
        assert d["confidence"] == 0.9

    def test_issue_match_to_dict(self) -> None:
        match = IssueMatch(
            gt_id="GT-001",
            mirror_id="MI-001",
            score=3,
            reasoning="Same problem",
        )
        d = match.to_dict()
        assert d["gt_id"] == "GT-001"
        assert d["mirror_id"] == "MI-001"
        assert d["score"] == 3

    def test_match_result_to_dict_round_trip(self) -> None:
        """MatchResult should serialize to JSON and back."""
        result = MatchResult(
            site_slug="test",
            matches=[IssueMatch("GT-001", "MI-001", 3, "Match")],
            unmatched_gt=[{"id": "GT-002"}],
            unmatched_mirror=[{"id": "MI-002"}],
            validated_unmatched=[
                ValidationResult("MI-003", "real", "Real issue", 0.9),
            ],
            judge_scores=[{"gt_id": "GT-001", "mirror_id": "MI-001", "score": 3}],
        )
        d = result.to_dict()
        serialized = json.dumps(d)
        deserialized = json.loads(serialized)
        assert deserialized["site_slug"] == "test"
        assert deserialized["true_positives"] == 2  # 1 match + 1 validated real
        assert deserialized["false_negatives"] == 1
