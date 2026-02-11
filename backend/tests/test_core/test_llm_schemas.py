"""Tests for LLM schemas and JSON parsing."""

from __future__ import annotations

import json

import pytest

from app.llm.client import _parse_json_response
from app.llm.schemas import (
    AccessibilityNeeds,
    ActionType,
    EmotionalState,
    NavigationAction,
    NavigationDecision,
    PersonaProfile,
    ScreenshotAnalysis,
    Severity,
    StudySynthesis,
    UXIssue,
)


class TestPersonaProfileValidation:
    """Test PersonaProfile Pydantic validation."""

    def test_valid_persona(self) -> None:
        p = PersonaProfile(
            name="Jane Doe",
            age=30,
            occupation="Designer",
            emoji="🎨",
            short_description="A 30-year-old designer",
            background="Jane designs things.",
            tech_literacy=7,
            patience_level=5,
            reading_speed=6,
            trust_level=5,
            exploration_tendency=8,
        )
        assert p.name == "Jane Doe"

    def test_age_bounds(self) -> None:
        with pytest.raises(Exception):
            PersonaProfile(
                name="X", age=5, occupation="X", emoji="X",
                short_description="X", background="X",
                tech_literacy=5, patience_level=5, reading_speed=5,
                trust_level=5, exploration_tendency=5,
            )

    def test_tech_literacy_bounds(self) -> None:
        with pytest.raises(Exception):
            PersonaProfile(
                name="X", age=30, occupation="X", emoji="X",
                short_description="X", background="X",
                tech_literacy=15, patience_level=5, reading_speed=5,
                trust_level=5, exploration_tendency=5,
            )

    def test_defaults(self) -> None:
        p = PersonaProfile(
            name="X", age=30, occupation="X", emoji="X",
            short_description="X", background="X",
            tech_literacy=5, patience_level=5, reading_speed=5,
            trust_level=5, exploration_tendency=5,
        )
        assert p.device_preference == "desktop"
        assert p.frustration_triggers == []
        assert p.accessibility_needs.screen_reader is False


class TestNavigationDecisionValidation:
    """Test NavigationDecision schema."""

    def test_valid_decision(self) -> None:
        d = NavigationDecision(
            think_aloud="Looking at the page...",
            action=NavigationAction(
                type=ActionType.click,
                selector="#btn",
                description="Click button",
            ),
            confidence=0.9,
            task_progress=50,
            emotional_state=EmotionalState.curious,
        )
        assert d.action.type == ActionType.click
        assert d.confidence == 0.9

    def test_confidence_bounds(self) -> None:
        with pytest.raises(Exception):
            NavigationDecision(
                think_aloud="...",
                action=NavigationAction(type=ActionType.click, description="X"),
                confidence=1.5,  # Out of bounds
                task_progress=50,
            )

    def test_task_progress_bounds(self) -> None:
        with pytest.raises(Exception):
            NavigationDecision(
                think_aloud="...",
                action=NavigationAction(type=ActionType.click, description="X"),
                confidence=0.5,
                task_progress=150,  # Out of bounds
            )


class TestSeverityEnum:
    """Test severity enum values."""

    def test_all_values(self) -> None:
        assert Severity.critical.value == "critical"
        assert Severity.major.value == "major"
        assert Severity.minor.value == "minor"
        assert Severity.enhancement.value == "enhancement"


class TestParseJsonResponse:
    """Test the JSON extraction and Pydantic parsing helper."""

    def test_plain_json(self) -> None:
        raw = json.dumps({
            "name": "Test", "age": 30, "occupation": "Dev", "emoji": "🧑",
            "short_description": "Test persona", "background": "Test bg.",
            "tech_literacy": 5, "patience_level": 5, "reading_speed": 5,
            "trust_level": 5, "exploration_tendency": 5,
        })
        result = _parse_json_response(raw, PersonaProfile)
        assert result.name == "Test"
        assert result.age == 30

    def test_json_in_code_fences(self) -> None:
        raw = '```json\n{"name": "Test", "age": 30, "occupation": "Dev", "emoji": "🧑", "short_description": "X", "background": "X", "tech_literacy": 5, "patience_level": 5, "reading_speed": 5, "trust_level": 5, "exploration_tendency": 5}\n```'
        result = _parse_json_response(raw, PersonaProfile)
        assert result.name == "Test"

    def test_json_in_plain_code_fences(self) -> None:
        raw = '```\n{"name": "Test", "age": 30, "occupation": "Dev", "emoji": "🧑", "short_description": "X", "background": "X", "tech_literacy": 5, "patience_level": 5, "reading_speed": 5, "trust_level": 5, "exploration_tendency": 5}\n```'
        result = _parse_json_response(raw, PersonaProfile)
        assert result.name == "Test"

    def test_invalid_json_raises(self) -> None:
        with pytest.raises(ValueError, match="invalid JSON"):
            _parse_json_response("not json at all", PersonaProfile)

    def test_missing_required_fields_raises(self) -> None:
        raw = json.dumps({"name": "Test"})  # Missing many required fields
        with pytest.raises(Exception):
            _parse_json_response(raw, PersonaProfile)

    def test_whitespace_handling(self) -> None:
        raw = '   \n  {"name": "Test", "age": 30, "occupation": "Dev", "emoji": "🧑", "short_description": "X", "background": "X", "tech_literacy": 5, "patience_level": 5, "reading_speed": 5, "trust_level": 5, "exploration_tendency": 5}\n  '
        result = _parse_json_response(raw, PersonaProfile)
        assert result.name == "Test"
