"""Common overlay / modal auto-dismissal.

Detects and dismisses common UI overlays that block navigation:
- "Got it" / "No thanks" informational modals (e.g. Airbnb price disclosure)
- Newsletter signup popups
- Notification permission prompts
- App download banners
- Generic modal close buttons

This runs AFTER cookie consent dismissal and BEFORE the navigation loop,
plus can be called mid-navigation when the bot detects it's stuck.
"""

from __future__ import annotations

import logging

from playwright.async_api import Page, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)

# Ordered by specificity: more specific selectors first, generic last.
# Each tuple is (selector, description) for logging.
OVERLAY_DISMISS_SELECTORS = [
    # --- Informational modals ("Got it", "OK", "Dismiss") ---
    'button:has-text("Got it")',
    'button:has-text("Got It")',
    'button:has-text("Dismiss")',
    'button:has-text("No thanks")',
    'button:has-text("No, thanks")',
    'button:has-text("Not now")',
    'button:has-text("Not Now")',
    'button:has-text("Maybe later")',
    'button:has-text("Maybe Later")',
    'button:has-text("Skip")',
    'button:has-text("Continue")',
    'button:has-text("Close")',

    # --- Newsletter / signup popups ---
    'button:has-text("No Thanks")',
    '[data-testid="close-button"]',
    '[data-testid="modal-close"]',
    '[data-testid="dismiss"]',
    '[data-testid="popup-close"]',

    # --- App download banners ---
    'button:has-text("Continue to website")',
    'button:has-text("Continue in browser")',
    'button:has-text("Stay on web")',
    '[id*="smartbanner"] .js-close',
    '.smartbanner-close',

    # --- Notification permission prompts (custom site ones, not browser) ---
    'button:has-text("Block")',
    'button:has-text("Deny")',
    'button:has-text("No")',

    # --- Generic close buttons (ARIA-based) ---
    '[role="dialog"] button[aria-label="Close"]',
    '[role="dialog"] button[aria-label="close"]',
    '[role="dialog"] button[aria-label="Dismiss"]',
    '[aria-modal="true"] button[aria-label="Close"]',
    '[aria-modal="true"] button[aria-label="close"]',

    # --- Generic X close buttons inside modals ---
    '[role="dialog"] button:has-text("\\u00d7")',  # multiplication sign ×
    '[role="dialog"] button:has-text("X")',
    '[aria-modal="true"] button:has-text("\\u00d7")',

    # --- Common class patterns ---
    ".modal-close",
    ".popup-close",
    ".overlay-close",
    ".close-modal",
    ".close-popup",
    ".dialog-close",
]


async def dismiss_overlays(page: Page, timeout_ms: int = 2000) -> int:
    """Attempt to dismiss common overlay modals.

    Tries multiple selectors for common overlay patterns.
    Returns the number of overlays dismissed.
    """
    dismissed = 0

    for selector in OVERLAY_DISMISS_SELECTORS:
        try:
            element = page.locator(selector).first
            if await element.is_visible(timeout=300):
                await element.click(timeout=timeout_ms)
                logger.info("Dismissed overlay via: %s", selector)
                await page.wait_for_timeout(500)
                dismissed += 1
                # After dismissing one, check if there's another
                # (nested modals), but limit to avoid infinite loop
                if dismissed >= 3:
                    break
        except (PlaywrightTimeout, Exception):
            continue

    return dismissed


async def try_escape_key(page: Page) -> bool:
    """Press Escape to dismiss any blocking element.

    Works on modals, dropdowns, date pickers, popovers, menus,
    and any other floating UI that responds to Escape. We don't
    try to verify what closed — just press and move on.
    """
    try:
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(500)
        logger.info("Pressed Escape key (dismiss attempt)")
        return True
    except Exception as e:
        logger.debug("Escape key attempt failed: %s", e)
        return False


async def detect_blocking_overlay(page: Page) -> bool:
    """Check if a modal, popover, dropdown, or overlay is blocking the page."""
    try:
        return await page.evaluate("""() => {
            // Check for role="dialog" or aria-modal elements that are visible
            const dialogs = document.querySelectorAll(
                '[role="dialog"], [aria-modal="true"], [role="listbox"], [role="menu"]'
            );
            for (const d of dialogs) {
                const style = window.getComputedStyle(d);
                if (style.display !== 'none' && style.visibility !== 'hidden'
                    && style.opacity !== '0') {
                    return true;
                }
            }

            // Check for common overlay backdrop classes
            const backdrops = document.querySelectorAll(
                '.modal-backdrop, .overlay-backdrop, [class*="backdrop"]'
            );
            for (const b of backdrops) {
                const style = window.getComputedStyle(b);
                if (style.display !== 'none' && style.visibility !== 'hidden') {
                    return true;
                }
            }

            // Check for floating elements with high z-index that cover
            // a significant portion of the viewport (date pickers, popovers)
            const allEls = document.querySelectorAll('*');
            for (const el of allEls) {
                const style = window.getComputedStyle(el);
                const z = parseInt(style.zIndex, 10);
                if (z > 100 && style.position !== 'static'
                    && style.display !== 'none' && style.visibility !== 'hidden') {
                    const rect = el.getBoundingClientRect();
                    const area = rect.width * rect.height;
                    const vpArea = window.innerWidth * window.innerHeight;
                    // If floating element covers >15% of viewport, it's blocking
                    if (area / vpArea > 0.15) {
                        return true;
                    }
                }
            }

            return false;
        }""")
    except Exception:
        return False
