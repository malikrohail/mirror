"""Screenshot capture, highlighting, accessibility tree extraction, and page metadata."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from playwright.async_api import Page

logger = logging.getLogger(__name__)


@dataclass
class PageMetadata:
    """Metadata about the current page state."""

    url: str
    title: str
    viewport_width: int
    viewport_height: int


class ScreenshotService:
    """Capture screenshots and extract page information."""

    async def capture_screenshot(self, page: Page) -> bytes:
        """Capture a full-viewport PNG screenshot."""
        return await page.screenshot(type="png", full_page=False)

    async def capture_full_page(self, page: Page) -> bytes:
        """Capture a full-page (scrollable) PNG screenshot."""
        return await page.screenshot(type="png", full_page=True)

    async def capture_with_highlight(
        self, page: Page, selector: str
    ) -> bytes:
        """Capture a screenshot with a specific element highlighted.

        Adds a red border around the target element before capture,
        then removes it.
        """
        highlight_js = """
        (selector) => {
            const el = document.querySelector(selector);
            if (el) {
                el.style.outline = '3px solid red';
                el.style.outlineOffset = '2px';
                el.dataset.mirrorHighlight = 'true';
            }
        }
        """
        cleanup_js = """
        () => {
            const el = document.querySelector('[data-mirror-highlight]');
            if (el) {
                el.style.outline = '';
                el.style.outlineOffset = '';
                delete el.dataset.mirrorHighlight;
            }
        }
        """
        try:
            await page.evaluate(highlight_js, selector)
            screenshot = await page.screenshot(type="png", full_page=False)
            await page.evaluate(cleanup_js)
            return screenshot
        except Exception:
            logger.debug("Failed to highlight element %s, capturing without highlight", selector)
            return await self.capture_screenshot(page)

    async def get_accessibility_tree(self, page: Page) -> str:
        """Extract a text representation of the page's accessibility tree.

        Returns a simplified tree showing interactive elements, headings,
        landmarks, and text content — suitable for LLM consumption.
        """
        a11y_js = """
        () => {
            const results = [];
            const MAX_DEPTH = 6;
            const MAX_ITEMS = 200;
            let count = 0;

            function getRole(el) {
                return el.getAttribute('role') ||
                       el.tagName.toLowerCase();
            }

            function getLabel(el) {
                return el.getAttribute('aria-label') ||
                       el.getAttribute('alt') ||
                       el.getAttribute('title') ||
                       el.getAttribute('placeholder') ||
                       '';
            }

            function isInteractive(tag) {
                return ['a', 'button', 'input', 'select', 'textarea',
                        'details', 'summary'].includes(tag);
            }

            function isStructural(tag) {
                return ['h1','h2','h3','h4','h5','h6',
                        'nav','main','header','footer','aside',
                        'form','table','ul','ol','li'].includes(tag);
            }

            function walk(node, depth) {
                if (count >= MAX_ITEMS || depth > MAX_DEPTH) return;
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent.trim();
                    if (text && text.length > 1) {
                        results.push('  '.repeat(depth) + `"${text.substring(0, 100)}"`);
                        count++;
                    }
                    return;
                }
                if (node.nodeType !== Node.ELEMENT_NODE) return;

                const el = node;
                const tag = el.tagName.toLowerCase();
                const style = window.getComputedStyle(el);

                // Skip hidden elements
                if (style.display === 'none' || style.visibility === 'hidden') return;
                // Skip script/style
                if (['script','style','noscript','svg','path'].includes(tag)) return;

                const role = getRole(el);
                const label = getLabel(el);
                const isInter = isInteractive(tag);
                const isStruct = isStructural(tag);

                if (isInter || isStruct || label || el.getAttribute('role')) {
                    let line = '  '.repeat(depth);
                    line += `[${role}]`;
                    if (label) line += ` "${label}"`;
                    if (tag === 'a' && el.href) {
                        line += ` href="${el.getAttribute('href')}"`;
                    }
                    if (tag === 'input') {
                        line += ` type="${el.type}" name="${el.name}"`;
                        if (el.value) line += ` value="${el.value.substring(0, 50)}"`;
                    }
                    if (el.disabled) line += ' [disabled]';
                    if (el.id) line += ` #${el.id}`;
                    if (el.className && typeof el.className === 'string') {
                        const cls = el.className.trim().split(/\\s+/).slice(0, 3).join('.');
                        if (cls) line += ` .${cls}`;
                    }
                    results.push(line);
                    count++;
                }

                for (const child of el.childNodes) {
                    walk(child, isInter || isStruct ? depth + 1 : depth);
                }
            }

            walk(document.body, 0);
            return results.join('\\n');
        }
        """
        try:
            tree = await page.evaluate(a11y_js)
            return tree if tree else "(empty page)"
        except Exception as e:
            logger.warning("Failed to extract a11y tree: %s", e)
            return "(failed to extract accessibility tree)"

    async def get_page_metadata(self, page: Page) -> PageMetadata:
        """Get current page URL, title, and viewport dimensions."""
        viewport = page.viewport_size or {"width": 1920, "height": 1080}
        return PageMetadata(
            url=page.url,
            title=await page.title(),
            viewport_width=viewport["width"],
            viewport_height=viewport["height"],
        )

    async def get_scroll_position(self, page: Page) -> dict[str, int]:
        """Get current scroll position and maximum scroll depth."""
        try:
            pos = await page.evaluate("""
                () => ({
                    scroll_y: Math.round(window.scrollY),
                    max_scroll_y: Math.round(document.documentElement.scrollHeight - window.innerHeight),
                    page_height: Math.round(document.documentElement.scrollHeight),
                    viewport_height: window.innerHeight,
                })
            """)
            return pos
        except Exception:
            return {"scroll_y": 0, "max_scroll_y": 0, "page_height": 0, "viewport_height": 0}

    async def get_performance_metrics(self, page: Page) -> dict[str, int | None]:
        """Get page load performance metrics."""
        try:
            perf = await page.evaluate("""
                () => {
                    const timing = performance.timing;
                    const paintEntries = performance.getEntriesByType('paint');
                    const firstPaint = paintEntries.length > 0 ? Math.round(paintEntries[0].startTime) : null;

                    let loadComplete = null;
                    if (timing.loadEventEnd > 0 && timing.navigationStart > 0) {
                        loadComplete = timing.loadEventEnd - timing.navigationStart;
                    }

                    return {
                        load_time_ms: loadComplete,
                        first_paint_ms: firstPaint,
                    };
                }
            """)
            return perf
        except Exception:
            return {"load_time_ms": None, "first_paint_ms": None}

    async def get_click_position(
        self, page: Page, selector: str
    ) -> tuple[int, int] | None:
        """Get the center coordinates of an element (for heatmap data)."""
        try:
            box = await page.locator(selector).bounding_box(timeout=3_000)
            if box:
                return (
                    int(box["x"] + box["width"] / 2),
                    int(box["y"] + box["height"] / 2),
                )
        except Exception:
            pass
        return None
