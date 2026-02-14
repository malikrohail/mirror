"""Fix preview service — inject fixes into live browser and generate before/after diffs."""

from __future__ import annotations

import asyncio
import base64
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

# Timeout for each browser operation (navigate, screenshot, inject).
_OP_TIMEOUT_MS = 10_000  # 10 seconds


@dataclass
class FixPreviewResult:
    """Result of a fix preview operation."""

    success: bool
    before_screenshot: bytes | None = None
    after_screenshot: bytes | None = None
    diff_screenshot: bytes | None = None
    before_path: str | None = None
    after_path: str | None = None
    diff_path: str | None = None
    before_base64: str | None = None
    after_base64: str | None = None
    diff_base64: str | None = None
    error: str | None = None


class FixPreviewService:
    """Injects CSS/JS/HTML fixes into a live browser and generates visual diffs.

    Workflow:
        1. Open headless browser and navigate to the page.
        2. Take a *before* screenshot.
        3. Inject the fix code (CSS via ``add_style_tag``, JS via ``evaluate``).
        4. Take an *after* screenshot.
        5. Generate a pixel-level diff image (changed pixels highlighted in red).
        6. Persist all three images and return paths + base64 payloads.
    """

    def __init__(self, storage_path: str | None = None) -> None:
        self._storage_path = storage_path or os.getenv("STORAGE_PATH", "./data")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def preview_fix(
        self,
        page_url: str,
        fix_code: str,
        fix_language: str,
        study_id: str,
        issue_id: str,
    ) -> FixPreviewResult:
        """Run the full preview pipeline: navigate, screenshot, inject, diff.

        Args:
            page_url: URL of the page to test the fix against.
            fix_code: The CSS, JS, or HTML snippet to inject.
            fix_language: One of ``"css"``, ``"javascript"``, ``"html"``.
            study_id: Owning study (used for storage path).
            issue_id: Issue being fixed (used for storage path).

        Returns:
            A ``FixPreviewResult`` with screenshots and paths, or an error.
        """
        playwright = None
        browser = None
        try:
            playwright = await async_playwright().start()
            browser = await playwright.chromium.launch(
                headless=True,
                args=[
                    "--disable-gpu",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                ],
            )

            context = await browser.new_context(
                viewport={"width": 1920, "height": 1080},
                ignore_https_errors=True,
            )
            page = await context.new_page()

            # 1. Navigate to the target page
            try:
                await page.goto(page_url, wait_until="networkidle", timeout=_OP_TIMEOUT_MS)
            except Exception as nav_err:
                # Fall back to 'load' event if networkidle times out
                logger.warning(
                    "networkidle timed out for %s, retrying with 'load': %s",
                    page_url,
                    nav_err,
                )
                await page.goto(page_url, wait_until="load", timeout=_OP_TIMEOUT_MS)

            # 2. Before screenshot
            before_bytes = await page.screenshot(
                full_page=False,
                timeout=_OP_TIMEOUT_MS,
            )

            # 3. Inject the fix
            await self._inject_fix(page, fix_code, fix_language)

            # Allow a brief moment for the DOM to settle after injection
            await page.wait_for_timeout(500)

            # 4. After screenshot
            after_bytes = await page.screenshot(
                full_page=False,
                timeout=_OP_TIMEOUT_MS,
            )

            # 5. Generate diff
            diff_bytes = await self._generate_diff(before_bytes, after_bytes)

            # 6. Persist
            before_path = self._save_image(study_id, issue_id, "before", before_bytes)
            after_path = self._save_image(study_id, issue_id, "after", after_bytes)
            diff_path = self._save_image(study_id, issue_id, "diff", diff_bytes)

            return FixPreviewResult(
                success=True,
                before_screenshot=before_bytes,
                after_screenshot=after_bytes,
                diff_screenshot=diff_bytes,
                before_path=before_path,
                after_path=after_path,
                diff_path=diff_path,
                before_base64=base64.b64encode(before_bytes).decode("ascii"),
                after_base64=base64.b64encode(after_bytes).decode("ascii"),
                diff_base64=base64.b64encode(diff_bytes).decode("ascii"),
            )

        except Exception as exc:
            logger.exception("Fix preview failed for issue %s: %s", issue_id, exc)
            return FixPreviewResult(success=False, error=str(exc))

        finally:
            if browser:
                try:
                    await browser.close()
                except Exception:
                    pass
            if playwright:
                try:
                    await playwright.stop()
                except Exception:
                    pass

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    async def _inject_fix(self, page: Any, fix_code: str, fix_language: str) -> None:
        """Inject a code fix into the page.

        Args:
            page: Playwright ``Page`` instance.
            fix_code: The snippet to inject.
            fix_language: ``"css"`` | ``"javascript"`` | ``"html"``.

        Raises:
            ValueError: If ``fix_language`` is not recognised.
        """
        language = fix_language.lower().strip()

        if language == "css":
            await page.add_style_tag(content=fix_code)
        elif language in {"javascript", "js"}:
            await page.evaluate(fix_code)
        elif language == "html":
            # Inject HTML by appending to <body>
            await page.evaluate(
                """(html) => {
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = html;
                    while (wrapper.firstChild) {
                        document.body.appendChild(wrapper.firstChild);
                    }
                }""",
                fix_code,
            )
        else:
            raise ValueError(
                f"Unsupported fix_language '{fix_language}'. "
                "Expected 'css', 'javascript', or 'html'."
            )

    async def _generate_diff(
        self, before_bytes: bytes, after_bytes: bytes
    ) -> bytes:
        """Generate a visual diff image highlighting changed pixels in red.

        Runs the CPU-bound Pillow work in an executor so we don't block the
        event loop.
        """
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, self._generate_diff_sync, before_bytes, after_bytes
        )

    @staticmethod
    def _generate_diff_sync(before_bytes: bytes, after_bytes: bytes) -> bytes:
        """Synchronous Pillow-based pixel diff.

        Algorithm:
            1. Convert both images to RGBA.
            2. Compare pixels; any pixel that differs beyond a small
               threshold is painted with a semi-transparent red overlay.
            3. Unchanged pixels are kept from the *after* image but
               desaturated to draw attention to the changes.
        """
        import io

        from PIL import Image, ImageChops, ImageFilter

        before_img = Image.open(io.BytesIO(before_bytes)).convert("RGBA")
        after_img = Image.open(io.BytesIO(after_bytes)).convert("RGBA")

        # Resize to match if dimensions differ (edge case)
        if before_img.size != after_img.size:
            after_img = after_img.resize(before_img.size, Image.LANCZOS)

        # Compute per-pixel difference
        diff_raw = ImageChops.difference(before_img, after_img)

        # Convert diff to grayscale to get a single-channel change magnitude
        diff_gray = diff_raw.convert("L")

        # Threshold: pixels with difference > 10 (out of 255) count as changed
        threshold = 10
        mask = diff_gray.point(lambda p: 255 if p > threshold else 0, mode="1")

        # Slight blur on the mask so isolated single-pixel noise is softened
        mask_blurred = mask.convert("L").filter(ImageFilter.GaussianBlur(radius=1))
        mask_final = mask_blurred.point(lambda p: 255 if p > 64 else 0, mode="1")

        # Build the output: start with a desaturated copy of the after image
        after_gray = after_img.convert("L").convert("RGBA")
        # Blend: 70% desaturated after, 30% original after (so context is visible)
        base = Image.blend(after_gray, after_img, alpha=0.3)

        # Create a red overlay layer
        red_overlay = Image.new("RGBA", before_img.size, (255, 0, 0, 140))

        # Composite: paste red overlay only where mask_final is True
        base.paste(red_overlay, mask=mask_final.convert("L"))

        # Where pixels changed, also show the after image at full opacity
        # so you can see *what* changed in addition to the red highlight
        base.paste(after_img, mask=mask_final.convert("L"))

        # Add semi-transparent red tint on top of the changed regions
        tint = Image.new("RGBA", before_img.size, (255, 0, 0, 80))
        base.paste(
            Image.composite(tint, Image.new("RGBA", base.size, (0, 0, 0, 0)), mask_final.convert("L")),
            (0, 0),
            mask_final.convert("L"),
        )

        # Encode to PNG bytes
        buf = io.BytesIO()
        base.save(buf, format="PNG")
        return buf.getvalue()

    def _save_image(
        self, study_id: str, issue_id: str, suffix: str, image_bytes: bytes
    ) -> str:
        """Persist an image to the local filesystem.

        Path: ``{storage_path}/studies/{study_id}/fixes/{issue_id}_{suffix}.png``

        Returns:
            The relative storage path (suitable for serving via the screenshots API).
        """
        relative = f"studies/{study_id}/fixes/{issue_id}_{suffix}.png"
        full_path = Path(self._storage_path) / relative
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(image_bytes)
        logger.debug("Saved fix preview image: %s", relative)
        return relative
