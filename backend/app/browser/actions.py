"""Browser actions — click, type, scroll, navigate with retry logic."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any

from playwright.async_api import Page, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)

# Defaults
DEFAULT_TIMEOUT_MS = 10_000
ACTION_RETRY_DELAY_MS = 1_000
REALISTIC_TYPE_DELAY_MS = 50  # ms between keystrokes


@dataclass
class ActionResult:
    """Result of a browser action."""

    success: bool
    action_type: str
    description: str
    error: str | None = None


class BrowserActions:
    """Execute browser actions with retry logic and realistic timing."""

    def __init__(self, timeout_ms: int = DEFAULT_TIMEOUT_MS) -> None:
        self.timeout_ms = timeout_ms

    async def click(self, page: Page, selector: str) -> ActionResult:
        """Click an element, with one retry if not found."""
        for attempt in range(2):
            try:
                await page.click(selector, timeout=self.timeout_ms)
                # Wait for any navigation triggered by the click
                await self._wait_for_stable(page)
                return ActionResult(
                    success=True,
                    action_type="click",
                    description=f"Clicked '{selector}'",
                )
            except PlaywrightTimeout:
                if attempt == 0:
                    logger.debug("Click target not found, retrying: %s", selector)
                    await asyncio.sleep(ACTION_RETRY_DELAY_MS / 1000)
                else:
                    return ActionResult(
                        success=False,
                        action_type="click",
                        description=f"Failed to click '{selector}'",
                        error=f"Element not found after retry: {selector}",
                    )
            except Exception as e:
                return ActionResult(
                    success=False,
                    action_type="click",
                    description=f"Failed to click '{selector}'",
                    error=str(e),
                )
        # Unreachable but satisfies type checker
        return ActionResult(success=False, action_type="click", description="Unknown error")

    async def type_text(
        self, page: Page, selector: str, value: str
    ) -> ActionResult:
        """Type text into an input with realistic keystroke delays.

        Uses Ctrl+A to select existing text (instead of fill("") which
        bypasses keyboard events) so that autocomplete/typeahead fields
        on sites like Airbnb receive proper input events.

        After typing, waits 1.5s for autocomplete/AJAX suggestions to load.
        """
        for attempt in range(2):
            try:
                # Click to focus the input
                await page.click(selector, timeout=self.timeout_ms)
                # Select all existing text via keyboard (Ctrl+A) then
                # delete — this triggers proper input events for React/
                # autocomplete fields, unlike fill("") which sets the
                # value programmatically.
                await page.keyboard.press("ControlOrMeta+a")
                await page.keyboard.press("Backspace")
                await asyncio.sleep(0.1)
                # Type with realistic delays to trigger autocomplete
                await page.type(selector, value, delay=REALISTIC_TYPE_DELAY_MS)
                # Wait for autocomplete/AJAX suggestions to load.
                # Many sites (Airbnb, Google, Amazon) need 1-2s after
                # typing for dropdown suggestions to appear.
                await asyncio.sleep(1.5)
                return ActionResult(
                    success=True,
                    action_type="type",
                    description=f"Typed '{value[:30]}...' into '{selector}'",
                )
            except PlaywrightTimeout:
                if attempt == 0:
                    logger.debug("Type target not found, retrying: %s", selector)
                    await asyncio.sleep(ACTION_RETRY_DELAY_MS / 1000)
                else:
                    return ActionResult(
                        success=False,
                        action_type="type",
                        description=f"Failed to type into '{selector}'",
                        error=f"Element not found after retry: {selector}",
                    )
            except Exception as e:
                return ActionResult(
                    success=False,
                    action_type="type",
                    description=f"Failed to type into '{selector}'",
                    error=str(e),
                )
        return ActionResult(success=False, action_type="type", description="Unknown error")

    async def scroll(
        self, page: Page, direction: str = "down", amount: int = 500
    ) -> ActionResult:
        """Scroll the page or scroll to an element.

        Args:
            direction: "down", "up", or a CSS selector to scroll to.
            amount: Pixel amount for up/down scroll.
        """
        try:
            if direction in ("down", "up"):
                delta = amount if direction == "down" else -amount
                await page.evaluate(f"window.scrollBy(0, {delta})")
                await asyncio.sleep(0.3)  # Let content settle
                return ActionResult(
                    success=True,
                    action_type="scroll",
                    description=f"Scrolled {direction} by {amount}px",
                )
            else:
                # direction is a CSS selector — scroll element into view
                await page.locator(direction).scroll_into_view_if_needed(
                    timeout=self.timeout_ms
                )
                return ActionResult(
                    success=True,
                    action_type="scroll",
                    description=f"Scrolled to element '{direction}'",
                )
        except Exception as e:
            return ActionResult(
                success=False,
                action_type="scroll",
                description=f"Failed to scroll {direction}",
                error=str(e),
            )

    async def navigate(self, page: Page, url: str) -> ActionResult:
        """Navigate to a URL and wait for load."""
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            await self._wait_for_stable(page)
            return ActionResult(
                success=True,
                action_type="navigate",
                description=f"Navigated to {url}",
            )
        except Exception as e:
            return ActionResult(
                success=False,
                action_type="navigate",
                description=f"Failed to navigate to {url}",
                error=str(e),
            )

    async def go_back(self, page: Page) -> ActionResult:
        """Go back to the previous page."""
        try:
            await page.go_back(wait_until="domcontentloaded", timeout=self.timeout_ms)
            await self._wait_for_stable(page)
            return ActionResult(
                success=True,
                action_type="go_back",
                description="Navigated back",
            )
        except Exception as e:
            return ActionResult(
                success=False,
                action_type="go_back",
                description="Failed to go back",
                error=str(e),
            )

    async def wait(self, page: Page, ms: int = 1000) -> ActionResult:
        """Explicit wait (for dynamic content loading)."""
        await asyncio.sleep(ms / 1000)
        return ActionResult(
            success=True,
            action_type="wait",
            description=f"Waited {ms}ms",
        )

    async def tab(self, page: Page) -> ActionResult:
        """Press Tab to move focus to the next interactive element."""
        try:
            await page.keyboard.press("Tab")
            await asyncio.sleep(0.3)
            return ActionResult(
                success=True,
                action_type="tab",
                description="Pressed Tab to move focus forward",
            )
        except Exception as e:
            return ActionResult(
                success=False,
                action_type="tab",
                description="Failed to press Tab",
                error=str(e),
            )

    async def shift_tab(self, page: Page) -> ActionResult:
        """Press Shift+Tab to move focus to the previous interactive element."""
        try:
            await page.keyboard.press("Shift+Tab")
            await asyncio.sleep(0.3)
            return ActionResult(
                success=True,
                action_type="shift_tab",
                description="Pressed Shift+Tab to move focus backward",
            )
        except Exception as e:
            return ActionResult(
                success=False,
                action_type="shift_tab",
                description="Failed to press Shift+Tab",
                error=str(e),
            )

    async def enter(self, page: Page) -> ActionResult:
        """Press Enter to activate the currently focused element."""
        try:
            await page.keyboard.press("Enter")
            await self._wait_for_stable(page)
            return ActionResult(
                success=True,
                action_type="enter",
                description="Pressed Enter to activate focused element",
            )
        except Exception as e:
            return ActionResult(
                success=False,
                action_type="enter",
                description="Failed to press Enter",
                error=str(e),
            )

    # ------------------------------------------------------------------
    # Coordinate-based actions (Computer Use)
    # ------------------------------------------------------------------

    async def click_at(self, page: Page, x: int, y: int) -> ActionResult:
        """Click at pixel coordinates (Computer Use mode)."""
        try:
            await page.mouse.click(x, y)
            await self._wait_for_stable(page)
            return ActionResult(
                success=True,
                action_type="left_click",
                description=f"Clicked at ({x}, {y})",
            )
        except Exception as e:
            return ActionResult(
                success=False,
                action_type="left_click",
                description=f"Failed to click at ({x}, {y})",
                error=str(e),
            )

    async def double_click_at(self, page: Page, x: int, y: int) -> ActionResult:
        """Double-click at pixel coordinates."""
        try:
            await page.mouse.dblclick(x, y)
            await self._wait_for_stable(page)
            return ActionResult(
                success=True,
                action_type="double_click",
                description=f"Double-clicked at ({x}, {y})",
            )
        except Exception as e:
            return ActionResult(
                success=False,
                action_type="double_click",
                description=f"Failed to double-click at ({x}, {y})",
                error=str(e),
            )

    async def type_text_raw(self, page: Page, text: str) -> ActionResult:
        """Type text via keyboard (no selector needed — Computer Use mode).

        Waits 1.5s after typing for autocomplete suggestions to load.
        """
        try:
            await page.keyboard.type(text, delay=REALISTIC_TYPE_DELAY_MS)
            # Wait for autocomplete/AJAX suggestions to load
            await asyncio.sleep(1.5)
            return ActionResult(
                success=True,
                action_type="type",
                description=f"Typed '{text[:30]}...'",
            )
        except Exception as e:
            return ActionResult(
                success=False,
                action_type="type",
                description=f"Failed to type text",
                error=str(e),
            )

    async def key_press(self, page: Page, key: str) -> ActionResult:
        """Press a key by name (Computer Use mode)."""
        try:
            await page.keyboard.press(key)
            await asyncio.sleep(0.3)
            return ActionResult(
                success=True,
                action_type="key",
                description=f"Pressed key '{key}'",
            )
        except Exception as e:
            return ActionResult(
                success=False,
                action_type="key",
                description=f"Failed to press key '{key}'",
                error=str(e),
            )

    async def scroll_at(
        self, page: Page, x: int, y: int, direction: str = "down", amount: int = 3
    ) -> ActionResult:
        """Scroll at pixel coordinates (Computer Use mode)."""
        try:
            # Move mouse to position first
            await page.mouse.move(x, y)
            delta_map = {"down": 100, "up": -100, "right": 100, "left": -100}
            per_click = delta_map.get(direction, 100)
            total = per_click * amount
            if direction in ("left", "right"):
                await page.mouse.wheel(total, 0)
            else:
                await page.mouse.wheel(0, total)
            await asyncio.sleep(0.3)
            return ActionResult(
                success=True,
                action_type="scroll",
                description=f"Scrolled {direction} by {amount} clicks at ({x}, {y})",
            )
        except Exception as e:
            return ActionResult(
                success=False,
                action_type="scroll",
                description=f"Failed to scroll at ({x}, {y})",
                error=str(e),
            )

    async def execute_computer_use(
        self, page: Page, action: str, **kwargs: Any
    ) -> ActionResult:
        """Dispatch a Computer Use action by type string.

        Handles all actions from Claude's computer_20250124 tool.
        """
        coord = kwargs.get("coordinate", [])
        x = coord[0] if len(coord) >= 2 else 0
        y = coord[1] if len(coord) >= 2 else 0

        if action == "left_click":
            return await self.click_at(page, x, y)
        elif action == "double_click":
            return await self.double_click_at(page, x, y)
        elif action == "right_click":
            try:
                await page.mouse.click(x, y, button="right")
                return ActionResult(success=True, action_type="right_click", description=f"Right-clicked at ({x}, {y})")
            except Exception as e:
                return ActionResult(success=False, action_type="right_click", description=f"Failed", error=str(e))
        elif action == "type":
            text = kwargs.get("text", "")
            return await self.type_text_raw(page, text)
        elif action == "key":
            key = kwargs.get("key", "Return")
            return await self.key_press(page, key)
        elif action == "scroll":
            direction = kwargs.get("direction", "down")
            amount = kwargs.get("amount", 3)
            return await self.scroll_at(page, x, y, direction, amount)
        elif action == "mouse_move":
            try:
                await page.mouse.move(x, y)
                return ActionResult(success=True, action_type="mouse_move", description=f"Moved to ({x}, {y})")
            except Exception as e:
                return ActionResult(success=False, action_type="mouse_move", description=f"Failed", error=str(e))
        elif action == "left_click_drag":
            end = kwargs.get("end_coordinate", coord)
            ex = end[0] if len(end) >= 2 else x
            ey = end[1] if len(end) >= 2 else y
            try:
                await page.mouse.move(x, y)
                await page.mouse.down()
                await page.mouse.move(ex, ey)
                await page.mouse.up()
                return ActionResult(success=True, action_type="drag", description=f"Dragged ({x},{y})→({ex},{ey})")
            except Exception as e:
                return ActionResult(success=False, action_type="drag", description="Failed", error=str(e))
        elif action == "triple_click":
            try:
                await page.mouse.click(x, y, click_count=3)
                return ActionResult(success=True, action_type="triple_click", description=f"Triple-clicked at ({x}, {y})")
            except Exception as e:
                return ActionResult(success=False, action_type="triple_click", description="Failed", error=str(e))
        elif action == "wait":
            ms = kwargs.get("duration", 2000)
            await asyncio.sleep(ms / 1000)
            return ActionResult(success=True, action_type="wait", description=f"Waited {ms}ms")
        elif action == "screenshot":
            # No-op — the navigator captures screenshots externally
            return ActionResult(success=True, action_type="screenshot", description="Screenshot requested")
        else:
            logger.warning("Unknown computer use action: %s", action)
            return ActionResult(success=False, action_type=action, description=f"Unknown action: {action}", error=f"Unsupported: {action}")

    async def execute(self, page: Page, action_type: str, **kwargs: str | int) -> ActionResult:
        """Dispatch an action by type string.

        This is the main entry point used by the navigator.
        """
        handlers = {
            "click": lambda: self.click(page, str(kwargs.get("selector", ""))),
            "type": lambda: self.type_text(
                page, str(kwargs.get("selector", "")), str(kwargs.get("value", ""))
            ),
            "scroll": lambda: self.scroll(
                page,
                str(kwargs.get("value", "down")),
                int(kwargs.get("amount", 500)),
            ),
            "navigate": lambda: self.navigate(page, str(kwargs.get("value", ""))),
            "go_back": lambda: self.go_back(page),
            "wait": lambda: self.wait(page, int(kwargs.get("value", 1000))),
            "tab": lambda: self.tab(page),
            "shift_tab": lambda: self.shift_tab(page),
            "enter": lambda: self.enter(page),
            "done": lambda: self._noop("done", "Task completed"),
            "give_up": lambda: self._noop("give_up", "Persona gave up"),
        }

        handler = handlers.get(action_type)
        if handler is None:
            return ActionResult(
                success=False,
                action_type=action_type,
                description=f"Unknown action type: {action_type}",
                error=f"Unsupported action: {action_type}",
            )

        return await handler()

    async def _wait_for_stable(self, page: Page) -> None:
        """Wait briefly for page to stabilize after an action."""
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5_000)
        except PlaywrightTimeout:
            pass
        # Small extra delay for JS frameworks to settle
        await asyncio.sleep(0.5)

    async def _noop(self, action_type: str, description: str) -> ActionResult:
        """No-op actions for 'done' and 'give_up'."""
        return ActionResult(
            success=True,
            action_type=action_type,
            description=description,
        )
