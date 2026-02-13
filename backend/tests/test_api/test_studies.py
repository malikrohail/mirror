"""Tests for study CRUD and run endpoints."""

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.persona import PersonaTemplate
from tests.conftest import make_template_data


async def _seed_template(db_session: AsyncSession) -> str:
    """Seed a persona template and return its ID."""
    data = make_template_data()
    template = PersonaTemplate(**data)
    db_session.add(template)
    await db_session.flush()
    return str(template.id)


@pytest.mark.asyncio
async def test_create_study(client: AsyncClient, db_session: AsyncSession):
    """Creating a study returns 201 with study data."""
    template_id = await _seed_template(db_session)

    response = await client.post(
        "/api/v1/studies",
        json={
            "url": "https://example.com",
            "starting_path": "/",
            "tasks": [{"description": "Find the pricing page"}],
            "persona_template_ids": [template_id],
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["url"] == "https://example.com"
    assert data["status"] == "setup"
    assert len(data["tasks"]) == 1
    assert len(data["personas"]) == 1


@pytest.mark.asyncio
async def test_list_studies(client: AsyncClient, db_session: AsyncSession):
    """Listing studies returns paginated results."""
    template_id = await _seed_template(db_session)

    # Create a study first
    await client.post(
        "/api/v1/studies",
        json={
            "url": "https://example.com",
            "tasks": [{"description": "Test task"}],
            "persona_template_ids": [template_id],
        },
    )

    response = await client.get("/api/v1/studies")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_study(client: AsyncClient, db_session: AsyncSession):
    """Getting a study by ID returns the study with tasks and personas."""
    template_id = await _seed_template(db_session)

    create_resp = await client.post(
        "/api/v1/studies",
        json={
            "url": "https://example.com",
            "tasks": [{"description": "Test"}],
            "persona_template_ids": [template_id],
        },
    )
    study_id = create_resp.json()["id"]

    response = await client.get(f"/api/v1/studies/{study_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == study_id
    assert len(data["tasks"]) == 1


@pytest.mark.asyncio
async def test_get_study_not_found(client: AsyncClient):
    """Getting a nonexistent study returns 404."""
    fake_id = str(uuid.uuid4())
    response = await client.get(f"/api/v1/studies/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_study(client: AsyncClient, db_session: AsyncSession):
    """Deleting a study returns 204."""
    template_id = await _seed_template(db_session)

    create_resp = await client.post(
        "/api/v1/studies",
        json={
            "url": "https://example.com",
            "tasks": [{"description": "Test"}],
            "persona_template_ids": [template_id],
        },
    )
    study_id = create_resp.json()["id"]

    response = await client.delete(f"/api/v1/studies/{study_id}")
    assert response.status_code == 204

    # Confirm it's gone
    response = await client.get(f"/api/v1/studies/{study_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_study_validation(client: AsyncClient):
    """Creating a study with invalid data returns 422."""
    response = await client.post(
        "/api/v1/studies",
        json={
            "url": "",  # empty URL should fail
            "tasks": [],  # empty tasks should fail
            "persona_template_ids": [],
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_run_study_with_local_browser_mode(client: AsyncClient, db_session: AsyncSession):
    """Running a study with browser_mode=local returns 200."""
    template_id = await _seed_template(db_session)

    create_resp = await client.post(
        "/api/v1/studies",
        json={
            "url": "https://example.com",
            "tasks": [{"description": "Test task"}],
            "persona_template_ids": [template_id],
        },
    )
    study_id = create_resp.json()["id"]

    response = await client.post(f"/api/v1/studies/{study_id}/run?browser_mode=local")
    assert response.status_code == 200
    data = response.json()
    assert data["study_id"] == study_id


@pytest.mark.asyncio
async def test_run_study_with_cloud_browser_mode(client: AsyncClient, db_session: AsyncSession):
    """Running a study with browser_mode=cloud returns 200."""
    template_id = await _seed_template(db_session)

    create_resp = await client.post(
        "/api/v1/studies",
        json={
            "url": "https://example.com",
            "tasks": [{"description": "Test task"}],
            "persona_template_ids": [template_id],
        },
    )
    study_id = create_resp.json()["id"]

    response = await client.post(f"/api/v1/studies/{study_id}/run?browser_mode=cloud")
    assert response.status_code == 200
    data = response.json()
    assert data["study_id"] == study_id


@pytest.mark.asyncio
async def test_run_study_with_invalid_browser_mode(client: AsyncClient, db_session: AsyncSession):
    """Running a study with an invalid browser_mode returns 422."""
    template_id = await _seed_template(db_session)

    create_resp = await client.post(
        "/api/v1/studies",
        json={
            "url": "https://example.com",
            "tasks": [{"description": "Test task"}],
            "persona_template_ids": [template_id],
        },
    )
    study_id = create_resp.json()["id"]

    response = await client.post(f"/api/v1/studies/{study_id}/run?browser_mode=invalid")
    assert response.status_code == 422
