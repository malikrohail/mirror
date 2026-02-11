"""Cookie consent auto-dismissal.

Detects common consent management platforms (OneTrust, CookieBot, etc.)
and auto-dismisses them so personas can navigate freely.
"""

from __future__ import annotations

import logging

from playwright.async_api import Page, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)

# Common cookie consent selectors (ordered by prevalence)
CONSENT_SELECTORS = [
    # OneTrust
    "#onetrust-accept-btn-handler",
    ".onetrust-close-btn-handler",
    # CookieBot
    "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
    "#CybotCookiebotDialogBodyButtonAccept",
    # Generic patterns
    'button[data-cookiefirst-action="accept"]',
    '[data-testid="cookie-policy-dialog-accept-button"]',
    'button[aria-label="Accept cookies"]',
    'button[aria-label="Accept all cookies"]',
    'button[aria-label="Accept all"]',
    # Text-based matches
    'button:has-text("Accept All")',
    'button:has-text("Accept all")',
    'button:has-text("Accept Cookies")',
    'button:has-text("Accept cookies")',
    'button:has-text("I Accept")',
    'button:has-text("I agree")',
    'button:has-text("Got it")',
    'button:has-text("OK")',
    # Common class patterns
    ".cc-dismiss",
    ".cc-btn.cc-accept",
    ".cookie-consent-accept",
    ".js-cookie-consent-agree",
]

# Common cookie banner container selectors
BANNER_SELECTORS = [
    "#onetrust-consent-sdk",
    "#CybotCookiebotDialog",
    ".cookie-banner",
    ".cookie-consent",
    '[role="dialog"][aria-label*="cookie"]',
    '[role="dialog"][aria-label*="Cookie"]',
]


async def dismiss_cookie_consent(page: Page, timeout_ms: int = 3000) -> bool:
    """Attempt to dismiss cookie consent banners.

    Tries multiple selectors for common consent platforms.
    Returns True if a banner was dismissed.
    """
    for selector in CONSENT_SELECTORS:
        try:
            element = page.locator(selector).first
            if await element.is_visible(timeout=500):
                await element.click(timeout=timeout_ms)
                logger.info("Dismissed cookie consent via: %s", selector)
                # Wait for banner to disappear
                await page.wait_for_timeout(500)
                return True
        except (PlaywrightTimeout, Exception):
            continue

    return False


async def detect_cookie_banner(page: Page) -> bool:
    """Check if a cookie consent banner is visible."""
    for selector in BANNER_SELECTORS:
        try:
            if await page.locator(selector).first.is_visible(timeout=500):
                return True
        except Exception:
            continue
    return False
