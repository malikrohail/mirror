"""Deterministic mock LLM responses for integration testing.

Provides predictable responses for all 5 pipeline stages so the full
study pipeline can be tested without API calls or cost.
"""

from __future__ import annotations

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


def mock_persona_profile() -> PersonaProfile:
    return PersonaProfile(
        name="Test User",
        age=30,
        occupation="Software Developer",
        emoji="🧑‍💻",
        short_description="A tech-savvy user testing the site",
        background="Test persona for integration testing.",
        tech_literacy=7,
        patience_level=5,
        reading_speed=5,
        trust_level=5,
        exploration_tendency=5,
        device_preference="desktop",
        frustration_triggers=["slow load times", "confusing labels"],
        goals=["complete the task efficiently"],
        accessibility_needs=AccessibilityNeeds(),
        behavioral_notes="Standard web user behavior.",
    )


def mock_navigation_decisions(num_steps: int = 5) -> list[NavigationDecision]:
    """Generate a sequence of mock navigation decisions."""
    emotions = [
        EmotionalState.curious,
        EmotionalState.neutral,
        EmotionalState.confused,
        EmotionalState.frustrated,
        EmotionalState.satisfied,
    ]
    decisions = []

    for i in range(num_steps):
        if i < num_steps - 1:
            action = NavigationAction(
                type=ActionType.click,
                selector="button.cta-primary",
                value=None,
                description=f"Click primary CTA button (step {i + 1})",
            )
        else:
            action = NavigationAction(
                type=ActionType.done,
                selector=None,
                value=None,
                description="Task completed",
            )

        ux_issues = []
        if i == 2:
            ux_issues.append(UXIssue(
                element="button.signup",
                description="Signup button has low contrast text",
                severity=Severity.major,
                heuristic="Visibility of system status",
                wcag_criterion="1.4.3",
                recommendation="Increase text contrast ratio to at least 4.5:1",
            ))

        decisions.append(NavigationDecision(
            think_aloud=f"Step {i + 1}: Looking at the page...",
            action=action,
            ux_issues=ux_issues,
            confidence=0.8,
            task_progress=min(100, (i + 1) * 20),
            emotional_state=emotions[i % len(emotions)],
            reasoning=f"Mock reasoning for step {i + 1}",
        ))

    return decisions


def mock_screenshot_analysis() -> ScreenshotAnalysis:
    return ScreenshotAnalysis(
        page_url="https://example.com",
        page_title="Example Site",
        assessment=PageAssessment(
            visual_clarity=7,
            information_hierarchy=6,
            action_clarity=8,
            error_handling=5,
            accessibility=6,
            overall=7,
        ),
        issues=[
            UXIssue(
                element="form.signup",
                description="Form resets on validation error",
                severity=Severity.critical,
                heuristic="Error prevention",
                wcag_criterion=None,
                recommendation="Preserve form data on validation failure",
            ),
        ],
        strengths=["Clean visual layout", "Clear primary CTA"],
        summary="Generally good usability with some critical form issues.",
    )


def mock_synthesis() -> StudySynthesis:
    return StudySynthesis(
        executive_summary="Testing found 3 issues across 1 persona session. The site scores 72/100.",
        overall_ux_score=72,
        universal_issues=[
            InsightItem(
                type="universal",
                title="Form resets on error",
                description="All form data is lost when validation fails.",
                severity=Severity.critical,
                personas_affected=["Test User"],
                evidence=["Step 3: form submitted with errors, all fields cleared"],
            ),
        ],
        persona_specific_issues=[],
        comparative_insights=[],
        struggle_points=[
            StrugglePoint(
                page_url="https://example.com/signup",
                element="form.signup",
                description="Users struggle with form validation",
                personas_affected=["Test User"],
                severity=Severity.major,
            ),
        ],
        recommendations=[
            Recommendation(
                rank=1,
                title="Preserve form data on validation error",
                description="Don't clear form fields when validation fails.",
                impact="high",
                effort="low",
                personas_helped=["Test User"],
                evidence=["All personas lost their form data"],
            ),
        ],
    )


def mock_report_content() -> ReportContent:
    return ReportContent(
        title="Usability Test Report: Example Site",
        executive_summary="Testing revealed key usability issues.",
        methodology="AI-powered persona-based usability testing.",
        sections=[
            ReportSection(
                heading="Key Findings",
                content="The site has 3 issues that need attention.",
            ),
        ],
        conclusion="Fix the critical form issue first.",
        metadata={"study_url": "https://example.com", "overall_score": 72},
    )


def mock_session_summary() -> SessionSummary:
    return SessionSummary(
        task_completed=True,
        total_steps=5,
        key_struggles=["Form validation confusion"],
        key_successes=["Found CTA easily"],
        emotional_arc=[
            EmotionalState.curious,
            EmotionalState.neutral,
            EmotionalState.confused,
            EmotionalState.frustrated,
            EmotionalState.satisfied,
        ],
        summary="User completed the task in 5 steps with some frustration.",
        overall_difficulty="moderate",
    )
