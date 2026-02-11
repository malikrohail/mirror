"""Auth wall and CAPTCHA detection.

Detects login redirects, authentication requirements, and CAPTCHA
challenges so the navigation engine can report them appropriately
instead of getting stuck.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from playwright.async_api import Page

logger = logging.getLogger(__name__)

# URL patterns that indicate auth walls
AUTH_URL_PATTERNS = [
    r"/login",
    r"/signin",
    r"/sign-in",
    r"/auth",
    r"/sso",
    r"/oauth",
    r"/accounts/login",
    r"/user/login",
]

# Page content indicators for auth walls
AUTH_CONTENT_INDICATORS = [
    "sign in to continue",
    "log in to continue",
    "please log in",
    "authentication required",
    "you must be logged in",
    "access denied",
    "unauthorized",
]

# CAPTCHA selectors
CAPTCHA_SELECTORS = [
    "iframe[src*='recaptcha']",
    "iframe[src*='hcaptcha']",
    ".g-recaptcha",
    ".h-captcha",
    "#captcha",
    "[data-sitekey]",
    "iframe[title*='reCAPTCHA']",
    "iframe[title*='hCaptcha']",
]


class PageDetection:
    """Detects auth walls, CAPTCHAs, and other navigation blockers."""

    @staticmethod
    async def detect_auth_wall(page: Page, original_url: str) -> dict[str, Any] | None:
        """Detect if the page redirected to an auth/login page.

        Returns detection result or None if no auth wall found.
        """
        current_url = page.url.lower()

        # Check URL patterns
        for pattern in AUTH_URL_PATTERNS:
            if re.search(pattern, current_url):
                # Verify it's a redirect (not the target URL)
                if pattern not in original_url.lower():
                    return {
                        "type": "auth_wall",
                        "detected_at": page.url,
                        "original_url": original_url,
                        "message": f"Redirected to login page: {page.url}",
                    }

        # Check page content
        try:
            body_text = await page.inner_text("body", timeout=2000)
            body_lower = body_text.lower()
            for indicator in AUTH_CONTENT_INDICATORS:
                if indicator in body_lower:
                    return {
                        "type": "auth_wall",
                        "detected_at": page.url,
                        "indicator": indicator,
                        "message": f"Auth wall detected: '{indicator}' found on page",
                    }
        except Exception:
            pass

        return None

    @staticmethod
    async def detect_captcha(page: Page) -> dict[str, Any] | None:
        """Detect if the page contains a CAPTCHA challenge.

        Returns detection result or None if no CAPTCHA found.
        """
        for selector in CAPTCHA_SELECTORS:
            try:
                element = page.locator(selector).first
                if await element.is_visible(timeout=500):
                    return {
                        "type": "captcha",
                        "detected_at": page.url,
                        "selector": selector,
                        "message": f"CAPTCHA detected on {page.url}",
                    }
            except Exception:
                continue

        return None

    @staticmethod
    async def detect_blockers(page: Page, original_url: str) -> list[dict[str, Any]]:
        """Run all detection checks and return any blockers found."""
        blockers = []

        auth = await PageDetection.detect_auth_wall(page, original_url)
        if auth:
            blockers.append(auth)

        captcha = await PageDetection.detect_captcha(page)
        if captcha:
            blockers.append(captcha)

        return blockers
