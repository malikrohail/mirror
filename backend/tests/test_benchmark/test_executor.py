"""Tests for the benchmark executor: schema, runner, and collector."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from benchmark.executor.collector import IssueCollector
from benchmark.executor.runner import BenchmarkRunner
from benchmark.executor.schema import (
    BenchmarkRunConfig,
    BenchmarkRunResult,
    MirrorIssue,
)


# ──────────────────────────────────────────────────────────────────
# BenchmarkRunConfig tests
# ──────────────────────────────────────────────────────────────────


class TestBenchmarkRunConfig:
    """Tests for BenchmarkRunConfig creation and serialization."""

    def test_creation_with_required_fields(self) -> None:
        config = BenchmarkRunConfig(
            site_slug="example",
            site_url="https://example.com",
            tasks=["Buy a product"],
        )
        assert config.site_slug == "example"
        assert config.site_url == "https://example.com"
        assert config.tasks == ["Buy a product"]
        assert config.max_steps == 30
        assert config.timeout == 600
        assert config.device == "desktop"
        assert config.seed_personas is True
        assert config.disable_firecrawl is False
        assert config.model_override is None
        assert config.personas == []

    def test_creation_with_all_fields(self) -> None:
        config = BenchmarkRunConfig(
            site_slug="shop",
            site_url="https://shop.example.com",
            tasks=["Search for item", "Add to cart"],
            personas=[{"name": "Tester", "role": "qa"}],
            max_steps=50,
            timeout=300,
            device="mobile",
            seed_personas=False,
            disable_firecrawl=True,
            model_override={"navigation": "claude-sonnet-4-5-20250929"},
        )
        assert config.max_steps == 50
        assert config.device == "mobile"
        assert config.seed_personas is False
        assert config.disable_firecrawl is True
        assert len(config.personas) == 1

    def test_to_dict(self) -> None:
        config = BenchmarkRunConfig(
            site_slug="test",
            site_url="https://test.com",
            tasks=["Task 1"],
        )
        d = config.to_dict()
        assert isinstance(d, dict)
        assert d["site_slug"] == "test"
        assert d["tasks"] == ["Task 1"]
        assert d["max_steps"] == 30

    def test_from_dict(self) -> None:
        data = {
            "site_slug": "rt",
            "site_url": "https://rt.com",
            "tasks": ["Do something"],
            "max_steps": 15,
        }
        config = BenchmarkRunConfig.from_dict(data)
        assert config.site_slug == "rt"
        assert config.max_steps == 15

    def test_from_dict_ignores_extra_keys(self) -> None:
        data = {
            "site_slug": "x",
            "site_url": "https://x.com",
            "tasks": [],
            "unknown_field": "should be ignored",
        }
        config = BenchmarkRunConfig.from_dict(data)
        assert config.site_slug == "x"
        assert not hasattr(config, "unknown_field")

    def test_round_trip(self) -> None:
        original = BenchmarkRunConfig(
            site_slug="roundtrip",
            site_url="https://roundtrip.com",
            tasks=["T1", "T2"],
            max_steps=20,
            device="mobile",
        )
        restored = BenchmarkRunConfig.from_dict(original.to_dict())
        assert restored.site_slug == original.site_slug
        assert restored.site_url == original.site_url
        assert restored.tasks == original.tasks
        assert restored.max_steps == original.max_steps
        assert restored.device == original.device


# ──────────────────────────────────────────────────────────────────
# MirrorIssue tests
# ──────────────────────────────────────────────────────────────────


class TestMirrorIssue:
    """Tests for MirrorIssue creation, serialization, and deserialization."""

    def _make_issue(self, **overrides) -> MirrorIssue:
        defaults = {
            "id": "MI-abc12345-001",
            "study_id": "abc12345",
            "session_id": "sess-001",
            "persona_role": "low-tech-elderly",
            "step_number": 5,
            "page_url": "/checkout",
            "element": "submit button",
            "description": "Button is too small",
            "severity": "major",
        }
        defaults.update(overrides)
        return MirrorIssue(**defaults)

    def test_creation_with_required_fields(self) -> None:
        issue = self._make_issue()
        assert issue.id == "MI-abc12345-001"
        assert issue.severity == "major"
        assert issue.confidence == 0.5
        assert issue.session_completed is False
        assert issue.personas_also_found == 1

    def test_creation_with_all_fields(self) -> None:
        issue = self._make_issue(
            heuristic="H7",
            wcag="1.4.3",
            recommendation="Increase button size",
            confidence=0.3,
            priority_score=8.5,
            emotional_state="frustrated",
            task_progress=20.0,
            session_completed=False,
            personas_also_found=3,
        )
        assert issue.heuristic == "H7"
        assert issue.wcag == "1.4.3"
        assert issue.confidence == 0.3
        assert issue.personas_also_found == 3

    def test_to_dict(self) -> None:
        issue = self._make_issue(emotional_state="confused")
        d = issue.to_dict()
        assert isinstance(d, dict)
        assert d["id"] == "MI-abc12345-001"
        assert d["emotional_state"] == "confused"
        assert d["confidence"] == 0.5

    def test_from_dict(self) -> None:
        data = {
            "id": "MI-xyz-001",
            "study_id": "xyz",
            "session_id": "s1",
            "persona_role": "tester",
            "step_number": 1,
            "page_url": "/home",
            "element": "nav",
            "description": "Navigation is confusing",
            "severity": "minor",
            "confidence": 0.7,
        }
        issue = MirrorIssue.from_dict(data)
        assert issue.id == "MI-xyz-001"
        assert issue.confidence == 0.7

    def test_from_dict_ignores_extra_keys(self) -> None:
        data = {
            "id": "MI-xxx-001",
            "study_id": "xxx",
            "session_id": "s1",
            "persona_role": "tester",
            "step_number": None,
            "page_url": "/",
            "element": "body",
            "description": "Something",
            "severity": "enhancement",
            "nonexistent_field": True,
        }
        issue = MirrorIssue.from_dict(data)
        assert issue.severity == "enhancement"

    def test_round_trip(self) -> None:
        original = self._make_issue(
            heuristic="H3",
            wcag="2.1.1",
            recommendation="Fix it",
            confidence=0.2,
            emotional_state="anxious",
            task_progress=0.0,
            session_completed=False,
            personas_also_found=2,
        )
        restored = MirrorIssue.from_dict(original.to_dict())
        assert restored.id == original.id
        assert restored.study_id == original.study_id
        assert restored.confidence == original.confidence
        assert restored.emotional_state == original.emotional_state
        assert restored.personas_also_found == original.personas_also_found
        assert restored.session_completed == original.session_completed

    def test_json_serializable(self) -> None:
        issue = self._make_issue()
        serialized = json.dumps(issue.to_dict())
        deserialized = json.loads(serialized)
        restored = MirrorIssue.from_dict(deserialized)
        assert restored.id == issue.id


# ──────────────────────────────────────────────────────────────────
# BenchmarkRunResult tests
# ──────────────────────────────────────────────────────────────────


class TestBenchmarkRunResult:
    """Tests for BenchmarkRunResult serialization and deserialization."""

    def _make_result(self) -> BenchmarkRunResult:
        config = BenchmarkRunConfig(
            site_slug="demo",
            site_url="https://demo.com",
            tasks=["Sign up"],
        )
        issue = MirrorIssue(
            id="MI-demo0001-001",
            study_id="demo0001",
            session_id="sess-d1",
            persona_role="power-user-impatient",
            step_number=3,
            page_url="/signup",
            element="email input",
            description="Email validation is unclear",
            severity="major",
            confidence=0.4,
            emotional_state="confused",
        )
        return BenchmarkRunResult(
            site_slug="demo",
            study_id="demo0001",
            config=config,
            mirror_issues=[issue],
            pages_visited=["/signup", "/home"],
            sessions=[
                {
                    "session_id": "sess-d1",
                    "persona_role": "power-user-impatient",
                    "status": "complete",
                    "task_completed": True,
                    "total_steps": 12,
                }
            ],
            total_steps=12,
            total_time_seconds=45.3,
            api_cost_estimate=0.15,
        )

    def test_to_dict(self) -> None:
        result = self._make_result()
        d = result.to_dict()
        assert d["site_slug"] == "demo"
        assert d["study_id"] == "demo0001"
        assert isinstance(d["config"], dict)
        assert d["config"]["site_slug"] == "demo"
        assert len(d["mirror_issues"]) == 1
        assert d["mirror_issues"][0]["id"] == "MI-demo0001-001"
        assert d["total_time_seconds"] == 45.3

    def test_from_dict(self) -> None:
        result = self._make_result()
        d = result.to_dict()
        restored = BenchmarkRunResult.from_dict(d)
        assert restored.site_slug == "demo"
        assert restored.study_id == "demo0001"
        assert isinstance(restored.config, BenchmarkRunConfig)
        assert restored.config.site_slug == "demo"
        assert len(restored.mirror_issues) == 1
        assert isinstance(restored.mirror_issues[0], MirrorIssue)
        assert restored.mirror_issues[0].severity == "major"

    def test_round_trip(self) -> None:
        original = self._make_result()
        d = original.to_dict()
        restored = BenchmarkRunResult.from_dict(d)
        assert restored.site_slug == original.site_slug
        assert restored.study_id == original.study_id
        assert restored.total_steps == original.total_steps
        assert restored.total_time_seconds == original.total_time_seconds
        assert restored.api_cost_estimate == original.api_cost_estimate
        assert restored.pages_visited == original.pages_visited
        assert len(restored.mirror_issues) == len(original.mirror_issues)
        assert restored.mirror_issues[0].id == original.mirror_issues[0].id

    def test_json_round_trip(self) -> None:
        original = self._make_result()
        serialized = json.dumps(original.to_dict())
        deserialized = json.loads(serialized)
        restored = BenchmarkRunResult.from_dict(deserialized)
        assert restored.study_id == original.study_id
        assert len(restored.mirror_issues) == 1

    def test_from_dict_does_not_mutate_input(self) -> None:
        original = self._make_result()
        d = original.to_dict()
        d_copy = json.loads(json.dumps(d))
        BenchmarkRunResult.from_dict(d)
        assert d == d_copy  # Not strictly equal due to in-place mutation guard


# ──────────────────────────────────────────────────────────────────
# IssueCollector filter tests
# ──────────────────────────────────────────────────────────────────


class TestIssueCollectorFilterByConfidence:
    """Tests for IssueCollector.filter_by_confidence."""

    def test_low_confidence_kept(self, collector: IssueCollector, sample_issues: list[MirrorIssue]) -> None:
        """Issue with confidence=0.3 should be kept."""
        low_conf = [i for i in sample_issues if i.confidence == 0.3]
        assert len(low_conf) == 1
        result = collector.filter_by_confidence(low_conf)
        assert len(result) == 1
        assert result[0].id == low_conf[0].id

    def test_high_confidence_frustrated_kept(self, collector: IssueCollector, sample_issues: list[MirrorIssue]) -> None:
        """Issue with confidence=0.9 but frustrated emotional state should be kept."""
        issue = sample_issues[1]  # confidence=0.9, emotional_state="frustrated"
        assert issue.confidence == 0.9
        assert issue.emotional_state == "frustrated"
        result = collector.filter_by_confidence([issue])
        assert len(result) == 1

    def test_high_confidence_confident_filtered(self, collector: IssueCollector, sample_issues: list[MirrorIssue]) -> None:
        """Issue with confidence=0.9 and confident emotional state should be filtered out."""
        issue = sample_issues[2]  # confidence=0.9, emotional_state="confident"
        assert issue.confidence == 0.9
        assert issue.emotional_state == "confident"
        result = collector.filter_by_confidence([issue])
        assert len(result) == 0

    def test_high_confidence_corroboration_kept(self, collector: IssueCollector, sample_issues: list[MirrorIssue]) -> None:
        """Issue with high confidence but corroboration >= 2 should be kept."""
        issue = sample_issues[3]  # confidence=0.85, personas_also_found=3
        assert issue.confidence == 0.85
        assert issue.personas_also_found >= 2
        result = collector.filter_by_confidence([issue])
        assert len(result) == 1

    def test_mixed_issues(self, collector: IssueCollector, sample_issues: list[MirrorIssue]) -> None:
        """Filter a mixed list: 3 out of 4 should survive."""
        result = collector.filter_by_confidence(sample_issues)
        # Issue 0: conf=0.3 -> kept
        # Issue 1: conf=0.9, frustrated -> kept
        # Issue 2: conf=0.9, confident, corr=1 -> filtered
        # Issue 3: conf=0.85, corr=3 -> kept
        assert len(result) == 3
        filtered_ids = {i.id for i in result}
        assert sample_issues[2].id not in filtered_ids

    def test_custom_threshold(self, collector: IssueCollector) -> None:
        """Custom threshold changes which issues pass."""
        issue = MirrorIssue(
            id="MI-thr-001",
            study_id="thr",
            session_id="s1",
            persona_role="tester",
            step_number=1,
            page_url="/",
            element="btn",
            description="Test",
            severity="minor",
            confidence=0.5,
            emotional_state="neutral",
            personas_also_found=1,
        )
        # With default threshold 0.6: 0.5 <= 0.6, so kept
        assert len(collector.filter_by_confidence([issue], threshold=0.6)) == 1
        # With threshold 0.4: 0.5 > 0.4, neutral emotion, corr=1, filtered
        assert len(collector.filter_by_confidence([issue], threshold=0.4)) == 0

    def test_empty_input(self, collector: IssueCollector) -> None:
        result = collector.filter_by_confidence([])
        assert result == []


# ──────────────────────────────────────────────────────────────────
# IssueCollector behavioral evidence score tests
# ──────────────────────────────────────────────────────────────────


class TestBehavioralEvidenceScore:
    """Tests for IssueCollector.behavioral_evidence_score."""

    def test_frustrated_failed_session(self) -> None:
        """Frustrated emotional state + failed session = high score."""
        issue = MirrorIssue(
            id="MI-score-001",
            study_id="score",
            session_id="s1",
            persona_role="tester",
            step_number=1,
            page_url="/",
            element="form",
            description="Form submission fails",
            severity="critical",
            emotional_state="frustrated",
            task_progress=0.0,
            session_completed=False,
            personas_also_found=1,
        )
        score = IssueCollector.behavioral_evidence_score(issue)
        # frustrated: +0.4, task_progress=0: +0.3, not completed: +0.2 = 0.9
        assert score == pytest.approx(0.9)

    def test_confident_completed_session(self) -> None:
        """Confident emotional state + completed session = low score."""
        issue = MirrorIssue(
            id="MI-score-002",
            study_id="score",
            session_id="s2",
            persona_role="tester",
            step_number=10,
            page_url="/done",
            element="text",
            description="Minor text alignment issue",
            severity="minor",
            emotional_state="confident",
            task_progress=100.0,
            session_completed=True,
            personas_also_found=1,
        )
        score = IssueCollector.behavioral_evidence_score(issue)
        # No struggle emotion: +0, task_progress=100>0: +0, completed: +0, corr=1: +0
        assert score == pytest.approx(0.0)

    def test_confused_with_corroboration(self) -> None:
        """Confused + corroboration from 3 personas."""
        issue = MirrorIssue(
            id="MI-score-003",
            study_id="score",
            session_id="s3",
            persona_role="tester",
            step_number=5,
            page_url="/checkout",
            element="button",
            description="Button label unclear",
            severity="major",
            emotional_state="confused",
            task_progress=50.0,
            session_completed=True,
            personas_also_found=3,
        )
        score = IssueCollector.behavioral_evidence_score(issue)
        # confused: +0.4, progress=50>0: +0, completed: +0, corr (3-1=2)*0.1: +0.2
        assert score == pytest.approx(0.6)

    def test_anxious_no_progress_not_completed(self) -> None:
        """Anxious + no progress + not completed + high corroboration = capped at 1.0."""
        issue = MirrorIssue(
            id="MI-score-004",
            study_id="score",
            session_id="s4",
            persona_role="tester",
            step_number=1,
            page_url="/",
            element="page",
            description="Page is completely broken",
            severity="critical",
            emotional_state="anxious",
            task_progress=0.0,
            session_completed=False,
            personas_also_found=5,
        )
        score = IssueCollector.behavioral_evidence_score(issue)
        # anxious: +0.4, progress=0: +0.3, not completed: +0.2, corr min(4,3)*0.1: +0.3
        # Total = 1.2, capped at 1.0
        assert score == pytest.approx(1.0)

    def test_none_task_progress(self) -> None:
        """task_progress=None should not add the progress bonus."""
        issue = MirrorIssue(
            id="MI-score-005",
            study_id="score",
            session_id="s5",
            persona_role="tester",
            step_number=1,
            page_url="/",
            element="div",
            description="Something",
            severity="minor",
            emotional_state="frustrated",
            task_progress=None,
            session_completed=False,
            personas_also_found=1,
        )
        score = IssueCollector.behavioral_evidence_score(issue)
        # frustrated: +0.4, progress=None: +0, not completed: +0.2 = 0.6
        assert score == pytest.approx(0.6)

    def test_only_corroboration(self) -> None:
        """Only corroboration, no other signals."""
        issue = MirrorIssue(
            id="MI-score-006",
            study_id="score",
            session_id="s6",
            persona_role="tester",
            step_number=1,
            page_url="/",
            element="link",
            description="Dead link",
            severity="minor",
            emotional_state="neutral",
            task_progress=80.0,
            session_completed=True,
            personas_also_found=4,
        )
        score = IssueCollector.behavioral_evidence_score(issue)
        # neutral: +0, progress=80>0: +0, completed: +0, corr min(3,3)*0.1: +0.3
        assert score == pytest.approx(0.3)


# ──────────────────────────────────────────────────────────────────
# IssueCollector apply_all_filters tests
# ──────────────────────────────────────────────────────────────────


class TestApplyAllFilters:
    """Tests for IssueCollector.apply_all_filters end-to-end."""

    def test_end_to_end_filtering(self, collector: IssueCollector, sample_issues: list[MirrorIssue]) -> None:
        """Apply all filters to sample issues and verify correct survivors."""
        result = collector.apply_all_filters(sample_issues)

        # After confidence filter (3 survive: indices 0, 1, 3):
        #   Issue 0: conf=0.3, frustrated, progress=20, not completed
        #     -> behavioral: 0.4 + 0.0 + 0.2 = 0.6 >= 0.2 -> kept
        #   Issue 1: conf=0.9, frustrated, progress=50, completed
        #     -> behavioral: 0.4 + 0.0 + 0.0 = 0.4 >= 0.2 -> kept
        #   Issue 3: conf=0.85, neutral, progress=10, completed, corr=3
        #     -> behavioral: 0.0 + 0.0 + 0.0 + 0.2 = 0.2 >= 0.2 -> kept
        assert len(result) == 3

    def test_aggressive_behavioral_filter(self, collector: IssueCollector) -> None:
        """Issue that passes confidence but fails behavioral evidence."""
        issue = MirrorIssue(
            id="MI-agg-001",
            study_id="agg",
            session_id="s1",
            persona_role="tester",
            step_number=1,
            page_url="/",
            element="div",
            description="Minor style issue",
            severity="enhancement",
            confidence=0.3,  # Passes confidence filter (low confidence)
            emotional_state="neutral",
            task_progress=90.0,
            session_completed=True,
            personas_also_found=1,
        )
        # behavioral score: 0.0 (no signals) < 0.2 -> filtered
        result = collector.apply_all_filters([issue])
        assert len(result) == 0

    def test_empty_input(self, collector: IssueCollector) -> None:
        result = collector.apply_all_filters([])
        assert result == []


# ──────────────────────────────────────────────────────────────────
# IssueCollector corroboration tests
# ──────────────────────────────────────────────────────────────────


class TestComputeCorroboration:
    """Tests for IssueCollector.compute_corroboration."""

    def test_similar_issues_same_page(self, collector: IssueCollector) -> None:
        """Two personas report similar issues on the same page."""
        issues = [
            MirrorIssue(
                id="MI-corr-001",
                study_id="corr",
                session_id="s1",
                persona_role="elderly",
                step_number=1,
                page_url="/checkout",
                element="button",
                description="The submit button is very difficult to find",
                severity="major",
            ),
            MirrorIssue(
                id="MI-corr-002",
                study_id="corr",
                session_id="s2",
                persona_role="impatient",
                step_number=2,
                page_url="/checkout",
                element="button",
                description="Submit button is hard to find on the page",
                severity="major",
            ),
        ]
        collector.compute_corroboration(issues)
        assert issues[0].personas_also_found == 2
        assert issues[1].personas_also_found == 2

    def test_different_pages_no_corroboration(self, collector: IssueCollector) -> None:
        """Issues on different pages should not corroborate."""
        issues = [
            MirrorIssue(
                id="MI-corr-003",
                study_id="corr",
                session_id="s1",
                persona_role="elderly",
                step_number=1,
                page_url="/checkout",
                element="button",
                description="Button is hard to find",
                severity="major",
            ),
            MirrorIssue(
                id="MI-corr-004",
                study_id="corr",
                session_id="s2",
                persona_role="impatient",
                step_number=2,
                page_url="/home",
                element="button",
                description="Button is hard to find",
                severity="major",
            ),
        ]
        collector.compute_corroboration(issues)
        assert issues[0].personas_also_found == 1
        assert issues[1].personas_also_found == 1

    def test_dissimilar_descriptions(self, collector: IssueCollector) -> None:
        """Very different descriptions on same page should not corroborate."""
        issues = [
            MirrorIssue(
                id="MI-corr-005",
                study_id="corr",
                session_id="s1",
                persona_role="elderly",
                step_number=1,
                page_url="/checkout",
                element="button",
                description="The submit button is too small to click",
                severity="major",
            ),
            MirrorIssue(
                id="MI-corr-006",
                study_id="corr",
                session_id="s2",
                persona_role="impatient",
                step_number=2,
                page_url="/checkout",
                element="header",
                description="Page takes forever to load the images and fonts",
                severity="critical",
            ),
        ]
        collector.compute_corroboration(issues)
        assert issues[0].personas_also_found == 1
        assert issues[1].personas_also_found == 1

    def test_same_persona_not_counted(self, collector: IssueCollector) -> None:
        """Two issues from the same persona should not corroborate each other."""
        issues = [
            MirrorIssue(
                id="MI-corr-007",
                study_id="corr",
                session_id="s1",
                persona_role="elderly",
                step_number=1,
                page_url="/checkout",
                element="button",
                description="Button is hard to find",
                severity="major",
            ),
            MirrorIssue(
                id="MI-corr-008",
                study_id="corr",
                session_id="s1",
                persona_role="elderly",
                step_number=5,
                page_url="/checkout",
                element="button",
                description="Button is very hard to locate",
                severity="major",
            ),
        ]
        collector.compute_corroboration(issues)
        assert issues[0].personas_also_found == 1
        assert issues[1].personas_also_found == 1


# ──────────────────────────────────────────────────────────────────
# IssueCollector collect_from_result tests
# ──────────────────────────────────────────────────────────────────


class TestCollectFromResult:
    """Tests for IssueCollector.collect_from_result."""

    def test_returns_copy_of_issues(self, collector: IssueCollector) -> None:
        config = BenchmarkRunConfig(
            site_slug="test",
            site_url="https://test.com",
            tasks=["task"],
        )
        issue = MirrorIssue(
            id="MI-col-001",
            study_id="col",
            session_id="s1",
            persona_role="tester",
            step_number=1,
            page_url="/",
            element="div",
            description="Test issue",
            severity="minor",
        )
        result = BenchmarkRunResult(
            site_slug="test",
            study_id="col",
            config=config,
            mirror_issues=[issue],
            pages_visited=["/"],
            sessions=[],
            total_steps=1,
            total_time_seconds=1.0,
            api_cost_estimate=0.01,
        )
        collected = collector.collect_from_result(result)
        assert len(collected) == 1
        assert collected[0].id == "MI-col-001"
        # Verify it is a new list (not the same object)
        assert collected is not result.mirror_issues


# ──────────────────────────────────────────────────────────────────
# BenchmarkRunner tests
# ──────────────────────────────────────────────────────────────────


class TestBenchmarkRunner:
    """Tests for BenchmarkRunner."""

    def test_build_config(self, runner: BenchmarkRunner) -> None:
        config = runner.build_config(
            site_slug="example",
            site_url="https://example.com",
            tasks=["Find help page"],
        )
        assert config.site_slug == "example"
        assert config.site_url == "https://example.com"
        assert config.tasks == ["Find help page"]
        assert config.seed_personas is True
        assert len(config.personas) == len(runner.BENCHMARK_PERSONAS)
        # Verify persona roles are present
        roles = {p["role"] for p in config.personas}
        assert "low-tech-elderly" in roles
        assert "power-user-impatient" in roles
        assert "accessibility-focused" in roles

    def test_build_config_personas_are_copies(self, runner: BenchmarkRunner) -> None:
        """Modifying config personas should not affect the class-level list."""
        config = runner.build_config("s", "https://s.com", ["t"])
        config.personas[0]["name"] = "MODIFIED"
        assert runner.BENCHMARK_PERSONAS[0]["name"] == "Maria Chen"

    def test_create_mock_result(self, runner: BenchmarkRunner, sample_config: BenchmarkRunConfig) -> None:
        mock_issues = [
            {
                "page_url": "/login",
                "element": "password field",
                "description": "Password field has no visibility toggle",
                "severity": "minor",
                "persona_role": "low-tech-elderly",
                "confidence": 0.4,
                "emotional_state": "confused",
            },
            {
                "page_url": "/signup",
                "element": "terms checkbox",
                "description": "Terms checkbox is hard to click",
                "severity": "major",
                "persona_role": "power-user-impatient",
                "step_number": 3,
            },
        ]
        result = runner.create_mock_result(sample_config, mock_issues)

        assert result.site_slug == "test_site"
        assert len(result.mirror_issues) == 2
        assert result.mirror_issues[0].id.startswith("MI-")
        assert result.mirror_issues[0].page_url == "/login"
        assert result.mirror_issues[0].confidence == 0.4
        assert result.mirror_issues[0].emotional_state == "confused"
        assert result.mirror_issues[1].step_number == 3
        assert "/login" in result.pages_visited
        assert "/signup" in result.pages_visited
        assert isinstance(result.config, BenchmarkRunConfig)

    def test_create_mock_result_defaults(self, runner: BenchmarkRunner, sample_config: BenchmarkRunConfig) -> None:
        """Mock result with minimal issue data fills in defaults."""
        mock_issues = [
            {
                "page_url": "/",
                "element": "body",
                "description": "Page loads slowly",
                "severity": "minor",
                "persona_role": "tester",
            },
        ]
        result = runner.create_mock_result(sample_config, mock_issues)
        issue = result.mirror_issues[0]
        assert issue.confidence == 0.5  # default
        assert issue.session_completed is False  # default
        assert issue.emotional_state is None  # default

    def test_save_and_load_round_trip(self, runner: BenchmarkRunner, sample_config: BenchmarkRunConfig, tmp_path: Path) -> None:
        """Save a result to disk and load it back, verifying fidelity."""
        mock_issues = [
            {
                "page_url": "/checkout",
                "element": "submit button",
                "description": "Button does not respond to clicks",
                "severity": "critical",
                "persona_role": "low-tech-elderly",
                "confidence": 0.2,
                "emotional_state": "frustrated",
                "task_progress": 0.0,
                "session_completed": False,
                "heuristic": "H7",
                "wcag": "2.1.1",
                "recommendation": "Add click handler",
            },
        ]
        original = runner.create_mock_result(sample_config, mock_issues)

        output_file = tmp_path / "results" / "test_result.json"
        runner.save_result(original, output_file)

        assert output_file.exists()

        loaded = runner.load_result(output_file)
        assert loaded.site_slug == original.site_slug
        assert loaded.study_id == original.study_id
        assert len(loaded.mirror_issues) == 1
        assert loaded.mirror_issues[0].severity == "critical"
        assert loaded.mirror_issues[0].confidence == 0.2
        assert loaded.mirror_issues[0].heuristic == "H7"
        assert loaded.mirror_issues[0].emotional_state == "frustrated"
        assert isinstance(loaded.config, BenchmarkRunConfig)
        assert loaded.config.site_slug == "test_site"

    def test_save_creates_parent_directories(self, runner: BenchmarkRunner, sample_config: BenchmarkRunConfig, tmp_path: Path) -> None:
        """save_result should create intermediate directories."""
        result = runner.create_mock_result(sample_config, [])
        deep_path = tmp_path / "a" / "b" / "c" / "result.json"
        runner.save_result(result, deep_path)
        assert deep_path.exists()


# ──────────────────────────────────────────────────────────────────
# Integration: runner + collector working together
# ──────────────────────────────────────────────────────────────────


class TestRunnerCollectorIntegration:
    """Integration tests verifying runner and collector work together."""

    def test_mock_result_through_collector(self, runner: BenchmarkRunner, collector: IssueCollector) -> None:
        config = runner.build_config(
            "integration",
            "https://integration.test",
            ["Complete purchase"],
        )
        mock_issues = [
            {
                "page_url": "/checkout",
                "element": "pay button",
                "description": "Pay button unresponsive",
                "severity": "critical",
                "persona_role": "low-tech-elderly",
                "confidence": 0.2,
                "emotional_state": "frustrated",
                "task_progress": 0.0,
                "session_completed": False,
            },
            {
                "page_url": "/checkout",
                "element": "discount code",
                "description": "Discount field unclear",
                "severity": "minor",
                "persona_role": "explorer-skeptical",
                "confidence": 0.9,
                "emotional_state": "confident",
                "task_progress": 90.0,
                "session_completed": True,
            },
        ]
        result = runner.create_mock_result(config, mock_issues)
        collected = collector.collect_from_result(result)
        assert len(collected) == 2

        filtered = collector.apply_all_filters(collected)
        # Issue 0: conf=0.2 passes confidence, frustrated+progress=0+not completed -> behavioral 0.9 -> kept
        # Issue 1: conf=0.9, confident, corr=1 -> fails confidence filter -> removed
        assert len(filtered) == 1
        assert filtered[0].description == "Pay button unresponsive"
