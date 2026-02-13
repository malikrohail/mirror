"""Ground truth data loader for the Mirror benchmark pipeline.

Provides functions for loading, validating, and enumerating ground truth
issue sets and site configurations from the JSON files stored in the
ground_truth/sites/ and ground_truth/tasks/ directories.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from benchmark.ground_truth.schema import (
    VALID_CATEGORIES,
    VALID_SEVERITIES,
    VALID_SOURCES,
    BenchmarkSiteConfig,
    GroundTruthIssue,
)

# Base directory for ground truth data files
_BASE_DIR = Path(__file__).parent
_SITES_DIR = _BASE_DIR / "sites"
_TASKS_DIR = _BASE_DIR / "tasks"


def load_site_issues(site_slug: str) -> list[GroundTruthIssue]:
    """Load all ground truth issues for a specific site.

    Args:
        site_slug: The site identifier (e.g. "healthcare_gov").

    Returns:
        List of GroundTruthIssue instances loaded from the site's JSON file.

    Raises:
        FileNotFoundError: If no JSON file exists for the given site slug.
        json.JSONDecodeError: If the JSON file is malformed.
    """
    filepath = _SITES_DIR / f"{site_slug}.json"
    if not filepath.exists():
        raise FileNotFoundError(
            f"No ground truth data found for site '{site_slug}' at {filepath}"
        )

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    issues_data = data.get("issues", [])
    return [GroundTruthIssue.from_dict(item) for item in issues_data]


def load_all_issues() -> dict[str, list[GroundTruthIssue]]:
    """Load ground truth issues for all available sites.

    Returns:
        Dictionary mapping site slugs to their lists of GroundTruthIssue instances.
    """
    result: dict[str, list[GroundTruthIssue]] = {}
    for site_slug in get_available_sites():
        result[site_slug] = load_site_issues(site_slug)
    return result


def load_site_config(site_slug: str) -> BenchmarkSiteConfig:
    """Load the benchmark task configuration for a specific site.

    Args:
        site_slug: The site identifier (e.g. "healthcare_gov").

    Returns:
        A BenchmarkSiteConfig instance with the site's tasks and metadata.

    Raises:
        FileNotFoundError: If no task config JSON file exists for the given site slug.
        json.JSONDecodeError: If the JSON file is malformed.
    """
    filepath = _TASKS_DIR / f"{site_slug}.json"
    if not filepath.exists():
        raise FileNotFoundError(
            f"No task config found for site '{site_slug}' at {filepath}"
        )

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    return BenchmarkSiteConfig(
        site_slug=data["site_slug"],
        site_url=data["site_url"],
        tasks=data["tasks"],
        description=data.get("description", ""),
        tier=data.get("tier", 2),
    )


def validate_issue(issue: GroundTruthIssue) -> list[str]:
    """Validate a ground truth issue for completeness and correctness.

    Checks that all required fields are present and conform to allowed values.

    Args:
        issue: The GroundTruthIssue to validate.

    Returns:
        A list of validation error messages. Empty if the issue is valid.
    """
    errors: list[str] = []

    # ID format: GT-{site_slug}-{NNN}
    if not issue.id:
        errors.append("Missing required field: id")
    elif not re.match(r"^GT-[\w]+-\d{3}$", issue.id):
        errors.append(
            f"Invalid id format '{issue.id}': expected 'GT-{{site_slug}}-{{NNN}}'"
        )

    if not issue.site_slug:
        errors.append("Missing required field: site_slug")

    if not issue.site_url:
        errors.append("Missing required field: site_url")

    if not issue.page_url:
        errors.append("Missing required field: page_url")

    if not issue.page_pattern:
        errors.append("Missing required field: page_pattern")
    else:
        try:
            re.compile(issue.page_pattern)
        except re.error as e:
            errors.append(f"Invalid page_pattern regex: {e}")

    if not issue.element:
        errors.append("Missing required field: element")

    if not issue.description:
        errors.append("Missing required field: description")

    if issue.severity not in VALID_SEVERITIES:
        errors.append(
            f"Invalid severity '{issue.severity}': "
            f"must be one of {sorted(VALID_SEVERITIES)}"
        )

    if issue.category not in VALID_CATEGORIES:
        errors.append(
            f"Invalid category '{issue.category}': "
            f"must be one of {sorted(VALID_CATEGORIES)}"
        )

    if issue.source and issue.source not in VALID_SOURCES:
        errors.append(
            f"Invalid source '{issue.source}': "
            f"must be one of {sorted(VALID_SOURCES)}"
        )

    # Validate verified_date format (YYYY-MM-DD)
    if issue.verified_date and not re.match(
        r"^\d{4}-\d{2}-\d{2}$", issue.verified_date
    ):
        errors.append(
            f"Invalid verified_date format '{issue.verified_date}': "
            f"expected YYYY-MM-DD"
        )

    return errors


def get_available_sites() -> list[str]:
    """List all site slugs that have ground truth data files.

    Returns:
        Sorted list of site slug strings derived from JSON filenames
        in the sites/ directory.
    """
    if not _SITES_DIR.exists():
        return []

    return sorted(
        p.stem for p in _SITES_DIR.glob("*.json") if p.is_file()
    )
