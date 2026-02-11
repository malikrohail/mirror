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
async def test_generate_persona_stub(client: AsyncClient):
    """Custom persona generation returns stub response (Agent 2 scope)."""
    response = await client.post(
        "/api/v1/personas/generate",
        json={"description": "A 55-year-old small business owner who is new to technology"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "description" in data
