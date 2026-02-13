"""Tests for Navigator retry logic and per-session timeout (Iterations 2, 3)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.navigator import Navigator, NavigationResult, _compute_visual_diff_score


class TestNavigatorTimeout:
    """Test per-session timeout (Iteration 2)."""

    @pytest.mark.asyncio
    async def test_session_timeout_returns_gave_up(self) -> None:
        """A session that exceeds the timeout should return gave_up=True."""
        mock_llm = MagicMock()
        navigator = Navigator(llm_client=mock_llm, max_steps=30)

        # Mock a browser context that hangs forever
        mock_context = AsyncMock()
        mock_page = AsyncMock()
        mock_context.new_page = AsyncMock(return_value=mock_page)

        # Make goto hang
        async def hang_forever(*args, **kwargs):
            import asyncio
            await asyncio.sleep(9999)

        mock_page.goto = hang_forever

        result = await navigator.navigate_session(
            session_id="test-session",
            persona={"name": "Test Persona"},
            task_description="Find the pricing page",
            behavioral_notes="",
            start_url="https://example.com",
            browser_context=mock_context,
            session_timeout=1,  # 1 second timeout
        )

        assert isinstance(result, NavigationResult)
        assert result.gave_up is True
        assert result.task_completed is False
        assert "timed out" in (result.error or "").lower()


class TestNavigatorRetry:
    """Test Playwright action retry logic (Iteration 2)."""

    @pytest.mark.asyncio
    async def test_action_retries_on_timeout(self) -> None:
        """Actions should be retried on TimeoutError."""
        mock_llm = MagicMock()
        mock_actions = MagicMock()

        # First call raises TimeoutError, second succeeds
        timeout_err = type("TimeoutError", (Exception,), {})
        mock_result = MagicMock()
        mock_result.success = True
        mock_actions.execute = AsyncMock(side_effect=[timeout_err(), mock_result])

        navigator = Navigator(llm_client=mock_llm, max_steps=30)
        navigator._actions = mock_actions
        navigator._action_retries = 1

        result = await navigator._execute_action_with_retry(
            page=MagicMock(), action_type="click", selector="button"
        )

        assert result is mock_result
        assert mock_actions.execute.call_count == 2


class TestScreenshotDiff:
    """Test visual diff computation (Iteration 3)."""

    def test_identical_images_score_zero(self) -> None:
        """Two identical screenshots should have diff score ~0."""
        PIL = pytest.importorskip("PIL", reason="Pillow not installed")
        np = pytest.importorskip("numpy", reason="numpy not installed")
        from PIL import Image
        import io

        # Create a simple test image
        img = Image.new("RGB", (100, 100), color="red")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        img_bytes = buf.getvalue()

        score = _compute_visual_diff_score(img_bytes, img_bytes)
        assert score == 0.0

    def test_different_images_score_positive(self) -> None:
        """Two different screenshots should have a positive diff score."""
        PIL = pytest.importorskip("PIL", reason="Pillow not installed")
        np = pytest.importorskip("numpy", reason="numpy not installed")
        from PIL import Image
        import io

        img1 = Image.new("RGB", (100, 100), color="red")
        img2 = Image.new("RGB", (100, 100), color="blue")

        buf1 = io.BytesIO()
        img1.save(buf1, format="PNG")
        buf2 = io.BytesIO()
        img2.save(buf2, format="PNG")

        score = _compute_visual_diff_score(buf1.getvalue(), buf2.getvalue())
        assert score > 0

    def test_returns_negative_on_failure(self) -> None:
        """Should return -1.0 on invalid input."""
        score = _compute_visual_diff_score(b"not an image", b"also not an image")
        assert score == -1.0
