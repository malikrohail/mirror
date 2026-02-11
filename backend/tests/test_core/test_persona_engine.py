"""Tests for the persona generation and behavioral modeling engine."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.core.persona_engine import PersonaEngine
from app.llm.schemas import AccessibilityNeeds, PersonaProfile


# ---------------------------------------------------------------------------
# Behavioral modifier tests
# ---------------------------------------------------------------------------

class TestGetBehavioralModifiers:
    """Test that behavioral modifiers are correctly derived from persona attributes."""

    def _make_persona(self, **overrides: Any) -> PersonaProfile:
        defaults = {
            "name": "Test User",
            "age": 30,
            "occupation": "Engineer",
            "emoji": "🧑",
            "short_description": "A test persona",
            "background": "Test background.",
            "tech_literacy": 5,
            "patience_level": 5,
            "reading_speed": 5,
            "trust_level": 5,
            "exploration_tendency": 5,
            "frustration_triggers": [],
            "goals": [],
        }
        defaults.update(overrides)
        return PersonaProfile(**defaults)

    def test_low_tech_literacy(self) -> None:
        persona = self._make_persona(tech_literacy=2)
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "LOW TECH LITERACY" in notes
        assert "icons without" in notes.lower() or "icons" in notes.lower()

    def test_moderate_tech_literacy(self) -> None:
        persona = self._make_persona(tech_literacy=5)
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "MODERATE TECH LITERACY" in notes

    def test_high_tech_literacy(self) -> None:
        persona = self._make_persona(tech_literacy=9)
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "HIGH TECH LITERACY" in notes

    def test_low_patience(self) -> None:
        persona = self._make_persona(patience_level=2)
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "LOW PATIENCE" in notes
        assert "frustrated" in notes.lower() or "gives up" in notes.lower()

    def test_high_patience(self) -> None:
        persona = self._make_persona(patience_level=9)
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "HIGH PATIENCE" in notes

    def test_skimmer(self) -> None:
        persona = self._make_persona(reading_speed=1)
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "SKIMMER" in notes

    def test_thorough_reader(self) -> None:
        persona = self._make_persona(reading_speed=10)
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "THOROUGH READER" in notes

    def test_skeptical(self) -> None:
        persona = self._make_persona(trust_level=2)
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "SKEPTICAL" in notes

    def test_trusting(self) -> None:
        persona = self._make_persona(trust_level=9)
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "TRUSTING" in notes

    def test_task_focused(self) -> None:
        persona = self._make_persona(exploration_tendency=1)
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "TASK-FOCUSED" in notes

    def test_explorer(self) -> None:
        persona = self._make_persona(exploration_tendency=9)
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "EXPLORER" in notes

    def test_accessibility_low_vision(self) -> None:
        persona = self._make_persona(
            accessibility_needs=AccessibilityNeeds(low_vision=True)
        )
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "LOW VISION" in notes

    def test_accessibility_screen_reader(self) -> None:
        persona = self._make_persona(
            accessibility_needs=AccessibilityNeeds(screen_reader=True)
        )
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "SCREEN READER" in notes

    def test_accessibility_color_blind(self) -> None:
        persona = self._make_persona(
            accessibility_needs=AccessibilityNeeds(color_blind=True)
        )
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "COLOR BLIND" in notes

    def test_accessibility_motor_impairment(self) -> None:
        persona = self._make_persona(
            accessibility_needs=AccessibilityNeeds(motor_impairment=True)
        )
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "MOTOR IMPAIRMENT" in notes

    def test_accessibility_cognitive(self) -> None:
        persona = self._make_persona(
            accessibility_needs=AccessibilityNeeds(cognitive=True)
        )
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "COGNITIVE ACCESSIBILITY" in notes

    def test_frustration_triggers_included(self) -> None:
        persona = self._make_persona(
            frustration_triggers=["slow loading", "pop-up ads", "tiny buttons"]
        )
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "SPECIFIC FRUSTRATION TRIGGERS" in notes
        assert "slow loading" in notes
        assert "pop-up ads" in notes

    def test_multiple_modifiers_combined(self) -> None:
        persona = self._make_persona(
            tech_literacy=2,
            patience_level=2,
            reading_speed=8,
            trust_level=2,
            accessibility_needs=AccessibilityNeeds(low_vision=True),
        )
        notes = PersonaEngine.get_behavioral_modifiers(persona)
        assert "LOW TECH LITERACY" in notes
        assert "LOW PATIENCE" in notes
        assert "THOROUGH READER" in notes
        assert "SKEPTICAL" in notes
        assert "LOW VISION" in notes


# ---------------------------------------------------------------------------
# LLM integration tests (mocked)
# ---------------------------------------------------------------------------

class TestPersonaGeneration:
    """Test persona generation methods with mocked LLM."""

    @pytest.fixture
    def engine(self, mock_llm_client: AsyncMock, sample_persona_profile: PersonaProfile) -> PersonaEngine:
        mock_llm_client.generate_persona_from_template.return_value = sample_persona_profile
        mock_llm_client.generate_persona_from_description.return_value = sample_persona_profile
        mock_llm_client.generate_persona.return_value = sample_persona_profile
        return PersonaEngine(mock_llm_client)

    @pytest.mark.asyncio
    async def test_generate_from_template(self, engine: PersonaEngine) -> None:
        template = {"name": "Elder", "emoji": "👴", "category": "age", "short_description": "Elderly user"}
        profile = await engine.generate_from_template(template)
        assert isinstance(profile, PersonaProfile)
        assert profile.name == "Maria Garcia"
        # Behavioral notes should be auto-populated
        assert profile.behavioral_notes != "Test notes"
        assert len(profile.behavioral_notes) > 0

    @pytest.mark.asyncio
    async def test_generate_custom(self, engine: PersonaEngine) -> None:
        profile = await engine.generate_custom("A college student who is tech-savvy")
        assert isinstance(profile, PersonaProfile)
        assert len(profile.behavioral_notes) > 0

    @pytest.mark.asyncio
    async def test_generate_random(self, engine: PersonaEngine) -> None:
        profile = await engine.generate_random()
        assert isinstance(profile, PersonaProfile)
        assert len(profile.behavioral_notes) > 0

    def test_profile_to_dict(self, sample_persona_profile: PersonaProfile) -> None:
        d = PersonaEngine.profile_to_dict(sample_persona_profile)
        assert isinstance(d, dict)
        assert d["name"] == "Maria Garcia"
        assert d["age"] == 67
        assert d["tech_literacy"] == 3
