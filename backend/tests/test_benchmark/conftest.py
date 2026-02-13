"""Fixtures for benchmark pipeline tests (executor + ground truth)."""

from __future__ import annotations

import pytest

from benchmark.executor.collector import IssueCollector
from benchmark.executor.runner import BenchmarkRunner
from benchmark.executor.schema import BenchmarkRunConfig, MirrorIssue
from benchmark.ground_truth.schema import BenchmarkSiteConfig, GroundTruthIssue


# ─── Constants for ground truth test assertions ─────────────────────

EXPECTED_SITES = ["dominos", "edx", "healthcare_gov", "sunuva"]

EXPECTED_ISSUE_COUNTS = {
    "healthcare_gov": 10,
    "edx": 9,
    "sunuva": 5,
    "dominos": 4,
}


# ─── Ground truth fixtures ──────────────────────────────────────────


@pytest.fixture
def gt_sample_issue() -> GroundTruthIssue:
    """A minimal valid ground truth issue for testing."""
    return GroundTruthIssue(
        id="GT-test_site-001",
        site_slug="test_site",
        site_url="https://www.example.com",
        page_url="/checkout",
        page_pattern="/checkout",
        element="Submit button",
        description="The submit button is not visible on mobile viewports.",
        severity="major",
        category="visual",
        heuristic="H8",
        wcag=None,
        source="self-audit",
        source_url=None,
        verified_date="2026-02-13",
        still_present=True,
        evidence="Button is hidden below the fold on screens under 768px.",
        tags=["mobile", "visibility"],
    )


@pytest.fixture
def gt_sample_issue_dict(gt_sample_issue: GroundTruthIssue) -> dict:
    """A sample ground truth issue as a plain dictionary."""
    return gt_sample_issue.to_dict()


@pytest.fixture
def gt_sample_site_config() -> BenchmarkSiteConfig:
    """A minimal valid benchmark site configuration for testing."""
    return BenchmarkSiteConfig(
        site_slug="test_site",
        site_url="https://www.example.com",
        tasks=[
            "Complete the checkout process.",
            "Find and add an item to cart.",
        ],
        description="A test e-commerce site for benchmark testing.",
        tier=1,
    )


@pytest.fixture
def gt_sample_mirror_issue() -> dict:
    """A sample Mirror-detected issue as a dictionary for normalizer testing."""
    return {
        "id": "MIRROR-001",
        "site_slug": "test_site",
        "page_url": "https://www.example.com/checkout/",
        "element": "Submit order button",
        "description": "The submit button is hidden below the fold on mobile devices.",
        "severity": "major",
        "heuristic": "H8",
        "wcag_criterion": None,
        "confidence": 0.85,
        "corroboration_count": 2,
    }


@pytest.fixture
def gt_invalid_issue() -> GroundTruthIssue:
    """A ground truth issue with multiple validation errors."""
    return GroundTruthIssue(
        id="BAD-FORMAT",
        site_slug="",
        site_url="",
        page_url="",
        page_pattern="[invalid-regex",
        element="",
        description="",
        severity="unknown",
        category="nonexistent",
        heuristic=None,
        wcag=None,
        source="made-up-source",
        verified_date="not-a-date",
    )


@pytest.fixture
def runner() -> BenchmarkRunner:
    """Provide a BenchmarkRunner instance."""
    return BenchmarkRunner()


@pytest.fixture
def collector() -> IssueCollector:
    """Provide an IssueCollector instance."""
    return IssueCollector()


@pytest.fixture
def sample_config() -> BenchmarkRunConfig:
    """Provide a basic benchmark run config for testing."""
    return BenchmarkRunConfig(
        site_slug="test_site",
        site_url="https://example.com",
        tasks=["Find the login page", "Submit the contact form"],
    )


@pytest.fixture
def sample_issues() -> list[MirrorIssue]:
    """Provide a diverse set of MirrorIssues for filter testing."""
    return [
        # Low confidence, should pass confidence filter easily
        MirrorIssue(
            id="MI-aaa00001-001",
            study_id="aaa00001",
            session_id="sess-001",
            persona_role="low-tech-elderly",
            step_number=5,
            page_url="/checkout",
            element="submit button",
            description="Submit button is too small to tap on mobile",
            severity="major",
            confidence=0.3,
            emotional_state="frustrated",
            task_progress=20.0,
            session_completed=False,
            personas_also_found=1,
        ),
        # High confidence, frustrated emotion -> should pass confidence filter
        MirrorIssue(
            id="MI-aaa00001-002",
            study_id="aaa00001",
            session_id="sess-002",
            persona_role="power-user-impatient",
            step_number=3,
            page_url="/checkout",
            element="error message",
            description="Error message disappears before user can read it",
            severity="critical",
            confidence=0.9,
            emotional_state="frustrated",
            task_progress=50.0,
            session_completed=True,
            personas_also_found=1,
        ),
        # High confidence, confident emotion -> should FAIL confidence filter
        MirrorIssue(
            id="MI-aaa00001-003",
            study_id="aaa00001",
            session_id="sess-003",
            persona_role="explorer-skeptical",
            step_number=7,
            page_url="/about",
            element="footer link",
            description="Footer link color has low contrast",
            severity="minor",
            confidence=0.9,
            emotional_state="confident",
            task_progress=80.0,
            session_completed=True,
            personas_also_found=1,
        ),
        # High confidence but corroboration >= 2 -> should pass confidence filter
        MirrorIssue(
            id="MI-aaa00001-004",
            study_id="aaa00001",
            session_id="sess-004",
            persona_role="non-native-moderate",
            step_number=2,
            page_url="/search",
            element="search input",
            description="Search placeholder text is not translated",
            severity="minor",
            confidence=0.85,
            emotional_state="neutral",
            task_progress=10.0,
            session_completed=True,
            personas_also_found=3,
        ),
    ]
