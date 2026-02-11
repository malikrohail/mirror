"""Integration tests for the full study pipeline with mocked LLM.

Tests the complete flow:
1. Create study via API
2. Verify study in DB
3. Test StepRecorder saves steps and issues
4. Test insight persistence
5. Test heatmap data aggregation
6. Test emotional journey endpoint
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.step_recorder import DatabaseStepRecorder
from app.models.insight import Insight, InsightType
from app.models.issue import Issue, IssueSeverity
from app.models.persona import Persona, PersonaTemplate
from app.models.session import Session, SessionStatus
from app.models.step import Step
from app.models.study import Study, StudyStatus
from app.models.task import Task
from tests.test_integration.mock_llm import (
    mock_navigation_decisions,
    mock_persona_profile,
    mock_synthesis,
)


@pytest_asyncio.fixture
async def sample_study(db_session: AsyncSession):
    """Create a sample study with task, persona, and session."""
    study = Study(url="https://example.com", starting_path="/", status=StudyStatus.SETUP)
    db_session.add(study)
    await db_session.flush()

    task = Task(study_id=study.id, description="Sign up for an account", order_index=0)
    db_session.add(task)
    await db_session.flush()

    template = PersonaTemplate(
        name="Test Persona",
        emoji="🧪",
        category="testing",
        short_description="A test persona",
        default_profile={"name": "Test User", "age": 30},
    )
    db_session.add(template)
    await db_session.flush()

    persona = Persona(
        study_id=study.id,
        template_id=template.id,
        profile={"name": "Test User", "emoji": "🧪"},
        is_custom=False,
    )
    db_session.add(persona)
    await db_session.flush()

    session = Session(
        study_id=study.id,
        persona_id=persona.id,
        task_id=task.id,
        status=SessionStatus.PENDING,
    )
    db_session.add(session)
    await db_session.flush()

    return study, task, persona, session


@pytest.mark.asyncio
async def test_step_recorder_saves_steps(
    db_session: AsyncSession,
    mock_redis,
    mock_storage,
    sample_study,
):
    """Test that DatabaseStepRecorder correctly saves steps to DB."""
    study, task, persona, session = sample_study

    recorder = DatabaseStepRecorder(
        db=db_session,
        redis=mock_redis,
        storage=mock_storage,
        study_id=study.id,
    )

    decisions = mock_navigation_decisions(3)

    for i, decision in enumerate(decisions):
        await recorder.save_step(
            session_id=str(session.id),
            step_number=i + 1,
            screenshot=b"fake-png-data",
            decision=decision,
            page_url="https://example.com",
            page_title="Example",
            viewport_width=1920,
            viewport_height=1080,
            click_x=100 if i == 0 else None,
            click_y=200 if i == 0 else None,
        )

    await db_session.flush()

    # Verify steps in DB
    result = await db_session.execute(
        select(Step).where(Step.session_id == session.id).order_by(Step.step_number)
    )
    steps = list(result.scalars().all())
    assert len(steps) == 3
    assert steps[0].step_number == 1
    assert steps[0].think_aloud == "Step 1: Looking at the page..."
    assert steps[0].click_x == 100


@pytest.mark.asyncio
async def test_step_recorder_saves_issues(
    db_session: AsyncSession,
    mock_redis,
    mock_storage,
    sample_study,
):
    """Test that issues from navigation decisions are persisted."""
    study, task, persona, session = sample_study

    recorder = DatabaseStepRecorder(
        db=db_session,
        redis=mock_redis,
        storage=mock_storage,
        study_id=study.id,
    )

    # Step 3 has a UX issue in mock data
    decisions = mock_navigation_decisions(5)
    for i, decision in enumerate(decisions):
        await recorder.save_step(
            session_id=str(session.id),
            step_number=i + 1,
            screenshot=b"fake-png",
            decision=decision,
            page_url="https://example.com/signup",
            page_title="Signup",
            viewport_width=1920,
            viewport_height=1080,
            click_x=None,
            click_y=None,
        )

    await db_session.flush()

    # Verify issues
    result = await db_session.execute(
        select(Issue).where(Issue.study_id == study.id)
    )
    issues = list(result.scalars().all())
    assert len(issues) >= 1
    assert any("contrast" in i.description.lower() for i in issues)


@pytest.mark.asyncio
async def test_step_recorder_publishes_events(
    db_session: AsyncSession,
    mock_redis,
    mock_storage,
    sample_study,
):
    """Test that step events are published to Redis."""
    study, task, persona, session = sample_study

    recorder = DatabaseStepRecorder(
        db=db_session,
        redis=mock_redis,
        storage=mock_storage,
        study_id=study.id,
    )

    decisions = mock_navigation_decisions(2)
    for i, decision in enumerate(decisions):
        await recorder.publish_step_event(
            session_id=str(session.id),
            persona_name="Test User",
            step_number=i + 1,
            decision=decision,
            screenshot_url=f"{session.id}/steps/step_{i + 1:03d}.png",
        )

    assert mock_redis.publish.call_count >= 2


@pytest.mark.asyncio
async def test_insight_persistence(
    db_session: AsyncSession,
    sample_study,
):
    """Test that synthesis insights are saved to the insights table."""
    study, task, persona, session = sample_study

    synthesis = mock_synthesis()

    # Save insights (mimicking orchestrator._save_insights)
    for item in synthesis.universal_issues:
        insight = Insight(
            study_id=study.id,
            type=InsightType.UNIVERSAL,
            title=item.title,
            description=item.description,
            severity=item.severity.value,
            personas_affected=item.personas_affected,
            evidence=item.evidence,
            rank=1,
        )
        db_session.add(insight)

    for rec in synthesis.recommendations:
        insight = Insight(
            study_id=study.id,
            type=InsightType.RECOMMENDATION,
            title=rec.title,
            description=rec.description,
            impact=rec.impact,
            effort=rec.effort,
            rank=rec.rank,
        )
        db_session.add(insight)

    await db_session.flush()

    # Verify insights
    result = await db_session.execute(
        select(Insight).where(Insight.study_id == study.id)
    )
    insights = list(result.scalars().all())
    assert len(insights) >= 2  # At least 1 universal + 1 recommendation
    assert any(i.type == InsightType.UNIVERSAL for i in insights)
    assert any(i.type == InsightType.RECOMMENDATION for i in insights)


@pytest.mark.asyncio
async def test_heatmap_data_query(
    db_session: AsyncSession,
    sample_study,
):
    """Test that heatmap data can be queried from steps with click positions."""
    study, task, persona, session = sample_study

    # Create steps with click data
    for i in range(5):
        step = Step(
            session_id=session.id,
            step_number=i + 1,
            page_url="https://example.com",
            click_x=100 + i * 50,
            click_y=200 + i * 30,
            viewport_width=1920,
            viewport_height=1080,
        )
        db_session.add(step)

    await db_session.flush()

    # Query heatmap data
    from app.services.session_service import SessionService
    svc = SessionService(db_session)
    heatmap = await svc.get_heatmap_data(study.id)

    assert heatmap["total_clicks"] == 5
    assert len(heatmap["data_points"]) == 5
