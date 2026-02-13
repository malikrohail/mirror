"""Ground truth schema definitions for the Mirror benchmark pipeline.

Defines the core data structures used to represent known UX issues
from published audits and accessibility evaluations. These serve as
the baseline against which Mirror's automated findings are compared.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from urllib.parse import urlparse

VALID_SEVERITIES = frozenset({"critical", "major", "minor", "enhancement"})
VALID_CATEGORIES = frozenset({
    "forms",
    "navigation",
    "content",
    "visual",
    "performance",
    "accessibility",
    "trust",
    "flow",
})
VALID_SOURCES = frozenset({"self-audit", "published-audit", "court-filing", "automated-scan"})


@dataclass
class GroundTruthIssue:
    """A known UX issue from a published audit or accessibility evaluation.

    Each issue is tied to a specific site and page, with metadata about
    its severity, category, heuristic violation, and provenance.

    Attributes:
        id: Unique identifier in format "GT-{site_slug}-{NNN}".
        site_slug: Short identifier for the site (e.g. "healthcare_gov").
        site_url: Full base URL of the site.
        page_url: Path portion of the URL where the issue occurs (e.g. "/checkout").
        page_pattern: Regex pattern for matching URLs where this issue may appear.
        element: Description of the UI element involved.
        description: Human-readable description of the UX problem.
        severity: One of "critical", "major", "minor", "enhancement".
        category: Issue category (forms, navigation, content, visual, etc.).
        heuristic: Nielsen's heuristic code (e.g. "H7") if applicable.
        wcag: WCAG success criterion (e.g. "1.1.1") if applicable.
        source: Provenance of the issue data.
        source_url: URL of the published audit or filing.
        verified_date: Date when the issue was last verified (ISO format).
        still_present: Whether the issue is believed to still exist.
        evidence: Additional evidence or notes about the issue.
        tags: Free-form tags for additional classification.
    """

    id: str
    site_slug: str
    site_url: str
    page_url: str
    page_pattern: str
    element: str
    description: str
    severity: str
    category: str
    heuristic: str | None = None
    wcag: str | None = None
    source: str = "self-audit"
    source_url: str | None = None
    verified_date: str = "2026-02-13"
    still_present: bool = True
    evidence: str = ""
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Serialize the issue to a plain dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> GroundTruthIssue:
        """Deserialize an issue from a plain dictionary.

        Args:
            data: Dictionary with issue fields matching the dataclass attributes.

        Returns:
            A new GroundTruthIssue instance.
        """
        return cls(**data)

    def matches_url(self, url: str) -> bool:
        """Check if a given URL matches this issue's page pattern.

        Args:
            url: The URL or path to check against the page_pattern.

        Returns:
            True if the URL matches the pattern.
        """
        try:
            parsed = urlparse(url)
            path = parsed.path or "/"
            return bool(re.search(self.page_pattern, path))
        except re.error:
            return False


@dataclass
class BenchmarkSiteConfig:
    """Configuration for a benchmark site including tasks to evaluate.

    Attributes:
        site_slug: Short identifier for the site.
        site_url: Full base URL of the site.
        tasks: List of task descriptions for personas to attempt.
        description: Human-readable description of the site and audit context.
        tier: Confidence tier (1=self-audit, 2=published, 3=automated).
    """

    site_slug: str
    site_url: str
    tasks: list[str]
    description: str = ""
    tier: int = 2
