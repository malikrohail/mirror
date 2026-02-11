"""Shared test fixtures for the Mirror backend test suite."""

import asyncio
import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.dependencies import get_db, get_redis
from app.main import create_app
from app.models.base import Base


# Use a separate test database URL (SQLite async for tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"


@pytest.fixture(scope="session")
def event_loop():
    """Create a session-scoped event loop."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create a test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional database session that rolls back after each test."""
    session_factory = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        async with session.begin():
            yield session
            await session.rollback()


class FakeRedis:
    """Minimal fake Redis for testing without a real Redis instance."""

    def __init__(self):
        self._data: dict[str, str] = {}
        self._channels: dict[str, list] = {}

    async def ping(self):
        return True

    async def get(self, key: str):
        return self._data.get(key)

    async def set(self, key: str, value: str, **kwargs):
        self._data[key] = value

    async def publish(self, channel: str, message: str):
        if channel not in self._channels:
            self._channels[channel] = []
        self._channels[channel].append(message)

    async def close(self):
        pass


@pytest.fixture
def fake_redis():
    return FakeRedis()


@pytest_asyncio.fixture
async def client(db_session, fake_redis) -> AsyncGenerator[AsyncClient, None]:
    """Provide an async HTTP test client with dependency overrides."""
    app = create_app()

    async def override_db():
        yield db_session

    async def override_redis():
        return fake_redis

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_redis] = override_redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# --- Factory helpers ---


def make_template_data(name: str | None = None, category: str = "General") -> dict:
    """Create persona template data for testing."""
    return {
        "name": name or f"Test Persona {uuid.uuid4().hex[:6]}",
        "emoji": "🧪",
        "category": category,
        "short_description": "A test persona for automated testing",
        "default_profile": {
            "name": "Test",
            "age": 30,
            "occupation": "Tester",
            "tech_literacy": "moderate",
            "patience_level": "moderate",
            "reading_speed": "normal",
            "trust_level": "moderate",
        },
    }
