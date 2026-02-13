"""Tests for the ground truth corpus: schema, loader, and normalizer."""

from __future__ import annotations

import json
import re

import pytest

from benchmark.ground_truth.loader import (
    get_available_sites,
    load_all_issues,
    load_site_config,
    load_site_issues,
    validate_issue,
)
from benchmark.ground_truth.schema import (
    VALID_CATEGORIES,
    VALID_SEVERITIES,
    BenchmarkSiteConfig,
    GroundTruthIssue,
)
from benchmark.executor.normalizer import (
    NormalizedIssue,
    classify_element_type,
    classify_problem_category,
    normalize_gt_issue,
    normalize_mirror_issue,
    normalize_page_url,
)

from tests.test_benchmark.conftest import EXPECTED_ISSUE_COUNTS, EXPECTED_SITES


# ─── Schema Tests ───────────────────────────────────────────────────


class TestGroundTruthIssue:
    """Tests for the GroundTruthIssue dataclass."""

    def test_create_issue(self, gt_sample_issue: GroundTruthIssue) -> None:
        """A GroundTruthIssue can be created with all required fields."""
        assert gt_sample_issue.id == "GT-test_site-001"
        assert gt_sample_issue.severity == "major"
        assert gt_sample_issue.category == "visual"
        assert gt_sample_issue.still_present is True

    def test_to_dict(self, gt_sample_issue: GroundTruthIssue) -> None:
        """to_dict produces a plain dictionary with all fields."""
        d = gt_sample_issue.to_dict()
        assert isinstance(d, dict)
        assert d["id"] == "GT-test_site-001"
        assert d["site_slug"] == "test_site"
        assert d["severity"] == "major"
        assert d["tags"] == ["mobile", "visibility"]

    def test_from_dict(self, gt_sample_issue_dict: dict) -> None:
        """from_dict reconstructs a GroundTruthIssue from a dictionary."""
        issue = GroundTruthIssue.from_dict(gt_sample_issue_dict)
        assert isinstance(issue, GroundTruthIssue)
        assert issue.id == gt_sample_issue_dict["id"]
        assert issue.severity == gt_sample_issue_dict["severity"]

    def test_round_trip(self, gt_sample_issue: GroundTruthIssue) -> None:
        """to_dict followed by from_dict produces an identical issue."""
        d = gt_sample_issue.to_dict()
        restored = GroundTruthIssue.from_dict(d)
        assert restored.id == gt_sample_issue.id
        assert restored.site_slug == gt_sample_issue.site_slug
        assert restored.page_url == gt_sample_issue.page_url
        assert restored.page_pattern == gt_sample_issue.page_pattern
        assert restored.element == gt_sample_issue.element
        assert restored.description == gt_sample_issue.description
        assert restored.severity == gt_sample_issue.severity
        assert restored.category == gt_sample_issue.category
        assert restored.heuristic == gt_sample_issue.heuristic
        assert restored.wcag == gt_sample_issue.wcag
        assert restored.source == gt_sample_issue.source
        assert restored.verified_date == gt_sample_issue.verified_date
        assert restored.still_present == gt_sample_issue.still_present
        assert restored.evidence == gt_sample_issue.evidence
        assert restored.tags == gt_sample_issue.tags

    def test_matches_url_positive(self, gt_sample_issue: GroundTruthIssue) -> None:
        """matches_url returns True for URLs matching the page pattern."""
        assert gt_sample_issue.matches_url("/checkout") is True
        assert gt_sample_issue.matches_url("https://example.com/checkout") is True

    def test_matches_url_negative(self, gt_sample_issue: GroundTruthIssue) -> None:
        """matches_url returns False for URLs not matching the page pattern."""
        assert gt_sample_issue.matches_url("/login") is False

    def test_matches_url_invalid_regex(self) -> None:
        """matches_url returns False when page_pattern has invalid regex."""
        issue = GroundTruthIssue(
            id="GT-test-001",
            site_slug="test",
            site_url="https://example.com",
            page_url="/",
            page_pattern="[invalid",
            element="test",
            description="test",
            severity="minor",
            category="forms",
        )
        assert issue.matches_url("/anything") is False

    def test_default_fields(self) -> None:
        """Default field values are applied correctly."""
        issue = GroundTruthIssue(
            id="GT-test-001",
            site_slug="test",
            site_url="https://example.com",
            page_url="/",
            page_pattern="/",
            element="test element",
            description="test desc",
            severity="minor",
            category="forms",
        )
        assert issue.heuristic is None
        assert issue.wcag is None
        assert issue.source == "self-audit"
        assert issue.source_url is None
        assert issue.still_present is True
        assert issue.evidence == ""
        assert issue.tags == []


class TestBenchmarkSiteConfig:
    """Tests for the BenchmarkSiteConfig dataclass."""

    def test_create_config(self, gt_sample_site_config: BenchmarkSiteConfig) -> None:
        """A BenchmarkSiteConfig can be created with all fields."""
        assert gt_sample_site_config.site_slug == "test_site"
        assert len(gt_sample_site_config.tasks) == 2
        assert gt_sample_site_config.tier == 1

    def test_default_tier(self) -> None:
        """Default tier is 2 when not specified."""
        config = BenchmarkSiteConfig(
            site_slug="test",
            site_url="https://example.com",
            tasks=["Task 1"],
        )
        assert config.tier == 2
        assert config.description == ""


# ─── Loader Tests ───────────────────────────────────────────────────


class TestGetAvailableSites:
    """Tests for the get_available_sites function."""

    def test_returns_expected_sites(self) -> None:
        """All four benchmark sites are available."""
        sites = get_available_sites()
        assert sites == EXPECTED_SITES

    def test_returns_sorted_list(self) -> None:
        """Site slugs are returned in sorted order."""
        sites = get_available_sites()
        assert sites == sorted(sites)


class TestLoadSiteIssues:
    """Tests for loading issues from JSON files."""

    @pytest.mark.parametrize("site_slug", EXPECTED_SITES)
    def test_load_site_issues_returns_list(self, site_slug: str) -> None:
        """Each site's issues load as a non-empty list of GroundTruthIssue."""
        issues = load_site_issues(site_slug)
        assert isinstance(issues, list)
        assert len(issues) > 0
        assert all(isinstance(i, GroundTruthIssue) for i in issues)

    @pytest.mark.parametrize(
        "site_slug,expected_count",
        list(EXPECTED_ISSUE_COUNTS.items()),
    )
    def test_load_site_issues_count(
        self, site_slug: str, expected_count: int
    ) -> None:
        """Each site has the expected number of ground truth issues."""
        issues = load_site_issues(site_slug)
        assert len(issues) == expected_count

    def test_load_nonexistent_site_raises(self) -> None:
        """Loading issues for a nonexistent site raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            load_site_issues("nonexistent_site_12345")

    @pytest.mark.parametrize("site_slug", EXPECTED_SITES)
    def test_all_issues_have_valid_severity(self, site_slug: str) -> None:
        """Every loaded issue has a valid severity value."""
        issues = load_site_issues(site_slug)
        for issue in issues:
            assert issue.severity in VALID_SEVERITIES, (
                f"{issue.id} has invalid severity: {issue.severity}"
            )

    @pytest.mark.parametrize("site_slug", EXPECTED_SITES)
    def test_all_issues_have_valid_category(self, site_slug: str) -> None:
        """Every loaded issue has a valid category value."""
        issues = load_site_issues(site_slug)
        for issue in issues:
            assert issue.category in VALID_CATEGORIES, (
                f"{issue.id} has invalid category: {issue.category}"
            )

    @pytest.mark.parametrize("site_slug", EXPECTED_SITES)
    def test_all_issues_have_unique_ids(self, site_slug: str) -> None:
        """All issue IDs within a site are unique."""
        issues = load_site_issues(site_slug)
        ids = [i.id for i in issues]
        assert len(ids) == len(set(ids)), f"Duplicate IDs found in {site_slug}"

    @pytest.mark.parametrize("site_slug", EXPECTED_SITES)
    def test_all_issues_pass_validation(self, site_slug: str) -> None:
        """Every loaded issue passes validation with no errors."""
        issues = load_site_issues(site_slug)
        for issue in issues:
            errors = validate_issue(issue)
            assert errors == [], (
                f"{issue.id} has validation errors: {errors}"
            )

    @pytest.mark.parametrize("site_slug", EXPECTED_SITES)
    def test_all_issues_have_valid_page_patterns(self, site_slug: str) -> None:
        """Every loaded issue has a compilable regex for page_pattern."""
        issues = load_site_issues(site_slug)
        for issue in issues:
            try:
                re.compile(issue.page_pattern)
            except re.error as e:
                pytest.fail(
                    f"{issue.id} has invalid page_pattern '{issue.page_pattern}': {e}"
                )

    @pytest.mark.parametrize("site_slug", EXPECTED_SITES)
    def test_issue_id_format(self, site_slug: str) -> None:
        """All issue IDs follow the GT-{site_slug}-{NNN} format."""
        issues = load_site_issues(site_slug)
        for issue in issues:
            assert issue.id.startswith(f"GT-{site_slug}-"), (
                f"Issue ID '{issue.id}' does not start with 'GT-{site_slug}-'"
            )
            # Check the numeric suffix
            suffix = issue.id.split("-")[-1]
            assert suffix.isdigit() and len(suffix) == 3, (
                f"Issue ID '{issue.id}' does not end with 3-digit number"
            )


class TestLoadAllIssues:
    """Tests for loading all issues across all sites."""

    def test_load_all_returns_dict(self) -> None:
        """load_all_issues returns a dict with all site slugs as keys."""
        all_issues = load_all_issues()
        assert isinstance(all_issues, dict)
        assert set(all_issues.keys()) == set(EXPECTED_SITES)

    def test_load_all_total_count(self) -> None:
        """Total issue count across all sites matches expectations."""
        all_issues = load_all_issues()
        total = sum(len(issues) for issues in all_issues.values())
        expected_total = sum(EXPECTED_ISSUE_COUNTS.values())
        assert total == expected_total


class TestLoadSiteConfig:
    """Tests for loading site task configurations."""

    @pytest.mark.parametrize("site_slug", EXPECTED_SITES)
    def test_load_site_config(self, site_slug: str) -> None:
        """Task configs load successfully for each site."""
        config = load_site_config(site_slug)
        assert isinstance(config, BenchmarkSiteConfig)
        assert config.site_slug == site_slug
        assert len(config.tasks) >= 2
        assert config.site_url.startswith("https://")

    @pytest.mark.parametrize("site_slug", EXPECTED_SITES)
    def test_config_has_description(self, site_slug: str) -> None:
        """Task configs include a non-empty description."""
        config = load_site_config(site_slug)
        assert config.description, f"Config for {site_slug} has empty description"

    def test_load_nonexistent_config_raises(self) -> None:
        """Loading config for a nonexistent site raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            load_site_config("nonexistent_site_12345")


# ─── Validation Tests ───────────────────────────────────────────────


class TestValidateIssue:
    """Tests for the validate_issue function."""

    def test_valid_issue_no_errors(self, gt_sample_issue: GroundTruthIssue) -> None:
        """A well-formed issue produces no validation errors."""
        errors = validate_issue(gt_sample_issue)
        assert errors == []

    def test_invalid_id_format(self) -> None:
        """An issue with malformed ID produces a validation error."""
        issue = GroundTruthIssue(
            id="BAD-ID",
            site_slug="test",
            site_url="https://example.com",
            page_url="/",
            page_pattern="/",
            element="test",
            description="test",
            severity="minor",
            category="forms",
        )
        errors = validate_issue(issue)
        assert any("id" in e.lower() for e in errors)

    def test_missing_required_fields(self, gt_invalid_issue: GroundTruthIssue) -> None:
        """An issue with empty required fields produces multiple errors."""
        errors = validate_issue(gt_invalid_issue)
        assert len(errors) >= 5  # Multiple fields are invalid

    def test_invalid_severity(self) -> None:
        """An issue with invalid severity value produces an error."""
        issue = GroundTruthIssue(
            id="GT-test-001",
            site_slug="test",
            site_url="https://example.com",
            page_url="/",
            page_pattern="/",
            element="test",
            description="test",
            severity="extreme",
            category="forms",
        )
        errors = validate_issue(issue)
        assert any("severity" in e for e in errors)

    def test_invalid_category(self) -> None:
        """An issue with invalid category value produces an error."""
        issue = GroundTruthIssue(
            id="GT-test-001",
            site_slug="test",
            site_url="https://example.com",
            page_url="/",
            page_pattern="/",
            element="test",
            description="test",
            severity="minor",
            category="nonexistent",
        )
        errors = validate_issue(issue)
        assert any("category" in e for e in errors)

    def test_invalid_regex_pattern(self) -> None:
        """An issue with invalid regex in page_pattern produces an error."""
        issue = GroundTruthIssue(
            id="GT-test-001",
            site_slug="test",
            site_url="https://example.com",
            page_url="/",
            page_pattern="[unclosed",
            element="test",
            description="test",
            severity="minor",
            category="forms",
        )
        errors = validate_issue(issue)
        assert any("regex" in e.lower() or "pattern" in e.lower() for e in errors)

    def test_invalid_source(self) -> None:
        """An issue with an invalid source produces an error."""
        issue = GroundTruthIssue(
            id="GT-test-001",
            site_slug="test",
            site_url="https://example.com",
            page_url="/",
            page_pattern="/",
            element="test",
            description="test",
            severity="minor",
            category="forms",
            source="made-up",
        )
        errors = validate_issue(issue)
        assert any("source" in e for e in errors)

    def test_invalid_date_format(self) -> None:
        """An issue with malformed verified_date produces an error."""
        issue = GroundTruthIssue(
            id="GT-test-001",
            site_slug="test",
            site_url="https://example.com",
            page_url="/",
            page_pattern="/",
            element="test",
            description="test",
            severity="minor",
            category="forms",
            verified_date="Feb 13 2026",
        )
        errors = validate_issue(issue)
        assert any("date" in e.lower() for e in errors)


# ─── Normalizer Tests ───────────────────────────────────────────────


class TestNormalizePageUrl:
    """Tests for the normalize_page_url function."""

    def test_full_url(self) -> None:
        """Extracts path from a full URL."""
        assert normalize_page_url("https://example.com/checkout") == "/checkout"

    def test_path_only(self) -> None:
        """Passes through a bare path unchanged."""
        assert normalize_page_url("/checkout") == "/checkout"

    def test_root(self) -> None:
        """Root path is preserved as '/'."""
        assert normalize_page_url("/") == "/"

    def test_trailing_slash_stripped(self) -> None:
        """Trailing slash is stripped from non-root paths."""
        assert normalize_page_url("/checkout/") == "/checkout"

    def test_root_trailing_slash_preserved(self) -> None:
        """Root path retains its slash."""
        assert normalize_page_url("https://example.com/") == "/"

    def test_empty_string(self) -> None:
        """Empty string normalizes to root."""
        assert normalize_page_url("") == "/"

    def test_url_with_query_params(self) -> None:
        """Query parameters are stripped."""
        result = normalize_page_url("https://example.com/search?q=test")
        assert result == "/search"

    def test_nested_path(self) -> None:
        """Nested paths are preserved."""
        result = normalize_page_url("/account/settings")
        assert result == "/account/settings"


class TestClassifyElementType:
    """Tests for the classify_element_type function."""

    def test_input_field(self) -> None:
        assert classify_element_type("Username input field") == "input"

    def test_password_field(self) -> None:
        assert classify_element_type("Password field") == "input"

    def test_button(self) -> None:
        assert classify_element_type("Submit button") == "button"

    def test_cta(self) -> None:
        assert classify_element_type("Primary CTA") == "button"

    def test_link(self) -> None:
        assert classify_element_type("Hyperlink to homepage") == "link"

    def test_image(self) -> None:
        assert classify_element_type("Hero image") == "image"

    def test_alt_text(self) -> None:
        assert classify_element_type("Images missing alt text") == "image"

    def test_navigation(self) -> None:
        assert classify_element_type("Header navigation bar") == "nav"

    def test_menu(self) -> None:
        assert classify_element_type("Mobile menu categories") == "nav"

    def test_form(self) -> None:
        assert classify_element_type("Registration form") == "form"

    def test_dropdown(self) -> None:
        assert classify_element_type("Country selection dropdown") == "form"

    def test_heading(self) -> None:
        assert classify_element_type("Page title heading") == "heading"

    def test_layout(self) -> None:
        assert classify_element_type("Progress indicator in layout") == "layout"

    def test_text(self) -> None:
        assert classify_element_type("Error message text") == "text"

    def test_empty_string(self) -> None:
        assert classify_element_type("") == "other"

    def test_unknown(self) -> None:
        assert classify_element_type("mysterious widget") == "other"


class TestClassifyProblemCategory:
    """Tests for the classify_problem_category function."""

    def test_missing(self) -> None:
        assert classify_problem_category("Missing alt text on images") == "missing"

    def test_confusing(self) -> None:
        assert classify_problem_category("Cryptic and confusing icon") == "confusing"

    def test_slow(self) -> None:
        assert classify_problem_category("Slow page loading speed") == "slow"

    def test_broken(self) -> None:
        assert classify_problem_category("Error when clicking button") == "broken"

    def test_inaccessible(self) -> None:
        result = classify_problem_category("Screen reader incompatibility")
        assert result == "inaccessible"

    def test_hidden(self) -> None:
        result = classify_problem_category("CTAs pushed below the fold")
        assert result == "hidden"

    def test_complex(self) -> None:
        result = classify_problem_category("Excessive password constraints")
        assert result == "complex"

    def test_unclear(self) -> None:
        result = classify_problem_category("Poorly worded instructions")
        assert result == "unclear"

    def test_inconsistent(self) -> None:
        result = classify_problem_category("Inconsistent button styling")
        assert result == "inconsistent"

    def test_empty_string(self) -> None:
        assert classify_problem_category("") == "unclear"

    def test_no_match_defaults_to_unclear(self) -> None:
        assert classify_problem_category("Something entirely unusual") == "unclear"


class TestNormalizeGtIssue:
    """Tests for normalizing ground truth issues."""

    def test_normalize_basic_issue(self, gt_sample_issue: GroundTruthIssue) -> None:
        """A ground truth issue normalizes to a NormalizedIssue with correct fields."""
        normalized = normalize_gt_issue(gt_sample_issue)
        assert isinstance(normalized, NormalizedIssue)
        assert normalized.source == "ground_truth"
        assert normalized.id == gt_sample_issue.id
        assert normalized.site_slug == gt_sample_issue.site_slug
        assert normalized.severity == gt_sample_issue.severity
        assert normalized.confidence == 1.0
        assert normalized.heuristic == gt_sample_issue.heuristic

    def test_normalize_preserves_wcag(self) -> None:
        """WCAG criterion is preserved through normalization."""
        issue = GroundTruthIssue(
            id="GT-test-001",
            site_slug="test",
            site_url="https://example.com",
            page_url="/",
            page_pattern="/",
            element="Images on page",
            description="Missing alt text on images",
            severity="critical",
            category="accessibility",
            wcag="1.1.1",
        )
        normalized = normalize_gt_issue(issue)
        assert normalized.wcag == "1.1.1"

    def test_normalize_classifies_element(
        self, gt_sample_issue: GroundTruthIssue
    ) -> None:
        """Normalization classifies the element type from description."""
        normalized = normalize_gt_issue(gt_sample_issue)
        assert normalized.element_type == "button"

    def test_normalize_classifies_problem(
        self, gt_sample_issue: GroundTruthIssue
    ) -> None:
        """Normalization classifies the problem category from description."""
        normalized = normalize_gt_issue(gt_sample_issue)
        # "not visible" matches "hidden" category
        assert normalized.problem_category in {
            "hidden", "missing", "confusing", "unclear",
        }

    @pytest.mark.parametrize("site_slug", EXPECTED_SITES)
    def test_normalize_all_site_issues(self, site_slug: str) -> None:
        """All issues from each site can be successfully normalized."""
        issues = load_site_issues(site_slug)
        for issue in issues:
            normalized = normalize_gt_issue(issue)
            assert isinstance(normalized, NormalizedIssue)
            assert normalized.source == "ground_truth"
            assert normalized.site_slug == site_slug


class TestNormalizeMirrorIssue:
    """Tests for normalizing Mirror-detected issues."""

    def test_normalize_basic_mirror_issue(
        self, gt_sample_mirror_issue: dict
    ) -> None:
        """A Mirror issue dict normalizes to a NormalizedIssue."""
        normalized = normalize_mirror_issue(gt_sample_mirror_issue)
        assert isinstance(normalized, NormalizedIssue)
        assert normalized.source == "mirror"
        assert normalized.id == "MIRROR-001"
        assert normalized.severity == "major"
        assert normalized.confidence == 0.85
        assert normalized.corroboration_count == 2

    def test_normalize_mirror_issue_url(self, gt_sample_mirror_issue: dict) -> None:
        """Mirror issue URL is normalized to a path-based pattern."""
        normalized = normalize_mirror_issue(gt_sample_mirror_issue)
        assert "/checkout" in normalized.page_url_pattern

    def test_normalize_mirror_issue_defaults(self) -> None:
        """Missing fields in a Mirror issue dict get sensible defaults."""
        minimal_issue = {
            "id": "MIRROR-002",
            "description": "Something is wrong",
        }
        normalized = normalize_mirror_issue(minimal_issue)
        assert normalized.source == "mirror"
        assert normalized.site_slug == "unknown"
        assert normalized.severity == "minor"
        assert normalized.confidence == 0.8
        assert normalized.corroboration_count == 1

    def test_normalize_mirror_issue_classifies_element(
        self, gt_sample_mirror_issue: dict
    ) -> None:
        """Mirror issue element is classified into a type."""
        normalized = normalize_mirror_issue(gt_sample_mirror_issue)
        assert normalized.element_type == "button"

    def test_normalize_mirror_issue_classifies_problem(
        self, gt_sample_mirror_issue: dict
    ) -> None:
        """Mirror issue description is classified into a problem category."""
        normalized = normalize_mirror_issue(gt_sample_mirror_issue)
        assert normalized.problem_category in {
            "hidden", "missing", "confusing", "unclear",
        }


# ─── JSON File Integrity Tests ──────────────────────────────────────


class TestJsonFileIntegrity:
    """Tests that validate the raw JSON file structure and content."""

    @pytest.mark.parametrize("site_slug", EXPECTED_SITES)
    def test_site_json_has_issues_key(self, site_slug: str) -> None:
        """Each site JSON file contains an 'issues' array."""
        from pathlib import Path

        filepath = (
            Path(__file__).parent.parent.parent
            / "benchmark"
            / "ground_truth"
            / "sites"
            / f"{site_slug}.json"
        )
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert "issues" in data
        assert isinstance(data["issues"], list)

    @pytest.mark.parametrize("site_slug", EXPECTED_SITES)
    def test_site_json_has_metadata(self, site_slug: str) -> None:
        """Each site JSON file contains site metadata."""
        from pathlib import Path

        filepath = (
            Path(__file__).parent.parent.parent
            / "benchmark"
            / "ground_truth"
            / "sites"
            / f"{site_slug}.json"
        )
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert "site_slug" in data
        assert "site_url" in data
        assert data["site_slug"] == site_slug

    @pytest.mark.parametrize("site_slug", EXPECTED_SITES)
    def test_task_json_has_required_fields(self, site_slug: str) -> None:
        """Each task JSON file has site_slug, site_url, and tasks."""
        from pathlib import Path

        filepath = (
            Path(__file__).parent.parent.parent
            / "benchmark"
            / "ground_truth"
            / "tasks"
            / f"{site_slug}.json"
        )
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert data["site_slug"] == site_slug
        assert "site_url" in data
        assert "tasks" in data
        assert isinstance(data["tasks"], list)
        assert len(data["tasks"]) >= 2


# ─── Cross-site Consistency Tests ───────────────────────────────────


class TestCrossSiteConsistency:
    """Tests validating consistency across all ground truth sites."""

    def test_all_issue_ids_globally_unique(self) -> None:
        """Issue IDs are unique across all sites, not just within a site."""
        all_issues = load_all_issues()
        all_ids: list[str] = []
        for issues in all_issues.values():
            all_ids.extend(i.id for i in issues)
        assert len(all_ids) == len(set(all_ids)), "Duplicate IDs found across sites"

    def test_dominos_issues_all_accessibility(self) -> None:
        """Domino's issues are all in the accessibility category (from court filing)."""
        issues = load_site_issues("dominos")
        for issue in issues:
            assert issue.category == "accessibility", (
                f"{issue.id} expected accessibility, got {issue.category}"
            )

    def test_dominos_issues_all_have_wcag(self) -> None:
        """Domino's issues all cite WCAG criteria (from court documents)."""
        issues = load_site_issues("dominos")
        for issue in issues:
            assert issue.wcag is not None, (
                f"{issue.id} should have WCAG criterion"
            )

    def test_healthcare_gov_has_heuristics(self) -> None:
        """Healthcare.gov issues reference Nielsen's heuristics."""
        issues = load_site_issues("healthcare_gov")
        heuristic_count = sum(1 for i in issues if i.heuristic is not None)
        assert heuristic_count == len(issues), (
            "All healthcare.gov issues should have heuristic references"
        )

    def test_site_configs_match_issue_sites(self) -> None:
        """Every site with issues also has a task configuration."""
        issue_sites = set(get_available_sites())
        for site_slug in issue_sites:
            config = load_site_config(site_slug)
            assert config.site_slug == site_slug
