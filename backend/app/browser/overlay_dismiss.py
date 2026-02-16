"""Common overlay / modal auto-dismissal.

Detects and dismisses common UI overlays that block navigation:
- "Got it" / "No thanks" informational modals (e.g. Airbnb price disclosure)
- Newsletter signup popups
- Notification permission prompts
- App download banners
- Date pickers / calendars (Airbnb, etc.)
- Generic modal close buttons

This runs AFTER cookie consent dismissal and BEFORE the navigation loop,
plus can be called mid-navigation when the bot detects it's stuck.

Three dismissal strategies (used in order by aggressive_dismiss):
1. Hardcoded CSS selectors (fast, specific)
2. Smart JS-based detection (finds close buttons within any overlay)
3. Click-outside / multi-Escape fallback (last resort)
"""

from __future__ import annotations

import logging

from playwright.async_api import Page, TimeoutError as PlaywrightTimeout

logger = logging.getLogger(__name__)

# Ordered by specificity: more specific selectors first, generic last.
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
    'button:has-text("Continue shopping")',
    'button:has-text("Stay on web")',
    'button:has-text("Continue on mobile site")',
    'button:has-text("Continue on web")',
    'a:has-text("Continue to website")',
    'a:has-text("Continue in browser")',
    'a:has-text("Continue shopping")',
    'a:has-text("Continue on web")',
    '[id*="smartbanner"] .js-close',
    '.smartbanner-close',

    # --- Airbnb-specific ---
    'button[aria-label="Clear dates"]',
    '[data-testid="structured-search-input-field-split-dates-0"] button[aria-label="Close"]',
    '[data-testid="modal-container"] button[aria-label="Close"]',
    'div[aria-roledescription="datepicker"] button[aria-label="Close"]',
    'button:has-text("Clear dates")',
    'button:has-text("I\'m flexible")',

    # --- Walmart / Target / retail-specific banners ---
    '[data-automation-id="modalClose"]',
    '[data-automation-id="close-button"]',
    'button[aria-label="close modal"]',
    'button[aria-label="Close dialog"]',
    '.bottom-sheet button[aria-label="close"]',
    '.bottom-sheet button[aria-label="Close"]',
    '[class*="BottomSheet"] button[aria-label="close"]',
    '[class*="BottomSheet"] button[aria-label="Close"]',
    '[class*="app-banner"] button',
    '[class*="AppBanner"] button',
    '[id*="app-banner"] button',
    '[data-testid="sticky-banner-close"]',
    '[data-testid="banner-close"]',
    # Walmart specific: nudge/install banners
    'button[aria-label="close nudge"]',
    'button[aria-label="Close nudge"]',
    '[class*="MobileNudge"] button',
    '[class*="mobile-nudge"] button',
    '[class*="BottomBanner"] button[aria-label*="lose"]',
    '[id*="mobile"] button[aria-label*="lose"]',
    '[class*="persistent-banner"] button',

    # --- Amazon-specific ---
    '#nav-main .nav-action-inner:has-text("Skip")',
    '#attach-close_sideSheet-link',
    'button[data-action="a]popup-close"]',

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
    """Attempt to dismiss common overlay modals via hardcoded CSS selectors.

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


async def smart_dismiss_overlay(page: Page) -> int:
    """Find and dismiss overlays using JavaScript DOM analysis.

    Unlike dismiss_overlays() which tries hardcoded CSS selectors, this
    dynamically finds overlay containers and searches for close/dismiss
    buttons WITHIN them. Works on sites with non-standard markup
    (Airbnb, Walmart, Amazon, etc.).

    Uses JS to find targets, then Playwright mouse.click for reliable
    event dispatch (works with React/Next.js synthetic events).
    """
    try:
        targets = await page.evaluate("""() => {
            const targets = [];
            const seen = new Set();
            const containers = new Set();

            // 1. ARIA-based overlay containers
            document.querySelectorAll(
                '[role="dialog"], [aria-modal="true"], [role="alertdialog"]'
            ).forEach(el => {
                const s = getComputedStyle(el);
                if (s.display !== 'none' && s.visibility !== 'hidden'
                    && parseFloat(s.opacity) > 0) {
                    containers.add(el);
                }
            });

            // 2. Class/ID pattern-based containers
            const patterns = [
                '[class*="modal" i]', '[class*="overlay" i]',
                '[class*="popup" i]', '[class*="banner" i]',
                '[class*="sheet" i]', '[class*="dialog" i]',
                '[class*="nudge" i]', '[class*="interstitial" i]',
                '[id*="modal" i]', '[id*="overlay" i]',
                '[id*="popup" i]', '[id*="banner" i]',
            ];
            for (const pat of patterns) {
                try {
                    document.querySelectorAll(pat).forEach(el => {
                        const s = getComputedStyle(el);
                        if (s.display !== 'none' && s.visibility !== 'hidden'
                            && parseFloat(s.opacity) > 0) {
                            const r = el.getBoundingClientRect();
                            if (r.width > 80 && r.height > 40) {
                                containers.add(el);
                            }
                        }
                    });
                } catch (e) { /* selector may not be valid in all browsers */ }
            }

            // 3. High z-index floating elements covering >10% viewport
            const checkEls = document.querySelectorAll(
                'div, section, aside, nav, header, footer'
            );
            for (const el of checkEls) {
                const s = getComputedStyle(el);
                const z = parseInt(s.zIndex, 10);
                if (z > 50 && s.position !== 'static'
                    && s.display !== 'none' && s.visibility !== 'hidden') {
                    const r = el.getBoundingClientRect();
                    const vpArea = window.innerWidth * window.innerHeight;
                    if ((r.width * r.height) / vpArea > 0.10) {
                        containers.add(el);
                    }
                }
            }

            // 4. Within each container, find close/dismiss buttons.
            //    SKIP containers that are interactive elements (autocomplete
            //    dropdowns, select menus, comboboxes) — the persona needs these.
            const closeTextRe = /^\\s*(close|×|✕|✖|x|dismiss|got it|no thanks|not now|maybe later|skip|continue|ok|cancel|done|no,?\\s*thanks|stay on web|continue to website|continue in browser|continue shopping|continue on web)\\s*$/i;
            const closeLabelRe = /close|dismiss|cancel|hide/i;
            const closeClassRe = /close|dismiss|cancel/i;

            const interactiveRoles = new Set([
                'listbox', 'menu', 'menubar', 'combobox', 'tree',
            ]);

            for (const container of containers) {
                // Skip interactive elements (autocomplete, select menus)
                const role = (container.getAttribute('role') || '').toLowerCase();
                if (interactiveRoles.has(role)) continue;
                // Skip if container holds option/menuitem children (autocomplete)
                if (container.querySelector('[role="option"], [role="menuitem"]'))
                    continue;
                const clickables = container.querySelectorAll(
                    'button, a, [role="button"], [tabindex="0"], ' +
                    'input[type="button"], input[type="submit"]'
                );

                for (const btn of clickables) {
                    const rect = btn.getBoundingClientRect();
                    if (rect.width <= 0 || rect.height <= 0) continue;

                    const text = (btn.textContent || '').trim();
                    const label = btn.getAttribute('aria-label') || '';
                    const cls = (typeof btn.className === 'string'
                        ? btn.className : '') || '';
                    const testId = btn.getAttribute('data-testid') || '';

                    const isClose =
                        closeTextRe.test(text) ||
                        closeLabelRe.test(label) ||
                        closeClassRe.test(cls) ||
                        /close|dismiss/i.test(testId) ||
                        // Small icon-only button (likely X/close icon)
                        (btn.querySelector('svg') && text.length < 3
                            && rect.width < 60);

                    if (isClose) {
                        const key = Math.round(rect.left) + ',' +
                                    Math.round(rect.top);
                        if (!seen.has(key)) {
                            seen.add(key);
                            targets.push({
                                x: Math.round(rect.left + rect.width / 2),
                                y: Math.round(rect.top + rect.height / 2),
                                text: text.substring(0, 30),
                                label: label.substring(0, 30),
                            });
                        }
                    }
                }
            }

            return targets;
        }""")

        dismissed = 0
        for target in (targets or [])[:3]:
            try:
                await page.mouse.click(target["x"], target["y"])
                await page.wait_for_timeout(500)
                dismissed += 1
                logger.info(
                    "Smart-dismissed overlay at (%d, %d) — text='%s' label='%s'",
                    target["x"], target["y"],
                    target.get("text", ""), target.get("label", ""),
                )
            except Exception:
                continue

        return dismissed
    except Exception as e:
        logger.debug("Smart overlay dismissal failed: %s", e)
        return 0


async def click_outside_overlay(page: Page) -> bool:
    """Click outside any detected overlay to dismiss it.

    Finds the overlay bounds and clicks OUTSIDE them. This dismisses
    many popovers, dropdowns, date pickers, and non-modal overlays
    that respond to "click away" behavior.
    """
    try:
        click_point = await page.evaluate("""() => {
            // Find the topmost floating overlay
            let topOverlay = null;
            let topZ = 0;

            // Only target actual overlays — NOT interactive dropdowns
            // (autocomplete, select menus) that the user needs.
            const selectors = [
                '[role="dialog"]', '[aria-modal="true"]',
                '[class*="popup" i]', '[class*="popover" i]',
            ];

            const skipRoles = new Set([
                'listbox', 'menu', 'combobox', 'tree',
            ]);

            for (const sel of selectors) {
                try {
                    for (const el of document.querySelectorAll(sel)) {
                        const role = (el.getAttribute('role') || '');
                        if (skipRoles.has(role.toLowerCase())) continue;
                        // Skip autocomplete containers
                        if (el.querySelector('[role="option"]')) continue;
                        const s = getComputedStyle(el);
                        const z = parseInt(s.zIndex) || 0;
                        if (s.display !== 'none' && s.visibility !== 'hidden'
                            && z >= topZ) {
                            const r = el.getBoundingClientRect();
                            if (r.width > 50 && r.height > 50) {
                                topOverlay = r;
                                topZ = z;
                            }
                        }
                    }
                } catch (e) {}
            }

            if (!topOverlay) return null;

            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // Try points outside the overlay but inside viewport
            const candidates = [
                // Left of overlay
                {x: Math.max(10, topOverlay.left - 30),
                 y: topOverlay.top + topOverlay.height / 2},
                // Right of overlay
                {x: Math.min(vw - 10, topOverlay.right + 30),
                 y: topOverlay.top + topOverlay.height / 2},
                // Above overlay
                {x: topOverlay.left + topOverlay.width / 2,
                 y: Math.max(10, topOverlay.top - 30)},
                // Below overlay
                {x: topOverlay.left + topOverlay.width / 2,
                 y: Math.min(vh - 10, topOverlay.bottom + 30)},
                // Corners (last resort)
                {x: 10, y: 10},
                {x: vw - 10, y: vh - 10},
            ];

            for (const c of candidates) {
                if (c.x > 5 && c.x < vw - 5 && c.y > 5 && c.y < vh - 5) {
                    // Make sure this point is NOT inside the overlay
                    if (c.x < topOverlay.left || c.x > topOverlay.right ||
                        c.y < topOverlay.top || c.y > topOverlay.bottom) {
                        return c;
                    }
                }
            }

            return {x: 10, y: 10};
        }""")

        if click_point:
            await page.mouse.click(
                int(click_point["x"]), int(click_point["y"])
            )
            await page.wait_for_timeout(500)
            logger.info(
                "Clicked outside overlay at (%d, %d)",
                click_point["x"], click_point["y"],
            )
            return True
        return False
    except Exception as e:
        logger.debug("Click-outside-overlay failed: %s", e)
        return False


async def try_escape_key(page: Page, presses: int = 1) -> bool:
    """Press Escape to dismiss any blocking element.

    Works on modals, dropdowns, date pickers, popovers, menus,
    and any other floating UI that responds to Escape.

    Args:
        presses: Number of Escape key presses (with 300ms delay between).
            Use >1 for stubborn overlays or nested overlays.
    """
    try:
        for i in range(presses):
            await page.keyboard.press("Escape")
            if i < presses - 1:
                await page.wait_for_timeout(300)
        await page.wait_for_timeout(500)
        logger.info(
            "Pressed Escape key %d time(s) (dismiss attempt)", presses
        )
        return True
    except Exception as e:
        logger.debug("Escape key attempt failed: %s", e)
        return False


async def aggressive_dismiss(page: Page) -> int:
    """Try ALL overlay dismissal strategies in order of reliability.

    Chains together every available strategy to maximize the chance
    of clearing blocking overlays. Returns total dismissed count.

    Order:
    1. Hardcoded CSS selectors (fast, specific)
    2. Smart JS-based close button detection (adaptive)
    3. Click outside overlay (for popovers/dropdowns)
    4. Escape key (multiple presses, for date pickers/menus)
    """
    total = 0

    # Strategy 1: Hardcoded selectors
    dismissed = await dismiss_overlays(page)
    total += dismissed
    if dismissed:
        logger.info("aggressive_dismiss: hardcoded selectors dismissed %d", dismissed)
        return total  # If selectors worked, likely done

    # Strategy 2: Smart JS-based detection
    dismissed = await smart_dismiss_overlay(page)
    total += dismissed
    if dismissed:
        logger.info("aggressive_dismiss: smart JS dismissed %d", dismissed)
        return total

    # Strategy 3: Click outside the overlay
    clicked = await click_outside_overlay(page)
    if clicked:
        total += 1
        logger.info("aggressive_dismiss: click-outside succeeded")
        # Check if overlay is still there
        if not await detect_blocking_overlay(page):
            return total

    # Strategy 4: Escape key (2 presses for stubborn overlays)
    await try_escape_key(page, presses=2)
    if not await detect_blocking_overlay(page):
        total += 1
        logger.info("aggressive_dismiss: Escape key cleared overlay")

    return total


async def detect_blocking_overlay(page: Page) -> bool:
    """Check if a modal, popover, dropdown, or overlay is blocking the page."""
    try:
        return await page.evaluate("""() => {
            // Check for role="dialog" or aria-modal elements that are visible.
            // NOTE: Do NOT include [role="listbox"] or [role="menu"] here —
            // those are interactive elements (autocomplete dropdowns, select
            // menus) that the persona NEEDS to interact with.
            const dialogs = document.querySelectorAll(
                '[role="dialog"], [aria-modal="true"], [role="alertdialog"]'
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
