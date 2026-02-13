"""Schema definitions for the benchmark executor pipeline.

Defines the core data structures for configuring benchmark runs,
representing Mirror-detected issues, and packaging run results.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class BenchmarkRunConfig:
    """Configuration for a single benchmark run against a target site.

    Attributes:
        site_slug: Short identifier for the site (e.g. "healthcare_gov").
        site_url: Full URL of the site under test.
        tasks: List of task descriptions for personas to attempt.
        personas: List of persona profile dicts; if empty, defaults are used.
        max_steps: Maximum navigation steps per session.
        timeout: Maximum wall-clock time in seconds for the entire study.
        device: Device type ("desktop" or "mobile").
        seed_personas: Whether to use the built-in benchmark persona set.
        disable_firecrawl: Whether to skip Firecrawl pre-crawling.
        model_override: Optional dict mapping pipeline stages to model names.
    """

    site_slug: str
    site_url: str
    tasks: list[str]
    personas: list[dict] = field(default_factory=list)
    max_steps: int = 30
    timeout: int = 600
    device: str = "desktop"
    seed_personas: bool = True
    disable_firecrawl: bool = False
    model_override: dict | None = None

    def to_dict(self) -> dict:
        """Serialize the config to a plain dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> BenchmarkRunConfig:
        """Deserialize a config from a plain dictionary.

        Args:
            data: Dictionary with fields matching the dataclass attributes.

        Returns:
            A new BenchmarkRunConfig instance.
        """
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class MirrorIssue:
    """A UX issue detected by Mirror during a benchmark run.

    Represents a single finding from a persona session, including
    behavioral context used for precision scoring.

    Attributes:
        id: Unique identifier in format "MI-{study_id[:8]}-{NNN}".
        study_id: UUID of the parent study.
        session_id: UUID of the session where the issue was found.
        persona_role: Role identifier of the persona (e.g. "low-tech-elderly").
        step_number: Step number within the session where the issue occurred.
        page_url: URL of the page where the issue was observed.
        element: Description of the affected UI element.
        description: Human-readable description of the UX problem.
        severity: One of "critical", "major", "minor", "enhancement".
        heuristic: Nielsen's heuristic code (e.g. "H7") if applicable.
        wcag: WCAG success criterion (e.g. "1.1.1") if applicable.
        recommendation: Suggested fix for the issue.
        confidence: Persona's confidence level at the time (0.0-1.0).
        priority_score: Computed priority score if available.
        emotional_state: Persona's emotional state when encountering the issue.
        task_progress: Percentage of task completed (0.0-100.0).
        session_completed: Whether the persona completed the task.
        personas_also_found: Number of personas that reported similar issues.
    """

    id: str
    study_id: str
    session_id: str
    persona_role: str
    step_number: int | None
    page_url: str
    element: str
    description: str
    severity: str
    heuristic: str | None = None
    wcag: str | None = None
    recommendation: str | None = None
    confidence: float = 0.5
    priority_score: float | None = None
    emotional_state: str | None = None
    task_progress: float | None = None
    session_completed: bool = False
    personas_also_found: int = 1

    def to_dict(self) -> dict:
        """Serialize the issue to a plain dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> MirrorIssue:
        """Deserialize an issue from a plain dictionary.

        Only includes keys that match known dataclass fields, so extra
        keys in the input dict are silently ignored.

        Args:
            data: Dictionary with issue fields.

        Returns:
            A new MirrorIssue instance.
        """
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class BenchmarkRunResult:
    """Complete result of running Mirror against a benchmark site.

    Packages all issues found, session summaries, and metadata
    for downstream scoring and comparison against ground truth.

    Attributes:
        site_slug: Short identifier for the site.
        study_id: UUID of the Mirror study.
        config: The run configuration used.
        mirror_issues: List of all issues detected.
        pages_visited: Deduplicated list of page URLs visited.
        sessions: Summary dicts for each persona session.
        total_steps: Total navigation steps across all sessions.
        total_time_seconds: Wall-clock time for the entire run.
        api_cost_estimate: Estimated API cost in USD.
    """

    site_slug: str
    study_id: str
    config: BenchmarkRunConfig
    mirror_issues: list[MirrorIssue]
    pages_visited: list[str]
    sessions: list[dict]
    total_steps: int
    total_time_seconds: float
    api_cost_estimate: float

    def to_dict(self) -> dict:
        """Serialize the result to a plain dictionary.

        Nested BenchmarkRunConfig and MirrorIssue objects are also
        converted to plain dicts for JSON serialization.
        """
        d = asdict(self)
        d["config"] = self.config.to_dict()
        return d

    @classmethod
    def from_dict(cls, data: dict) -> BenchmarkRunResult:
        """Deserialize a result from a plain dictionary.

        Handles nested deserialization of config and mirror_issues.

        Args:
            data: Dictionary with result fields.

        Returns:
            A new BenchmarkRunResult instance.
        """
        data = dict(data)  # Shallow copy to avoid mutating caller's dict
        data["config"] = BenchmarkRunConfig.from_dict(data["config"])
        data["mirror_issues"] = [
            MirrorIssue.from_dict(i) for i in data["mirror_issues"]
        ]
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})
