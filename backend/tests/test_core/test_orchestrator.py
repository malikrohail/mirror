"""Tests for the StudyOrchestrator browser_mode passthrough."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.orchestrator import StudyOrchestrator


class TestOrchestratorBrowserMode:
    """Verify that browser_mode is correctly translated to force_local on BrowserPool."""

    @pytest.mark.asyncio
    async def test_local_mode_sets_force_local_true(self) -> None:
        """browser_mode='local' should create BrowserPool with force_local=True."""
        mock_db = AsyncMock()
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock()
        mock_redis.publish = AsyncMock()

        with patch("app.core.orchestrator.BrowserPool") as MockPool, \
             patch("app.core.orchestrator.LLMClient"), \
             patch("app.core.orchestrator.PersonaEngine"), \
             patch("app.core.orchestrator.Navigator"), \
             patch("app.core.orchestrator.Analyzer"), \
             patch("app.core.orchestrator.Synthesizer"), \
             patch("app.core.orchestrator.HeatmapGenerator"), \
             patch("app.core.orchestrator.ReportBuilder"), \
             patch("app.core.orchestrator.FirecrawlClient"):
            MockPool.return_value.initialize = AsyncMock()

            orchestrator = StudyOrchestrator(
                db=mock_db, redis=mock_redis, browser_mode="local"
            )
            await orchestrator._ensure_browser_pool()

            MockPool.assert_called_once()
            call_kwargs = MockPool.call_args[1]
            assert call_kwargs["force_local"] is True

    @pytest.mark.asyncio
    async def test_cloud_mode_sets_force_local_false(self) -> None:
        """browser_mode='cloud' should create BrowserPool with force_local=False."""
        mock_db = AsyncMock()
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock()
        mock_redis.publish = AsyncMock()

        with patch("app.core.orchestrator.BrowserPool") as MockPool, \
             patch("app.core.orchestrator.LLMClient"), \
             patch("app.core.orchestrator.PersonaEngine"), \
             patch("app.core.orchestrator.Navigator"), \
             patch("app.core.orchestrator.Analyzer"), \
             patch("app.core.orchestrator.Synthesizer"), \
             patch("app.core.orchestrator.HeatmapGenerator"), \
             patch("app.core.orchestrator.ReportBuilder"), \
             patch("app.core.orchestrator.FirecrawlClient"):
            MockPool.return_value.initialize = AsyncMock()

            orchestrator = StudyOrchestrator(
                db=mock_db, redis=mock_redis, browser_mode="cloud"
            )
            await orchestrator._ensure_browser_pool()

            MockPool.assert_called_once()
            call_kwargs = MockPool.call_args[1]
            assert call_kwargs["force_local"] is False

    @pytest.mark.asyncio
    async def test_none_mode_sets_force_local_false(self) -> None:
        """browser_mode=None should create BrowserPool with force_local=False."""
        mock_db = AsyncMock()
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock()
        mock_redis.publish = AsyncMock()

        with patch("app.core.orchestrator.BrowserPool") as MockPool, \
             patch("app.core.orchestrator.LLMClient"), \
             patch("app.core.orchestrator.PersonaEngine"), \
             patch("app.core.orchestrator.Navigator"), \
             patch("app.core.orchestrator.Analyzer"), \
             patch("app.core.orchestrator.Synthesizer"), \
             patch("app.core.orchestrator.HeatmapGenerator"), \
             patch("app.core.orchestrator.ReportBuilder"), \
             patch("app.core.orchestrator.FirecrawlClient"):
            MockPool.return_value.initialize = AsyncMock()

            orchestrator = StudyOrchestrator(
                db=mock_db, redis=mock_redis, browser_mode=None
            )
            await orchestrator._ensure_browser_pool()

            MockPool.assert_called_once()
            call_kwargs = MockPool.call_args[1]
            assert call_kwargs["force_local"] is False

    @pytest.mark.asyncio
    async def test_ensure_browser_pool_is_idempotent(self) -> None:
        """Calling _ensure_browser_pool twice should only create one pool."""
        mock_db = AsyncMock()
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock()
        mock_redis.publish = AsyncMock()

        with patch("app.core.orchestrator.BrowserPool") as MockPool, \
             patch("app.core.orchestrator.LLMClient"), \
             patch("app.core.orchestrator.PersonaEngine"), \
             patch("app.core.orchestrator.Navigator"), \
             patch("app.core.orchestrator.Analyzer"), \
             patch("app.core.orchestrator.Synthesizer"), \
             patch("app.core.orchestrator.HeatmapGenerator"), \
             patch("app.core.orchestrator.ReportBuilder"), \
             patch("app.core.orchestrator.FirecrawlClient"):
            MockPool.return_value.initialize = AsyncMock()

            orchestrator = StudyOrchestrator(
                db=mock_db, redis=mock_redis, browser_mode="local"
            )
            await orchestrator._ensure_browser_pool()
            await orchestrator._ensure_browser_pool()

            # BrowserPool should only be created once
            assert MockPool.call_count == 1


class TestOrchestratorCostTracking:
    """Verify cost tracking is initialized (Iteration 4)."""

    @pytest.mark.asyncio
    async def test_orchestrator_has_cost_tracker(self) -> None:
        """Orchestrator should initialize a CostTracker instance."""
        mock_db = AsyncMock()
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock()
        mock_redis.publish = AsyncMock()

        with patch("app.core.orchestrator.LLMClient"), \
             patch("app.core.orchestrator.PersonaEngine"), \
             patch("app.core.orchestrator.Navigator"), \
             patch("app.core.orchestrator.Analyzer"), \
             patch("app.core.orchestrator.Synthesizer"), \
             patch("app.core.orchestrator.HeatmapGenerator"), \
             patch("app.core.orchestrator.ReportBuilder"), \
             patch("app.core.orchestrator.FirecrawlClient"):
            orchestrator = StudyOrchestrator(
                db=mock_db, redis=mock_redis, browser_mode="local"
            )

            assert orchestrator._cost_tracker is not None
            breakdown = orchestrator._cost_tracker.get_breakdown()
            assert breakdown.total_cost_usd == 0.0
            assert breakdown.browser_mode == "unknown"
