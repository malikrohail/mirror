"""Issue normalization for the Mirror benchmark pipeline.

Transforms both ground truth issues and Mirror-detected issues into a
common NormalizedIssue format, enabling fair comparison in the matching
and scoring stages. Provides classification functions for element types
and problem categories based on keyword analysis.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlparse

from benchmark.ground_truth.schema import GroundTruthIssue

# Mapping of keywords to element types for classification
_ELEMENT_TYPE_KEYWORDS: dict[str, list[str]] = {
    "input": [
        "input", "text field", "textbox", "text box", "search bar",
        "password field", "email field", "username field", "textarea",
    ],
    "button": [
        "button", "cta", "call to action", "submit", "call-to-action",
    ],
    "link": [
        "link", "hyperlink", "anchor", "href",
    ],
    "image": [
        "image", "img", "photo", "icon", "logo", "alt text", "alt-text",
        "thumbnail", "banner",
    ],
    "nav": [
        "nav", "navigation", "menu", "sidebar", "breadcrumb", "tab",
        "header nav", "footer nav", "dropdown menu",
    ],
    "form": [
        "form", "registration", "signup", "sign-up", "sign up", "login",
        "checkout", "dropdown", "select", "radio", "checkbox",
    ],
    "heading": [
        "heading", "title", "h1", "h2", "h3", "h4", "h5", "h6",
        "page title", "section title",
    ],
    "layout": [
        "layout", "container", "grid", "flex", "section", "page",
        "fold", "above the fold", "below the fold", "hero", "spacing",
        "progress indicator", "progress bar",
    ],
    "text": [
        "text", "paragraph", "label", "caption", "description",
        "error message", "message", "copy", "content", "reading level",
    ],
}

# Mapping of keywords to problem categories for classification
_PROBLEM_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "missing": [
        "missing", "absent", "no ", "lack", "without", "not provided",
        "not available", "omitted", "empty",
    ],
    "confusing": [
        "confusing", "unclear", "ambiguous", "cryptic", "vague",
        "misleading", "non-standard", "unexpected", "inconsistent",
        "immutable", "non-intuitive",
    ],
    "slow": [
        "slow", "performance", "loading", "speed", "pagespeed",
        "page speed", "latency", "delay", "timeout",
    ],
    "inaccessible": [
        "accessible", "accessibility", "screen reader", "wcag",
        "alt text", "alt-text", "aria", "keyboard", "blind",
        "assistive", "a11y", "incompatible", "incompatibility",
    ],
    "broken": [
        "broken", "error", "fail", "crash", "bug", "not working",
        "incompatible", "incompatibility",
    ],
    "hidden": [
        "hidden", "below the fold", "pushed down", "buried",
        "hard to find", "not visible", "obscured",
    ],
    "complex": [
        "complex", "complicated", "excessive", "cumbersome",
        "too many", "requirements", "constraints", "friction",
        "forced", "unnecessary", "clutter",
    ],
    "unclear": [
        "unclear", "not clear", "poorly worded", "hard to understand",
        "reading level", "jargon", "technical",
    ],
    "inconsistent": [
        "inconsistent", "different", "mismatch", "varying",
        "not matching", "style", "styling",
    ],
}


@dataclass
class NormalizedIssue:
    """A normalized representation of a UX issue from any source.

    Provides a common schema for comparing ground truth issues with
    Mirror-detected issues during the matching and scoring stages.

    Attributes:
        id: Unique identifier for the issue.
        source: Origin of the issue ("ground_truth" or "mirror").
        site_slug: Site identifier.
        page_url_pattern: Regex pattern for matching the page URL.
        element_type: Classified element type.
        element_description: Original element description text.
        problem_category: Classified problem category.
        problem_description: Original problem description text.
        severity: Issue severity level.
        heuristic: Nielsen's heuristic code if applicable.
        wcag: WCAG success criterion if applicable.
        confidence: Confidence score (0.0 to 1.0).
        corroboration_count: Number of sources/personas reporting this issue.
    """

    id: str
    source: str
    site_slug: str
    page_url_pattern: str
    element_type: str
    element_description: str
    problem_category: str
    problem_description: str
    severity: str
    heuristic: str | None = None
    wcag: str | None = None
    confidence: float = 1.0
    corroboration_count: int = 1


def normalize_page_url(url: str) -> str:
    """Normalize a page URL to a consistent path-based regex pattern.

    Strips the scheme and host, removes trailing slashes, and converts
    the path to a regex pattern that matches common URL variations.

    Args:
        url: A full URL or path (e.g. "https://example.com/checkout" or "/checkout").

    Returns:
        A regex pattern string for matching the normalized path.

    Examples:
        >>> normalize_page_url("https://example.com/checkout")
        '/checkout'
        >>> normalize_page_url("/")
        '/'
        >>> normalize_page_url("https://example.com/courses/search?q=python")
        '/courses/search'
    """
    if not url:
        return "/"

    parsed = urlparse(url)
    path = parsed.path if parsed.path else "/"

    # Strip trailing slash except for root
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")

    return path


def classify_element_type(element: str) -> str:
    """Classify a UI element description into a standardized element type.

    Performs keyword matching against the element description to determine
    the most likely element type category.

    Args:
        element: Free-text description of the UI element.

    Returns:
        One of: "input", "button", "link", "image", "nav", "form",
        "text", "heading", "layout", "other".
    """
    if not element:
        return "other"

    lower = element.lower()

    # Check each element type's keywords
    for element_type, keywords in _ELEMENT_TYPE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in lower:
                return element_type

    return "other"


def classify_problem_category(description: str) -> str:
    """Classify a problem description into a standardized problem category.

    Performs keyword matching against the description to determine the
    most appropriate problem category.

    Args:
        description: Free-text description of the UX problem.

    Returns:
        One of: "missing", "confusing", "slow", "broken", "inaccessible",
        "inconsistent", "hidden", "complex", "unclear".
    """
    if not description:
        return "unclear"

    lower = description.lower()

    # Score each category by counting keyword matches
    scores: dict[str, int] = {}
    for category, keywords in _PROBLEM_CATEGORY_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            if keyword in lower:
                score += 1
        if score > 0:
            scores[category] = score

    if not scores:
        return "unclear"

    # Return the category with the highest score
    return max(scores, key=scores.get)  # type: ignore[arg-type]


def normalize_gt_issue(issue: GroundTruthIssue) -> NormalizedIssue:
    """Normalize a ground truth issue into the common NormalizedIssue format.

    Args:
        issue: A GroundTruthIssue from the ground truth corpus.

    Returns:
        A NormalizedIssue with classified element type and problem category.
    """
    return NormalizedIssue(
        id=issue.id,
        source="ground_truth",
        site_slug=issue.site_slug,
        page_url_pattern=issue.page_pattern,
        element_type=classify_element_type(issue.element),
        element_description=issue.element,
        problem_category=classify_problem_category(issue.description),
        problem_description=issue.description,
        severity=issue.severity,
        heuristic=issue.heuristic,
        wcag=issue.wcag,
        confidence=1.0,
        corroboration_count=1,
    )


def normalize_mirror_issue(issue: dict) -> NormalizedIssue:
    """Normalize a Mirror-detected issue into the common NormalizedIssue format.

    Takes a dictionary with Mirror issue fields and converts it to the
    standardized NormalizedIssue format for comparison against ground truth.

    Args:
        issue: Dictionary with keys matching Mirror's issue output format.
            Expected keys: id, site_slug, page_url, element, description,
            severity. Optional keys: heuristic, wcag_criterion, confidence,
            corroboration_count.

    Returns:
        A NormalizedIssue with classified element type and problem category.
    """
    page_url = issue.get("page_url", "/")
    normalized_path = normalize_page_url(page_url)
    # Escape special regex characters in the path and allow optional trailing slash
    escaped_path = re.escape(normalized_path)
    page_pattern = f"^{escaped_path}/?$"

    element = issue.get("element", "")
    description = issue.get("description", "")

    return NormalizedIssue(
        id=issue.get("id", "MIRROR-unknown"),
        source="mirror",
        site_slug=issue.get("site_slug", "unknown"),
        page_url_pattern=page_pattern,
        element_type=classify_element_type(element),
        element_description=element,
        problem_category=classify_problem_category(description),
        problem_description=description,
        severity=issue.get("severity", "minor"),
        heuristic=issue.get("heuristic"),
        wcag=issue.get("wcag_criterion"),
        confidence=issue.get("confidence", 0.8),
        corroboration_count=issue.get("corroboration_count", 1),
    )
