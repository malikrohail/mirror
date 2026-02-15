"""Tests for PR#10 backend fixes — verifies all critical/high priority items.

Run with: cd backend && python -m pytest tests/test_api/test_backend_fixes.py -v
"""

import json
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.issue import Issue, IssueSeverity
from app.models.insight import Insight, InsightType
from app.models.persona import PersonaTemplate
from app.models.session import Session, SessionStatus
from app.models.step import Step
from app.models.study import Study, StudyStatus
from app.models.task import Task
from tests.conftest import make_template_data


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_full_study(db_session: AsyncSession) -> dict:
    """Create a study with tasks, personas, sessions, steps, issues, and insights.

    Returns dict with all IDs for later assertions.
    """
    # Template
    tpl = PersonaTemplate(**make_template_data())
    db_session.add(tpl)
    await db_session.flush()

    # Study
    study = Study(url="https://example.com", starting_path="/")
    db_session.add(study)
    await db_session.flush()

    # Task
    task = Task(study_id=study.id, description="Find pricing", order_index=0)
    db_session.add(task)
    await db_session.flush()

    # Persona
    from app.models.persona import Persona

    persona = Persona(
        study_id=study.id,
        template_id=tpl.id,
        profile=tpl.default_profile,
    )
    db_session.add(persona)
    await db_session.flush()

    # Session
    session = Session(
        study_id=study.id,
        persona_id=persona.id,
        task_id=task.id,
        status=SessionStatus.COMPLETE,
        total_steps=3,
    )
    db_session.add(session)
    await db_session.flush()

    # Steps
    step_ids = []
    for i in range(1, 4):
        step = Step(
            session_id=session.id,
            step_number=i,
            page_url=f"https://example.com/page{i}",
            page_title=f"Page {i}",
            think_aloud=f"Looking at page {i}",
            action_type="click",
            emotional_state="curious",
            task_progress=i * 30,
            viewport_width=1280,
            viewport_height=720,
        )
        db_session.add(step)
        await db_session.flush()
        step_ids.append(step.id)

    # Issues (linked to session AND study AND step)
    issue = Issue(
        step_id=step_ids[0],
        session_id=session.id,
        study_id=study.id,
        element="button#submit",
        description="Button too small for mobile",
        severity=IssueSeverity.MAJOR,
        page_url="https://example.com/page1",
    )
    db_session.add(issue)
    await db_session.flush()

    # Insight
    insight = Insight(
        study_id=study.id,
        type=InsightType.UNIVERSAL,
        title="Small buttons",
        description="Multiple personas struggled with button sizes",
        rank=1,
    )
    db_session.add(insight)
    await db_session.flush()

    return {
        "study_id": study.id,
        "task_id": task.id,
        "persona_id": persona.id,
        "session_id": session.id,
        "step_ids": step_ids,
        "issue_id": issue.id,
        "insight_id": insight.id,
        "template_id": tpl.id,
    }


# ===========================================================================
# 1. Delete cascade — CRITICAL
# ===========================================================================


@pytest.mark.asyncio
async def test_delete_study_cascades_all_children(
    client: AsyncClient, db_session: AsyncSession
):
    """DELETE /studies/{id} should succeed even when the study has
    sessions, steps, issues, and insights (FK cascade)."""
    ids = await _create_full_study(db_session)
    study_id = ids["study_id"]

    response = await client.delete(f"/api/v1/studies/{study_id}")
    assert response.status_code == 204, (
        f"Delete should succeed with cascade; got {response.status_code}: "
        f"{response.text}"
    )

    # Confirm the study is gone
    response = await client.get(f"/api/v1/studies/{study_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent_study_returns_404(client: AsyncClient):
    """Deleting a study that doesn't exist returns 404."""
    fake_id = str(uuid.uuid4())
    response = await client.delete(f"/api/v1/studies/{fake_id}")
    assert response.status_code == 404


# ===========================================================================
# 2. Browser viewport — MEDIUM
# ===========================================================================


def test_desktop_viewport_preset_is_1280x720():
    """The 'desktop' viewport preset should be 1280x720 (not 1920x1080)."""
    from app.browser.pool import VIEWPORT_PRESETS

    desktop = VIEWPORT_PRESETS["desktop"]
    assert desktop.width == 1280
    assert desktop.height == 720


def test_laptop_viewport_preset_exists():
    """A 'laptop' preset should exist at 1366x768."""
    from app.browser.pool import VIEWPORT_PRESETS

    laptop = VIEWPORT_PRESETS["laptop"]
    assert laptop.width == 1366
    assert laptop.height == 768


# ===========================================================================
# 3. Step recorder uses lock — HIGH
# ===========================================================================


def test_step_recorder_has_db_lock():
    """DatabaseStepRecorder must have an asyncio.Lock to serialize DB writes."""
    import asyncio
    from unittest.mock import MagicMock

    from app.core.step_recorder import DatabaseStepRecorder

    recorder = DatabaseStepRecorder(
        db=MagicMock(),
        redis=MagicMock(),
        storage=MagicMock(),
        study_id=uuid.uuid4(),
    )
    assert hasattr(recorder, "_db_lock")
    assert isinstance(recorder._db_lock, asyncio.Lock)


# ===========================================================================
# 4. POST /personas/recommend — HIGH
# ===========================================================================


@pytest.mark.asyncio
async def test_recommend_endpoint_exists(
    client: AsyncClient, db_session: AsyncSession
):
    """POST /personas/recommend should respond (not 404/405).
    Seeds templates first so the endpoint doesn't 404 on empty DB.
    May return 502 if no ANTHROPIC_API_KEY is set (expected in CI).
    """
    # Seed some templates so the endpoint has data to work with
    for i in range(5):
        tpl = PersonaTemplate(**make_template_data(name=f"Recommend Persona {i}"))
        db_session.add(tpl)
    await db_session.flush()

    response = await client.post(
        "/api/v1/personas/recommend",
        json={"url": "https://example.com", "task_description": "Buy a product"},
    )
    # May return 502 (no API key) or 200, but NOT 404 or 405
    assert response.status_code not in (404, 405), (
        f"Endpoint should exist; got {response.status_code}"
    )


@pytest.mark.asyncio
async def test_recommend_validation_rejects_empty(client: AsyncClient):
    """POST /personas/recommend with empty fields returns 422."""
    response = await client.post(
        "/api/v1/personas/recommend",
        json={"url": "", "task_description": ""},
    )
    assert response.status_code == 422


# ===========================================================================
# 5. GET /studies/estimate — HIGH
# ===========================================================================


@pytest.mark.asyncio
async def test_quick_estimate_endpoint(client: AsyncClient):
    """GET /studies/estimate returns cost estimate without a saved study."""
    response = await client.get("/api/v1/studies/estimate?personas=3&tasks=2")
    assert response.status_code == 200
    data = response.json()
    assert "estimated_cost_usd" in data
    assert "breakdown" in data
    assert "estimated_duration_seconds" in data
    assert data["num_personas"] == 3
    assert data["num_tasks"] == 2
    assert data["estimated_sessions"] == 6  # 3 * 2
    assert data["estimated_cost_usd"] > 0


@pytest.mark.asyncio
async def test_quick_estimate_defaults(client: AsyncClient):
    """GET /studies/estimate with no params defaults to 1 persona, 1 task."""
    response = await client.get("/api/v1/studies/estimate")
    assert response.status_code == 200
    data = response.json()
    assert data["num_personas"] == 1
    assert data["num_tasks"] == 1


@pytest.mark.asyncio
async def test_quick_estimate_validation(client: AsyncClient):
    """GET /studies/estimate rejects personas > 10."""
    response = await client.get("/api/v1/studies/estimate?personas=50")
    assert response.status_code == 422


def test_cost_estimator_quick_estimate():
    """CostEstimator.quick_estimate returns correct structure."""
    from app.services.cost_estimator import CostEstimator

    estimate = CostEstimator.quick_estimate(2, 3)
    assert estimate.num_personas == 2
    assert estimate.num_tasks == 3
    assert estimate.estimated_sessions == 6
    assert estimate.estimated_cost_usd > 0
    assert estimate.breakdown.navigation_steps > 0
    assert estimate.estimated_duration_seconds > 0


# ===========================================================================
# 6. PersonaTemplateOut model/cost fields — HIGH
# ===========================================================================


def test_persona_template_out_has_model_and_cost_fields():
    """PersonaTemplateOut should include model_display_name and estimated_cost."""
    from app.schemas.persona import PersonaTemplateOut
    import datetime

    out = PersonaTemplateOut(
        id=uuid.uuid4(),
        name="Test Persona",
        emoji="🧪",
        category="General",
        short_description="A test persona",
        created_at=datetime.datetime.now(),
    )
    assert hasattr(out, "model_display_name")
    assert out.model_display_name == "Opus 4.6"
    assert hasattr(out, "estimated_cost_per_run_usd")
    assert out.estimated_cost_per_run_usd == 0.40


@pytest.mark.asyncio
async def test_templates_api_returns_model_and_cost(
    client: AsyncClient, db_session: AsyncSession
):
    """GET /personas/templates should include model and cost in response."""
    tpl = PersonaTemplate(**make_template_data())
    db_session.add(tpl)
    await db_session.flush()

    response = await client.get("/api/v1/personas/templates")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    first = data[0]
    assert "model_display_name" in first
    assert "estimated_cost_per_run_usd" in first
    assert first["model_display_name"] == "Opus 4.6"
    assert first["estimated_cost_per_run_usd"] == 0.40


# ===========================================================================
# 7. Per-session live state — HIGH
# ===========================================================================


@pytest.mark.asyncio
async def test_live_state_is_per_session():
    """LiveSessionStateStore stores and returns per-session data."""
    from unittest.mock import AsyncMock
    from app.services.live_session_state import LiveSessionStateStore

    # Minimal fake Redis with hash support
    class FakeHashRedis:
        def __init__(self):
            self._hashes: dict[str, dict[str, str]] = {}

        async def hget(self, key, field):
            return self._hashes.get(key, {}).get(field)

        async def hset(self, key, field, value):
            self._hashes.setdefault(key, {})[field] = value

        async def hgetall(self, key):
            return self._hashes.get(key, {})

        async def expire(self, key, ttl):
            pass

        async def delete(self, key):
            self._hashes.pop(key, None)
            return 1

    redis = FakeHashRedis()
    store = LiveSessionStateStore(redis)

    study_id = str(uuid.uuid4())
    session_a = str(uuid.uuid4())
    session_b = str(uuid.uuid4())

    # Upsert two different sessions
    await store.upsert(study_id, session_a, {
        "persona_name": "Alice",
        "step_number": 3,
        "screenshot_url": "/screenshots/alice_step3.png",
    })
    await store.upsert(study_id, session_b, {
        "persona_name": "Bob",
        "step_number": 7,
        "screenshot_url": "/screenshots/bob_step7.png",
    })

    # Snapshot should have both sessions with distinct data
    snapshot = await store.get_study_snapshot(study_id)
    assert session_a in snapshot
    assert session_b in snapshot
    assert snapshot[session_a]["persona_name"] == "Alice"
    assert snapshot[session_b]["persona_name"] == "Bob"
    assert snapshot[session_a]["step_number"] == 3
    assert snapshot[session_b]["step_number"] == 7


# ===========================================================================
# 8. Session.issues cascade — fix for delete
# ===========================================================================


def test_session_model_issues_cascade():
    """Session.issues relationship should have cascade='all, delete-orphan'."""
    from app.models.session import Session as SessionModel

    issues_rel = SessionModel.__mapper__.relationships.get("issues")
    assert issues_rel is not None
    assert "delete" in issues_rel.cascade
    assert "delete-orphan" in issues_rel.cascade


def test_study_model_all_cascades():
    """Study model should have cascade on tasks, personas, sessions, issues, insights."""
    from app.models.study import Study as StudyModel

    for rel_name in ("tasks", "personas", "sessions", "issues", "insights"):
        rel = StudyModel.__mapper__.relationships.get(rel_name)
        assert rel is not None, f"Relationship '{rel_name}' not found"
        assert "delete" in rel.cascade, (
            f"Relationship '{rel_name}' missing delete cascade"
        )
        assert "delete-orphan" in rel.cascade, (
            f"Relationship '{rel_name}' missing delete-orphan cascade"
        )
