"""Browser actions — click, type, scroll, navigate with retry logic."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

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
        """Type text into an input with realistic keystroke delays."""
        for attempt in range(2):
            try:
                # Clear existing value first
                await page.click(selector, timeout=self.timeout_ms)
                await page.fill(selector, "")
                await page.type(selector, value, delay=REALISTIC_TYPE_DELAY_MS)
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
