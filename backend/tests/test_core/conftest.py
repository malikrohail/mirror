"""Shared test fixtures for core engine tests."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.llm.schemas import (
    AccessibilityNeeds,
    ActionType,
    EmotionalState,
    InsightItem,
    NavigationAction,
    NavigationDecision,
    PageAssessment,
    PersonaProfile,
    Recommendation,
    ReportContent,
    ReportSection,
    ScreenshotAnalysis,
    SessionSummary,
    Severity,
    StrugglePoint,
    StudySynthesis,
    UXIssue,
)


@pytest.fixture
def sample_persona_profile() -> PersonaProfile:
    return PersonaProfile(
        name="Maria Garcia",
        age=67,
        occupation="Retired teacher",
        emoji="👵",
        short_description="A 67-year-old retiree with limited tech skills",
        background="Maria retired from teaching 3 years ago. She uses a tablet mostly for email and Facebook.",
        tech_literacy=3,
        patience_level=7,
        reading_speed=8,
        trust_level=4,
        exploration_tendency=3,
        device_preference="tablet",
        frustration_triggers=["tiny text", "too many options", "jargon"],
        goals=["Stay connected with family", "Shop online safely"],
        accessibility_needs=AccessibilityNeeds(low_vision=True),
        behavioral_notes="Test notes",
    )


@pytest.fixture
def sample_persona_dict(sample_persona_profile: PersonaProfile) -> dict[str, Any]:
    d = sample_persona_profile.model_dump()
    d["id"] = "persona-123"
    return d


@pytest.fixture
def sample_navigation_decision() -> NavigationDecision:
    return NavigationDecision(
        think_aloud="I see a sign-up button, let me click it",
        action=NavigationAction(
            type=ActionType.click,
            selector="#signup-btn",
            value=None,
            description="Click the sign-up button",
        ),
        ux_issues=[
            UXIssue(
                element="Sign-up button",
                description="Button text is too small",
                severity=Severity.minor,
                heuristic="Visibility of system status",
                wcag_criterion="1.4.4",
                recommendation="Increase button font size to 16px",
            )
        ],
        confidence=0.85,
        task_progress=30,
        emotional_state=EmotionalState.curious,
        reasoning="The sign-up button is the logical next step",
    )


@pytest.fixture
def sample_screenshot_analysis() -> ScreenshotAnalysis:
    return ScreenshotAnalysis(
        page_url="https://example.com/signup",
        page_title="Sign Up",
        assessment=PageAssessment(
            visual_clarity=7,
            information_hierarchy=6,
            action_clarity=8,
            error_handling=5,
            accessibility=4,
            overall=6,
        ),
        issues=[
            UXIssue(
                element="Form labels",
                description="Labels are low contrast",
                severity=Severity.major,
                heuristic="Visibility of system status",
                wcag_criterion="1.4.3",
                recommendation="Increase label contrast ratio to 4.5:1",
            )
        ],
        strengths=["Clear CTA button", "Logical form layout"],
        summary="The signup page has decent structure but accessibility issues.",
    )


@pytest.fixture
def sample_study_synthesis() -> StudySynthesis:
    return StudySynthesis(
        executive_summary="The website has moderate usability with key accessibility gaps.",
        overall_ux_score=65,
        universal_issues=[
            InsightItem(
                type="universal",
                title="Low contrast text",
                description="All personas struggled with text readability",
                severity=Severity.major,
                personas_affected=["Maria", "John"],
                evidence=["Step 3: Maria couldn't read labels"],
            )
        ],
        persona_specific_issues=[
            InsightItem(
                type="persona_specific",
                title="Jargon confusion",
                description="Non-technical users confused by 'workspace'",
                severity=Severity.major,
                personas_affected=["Maria"],
                evidence=["Step 5: Maria confused by workspace label"],
            )
        ],
        comparative_insights=[],
        struggle_points=[
            StrugglePoint(
                page_url="https://example.com/signup",
                element="workspace input",
                description="Multiple personas confused by this label",
                personas_affected=["Maria", "John"],
                severity=Severity.major,
            )
        ],
        recommendations=[
            Recommendation(
                rank=1,
                title="Replace 'workspace' with 'team name'",
                description="Simplify the label for non-technical users",
                impact="high",
                effort="low",
                personas_helped=["Maria", "John"],
                evidence=["3 of 5 personas hesitated here"],
            )
        ],
    )


@pytest.fixture
def sample_report_content() -> ReportContent:
    return ReportContent(
        title="Usability Test Report: Example.com",
        executive_summary="Testing found 14 issues across 5 personas.",
        methodology="AI-driven usability testing with 5 diverse personas.",
        sections=[
            ReportSection(
                heading="Key Findings",
                content="The top finding is low-contrast text on the signup page.",
                subsections=[],
            )
        ],
        conclusion="Addressing the top 3 recommendations would significantly improve UX.",
        metadata={"study_url": "https://example.com", "num_personas": 5},
    )


@pytest.fixture
def sample_session_summary() -> SessionSummary:
    return SessionSummary(
        task_completed=True,
        total_steps=12,
        key_struggles=["Confused by workspace label"],
        key_successes=["Found the pricing page easily"],
        emotional_arc=[
            EmotionalState.curious,
            EmotionalState.confused,
            EmotionalState.frustrated,
            EmotionalState.satisfied,
        ],
        summary="Maria completed the task in 12 steps with some confusion.",
        overall_difficulty="moderate",
    )


@pytest.fixture
def mock_llm_client() -> AsyncMock:
    """Create a mock LLM client with all methods as AsyncMocks."""
    client = AsyncMock()
    client.usage = MagicMock()
    client.usage.to_dict.return_value = {
        "input_tokens": 1000,
        "output_tokens": 500,
        "total_tokens": 1500,
        "api_calls": 10,
    }
    return client
