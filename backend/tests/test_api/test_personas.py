"""Tests for persona template endpoints."""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.persona import PersonaTemplate
from tests.conftest import make_template_data


async def _seed_templates(db_session: AsyncSession, count: int = 3) -> list[str]:
    """Seed multiple persona templates."""
    ids = []
    categories = ["General", "Accessibility", "Industry"]
    for i in range(count):
        data = make_template_data(
            name=f"Persona {i}",
            category=categories[i % len(categories)],
        )
        template = PersonaTemplate(**data)
        db_session.add(template)
        await db_session.flush()
        ids.append(str(template.id))
    return ids


@pytest.mark.asyncio
async def test_list_templates(client: AsyncClient, db_session: AsyncSession):
    """Listing templates returns all seeded templates."""
    await _seed_templates(db_session, count=3)

    response = await client.get("/api/v1/personas/templates")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3


@pytest.mark.asyncio
async def test_list_templates_by_category(client: AsyncClient, db_session: AsyncSession):
    """Filtering templates by category works."""
    await _seed_templates(db_session, count=3)

    response = await client.get("/api/v1/personas/templates?category=General")
    assert response.status_code == 200
    data = response.json()
    for t in data:
        assert t["category"] == "General"


@pytest.mark.asyncio
async def test_get_template(client: AsyncClient, db_session: AsyncSession):
    """Getting a template by ID returns its details."""
    ids = await _seed_templates(db_session, count=1)

    response = await client.get(f"/api/v1/personas/templates/{ids[0]}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == ids[0]
    assert "default_profile" in data


@pytest.mark.asyncio
async def test_generate_persona_stub(client: AsyncClient, db_session: AsyncSession):
    """Custom persona generation returns a saved template via mocked LLM.

    The endpoint calls db.commit() + db.refresh() which conflicts with the
    test session's transactional scope. We patch commit to be flush (keeps
    data in the transaction) and refresh to be a no-op, then also patch the
    LLMClient to avoid real API calls.
    """
    from unittest.mock import AsyncMock, patch, MagicMock

    from app.llm.schemas import PersonaProfile

    fake_profile = PersonaProfile(
        name="Gerry",
        age=55,
        occupation="Small business owner",
        emoji="🧑‍💼",
        short_description="A 55-year-old small business owner new to technology",
        background="Runs a local bakery, recently started selling online.",
        tech_literacy=3,
        patience_level=5,
        reading_speed=6,
        trust_level=5,
        exploration_tendency=4,
        device_preference="desktop",
        frustration_triggers=["complex forms", "jargon"],
        goals=["manage online store"],
    )

    # Build a mock LLMClient that returns our fake profile
    mock_llm_instance = MagicMock()
    mock_llm_instance.generate_persona_from_description = AsyncMock(
        return_value=fake_profile
    )

    # Replace commit → flush and refresh → no-op to work within test transaction
    original_commit = db_session.commit
    original_refresh = db_session.refresh

    async def fake_commit():
        await db_session.flush()

    async def fake_refresh(obj, *args, **kwargs):
        pass  # Skip refresh — object is already in session from flush

    db_session.commit = fake_commit  # type: ignore[assignment]
    db_session.refresh = fake_refresh  # type: ignore[assignment]

    try:
        # The import is deferred (inside the endpoint function), so we patch at the source
        with patch("app.llm.client.LLMClient", return_value=mock_llm_instance):
            response = await client.post(
                "/api/v1/personas/generate",
                json={
                    "description": "A 55-year-old small business owner who is new to technology"
                },
            )
    finally:
        db_session.commit = original_commit  # type: ignore[assignment]
        db_session.refresh = original_refresh  # type: ignore[assignment]

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Gerry"
    assert "default_profile" in data
