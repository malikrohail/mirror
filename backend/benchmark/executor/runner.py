"""Benchmark runner: executes Mirror studies against benchmark sites.

The runner builds run configurations, can create mock results for testing,
and handles persistence of results to disk for downstream scoring.
"""

from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any

from benchmark.executor.schema import (
    BenchmarkRunConfig,
    BenchmarkRunResult,
    MirrorIssue,
)


class BenchmarkRunner:
    """Runs Mirror on benchmark sites and collects results.

    In benchmark mode, the runner does not call Mirror's live API.
    Instead it either:
      - Creates mock results from pre-defined issue data (for testing).
      - Loads previously saved results from JSON output files.

    A fixed set of BENCHMARK_PERSONAS ensures reproducible comparisons
    across different sites and over time.
    """

    BENCHMARK_PERSONAS: list[dict[str, Any]] = [
        {
            "name": "Maria Chen",
            "age": 72,
            "tech_literacy": 2,
            "patience_level": 4,
            "reading_speed": 8,
            "trust_level": 3,
            "exploration_tendency": 3,
            "accessibility_needs": {"low_vision": True},
            "role": "low-tech-elderly",
        },
        {
            "name": "James Okonkwo",
            "age": 34,
            "tech_literacy": 9,
            "patience_level": 2,
            "reading_speed": 2,
            "trust_level": 6,
            "exploration_tendency": 2,
            "role": "power-user-impatient",
        },
        {
            "name": "Priya Sharma",
            "age": 28,
            "tech_literacy": 5,
            "patience_level": 6,
            "reading_speed": 5,
            "trust_level": 2,
            "exploration_tendency": 7,
            "role": "explorer-skeptical",
        },
        {
            "name": "David Müller",
            "age": 45,
            "tech_literacy": 4,
            "patience_level": 5,
            "reading_speed": 3,
            "trust_level": 5,
            "exploration_tendency": 4,
            "role": "non-native-moderate",
        },
        {
            "name": "Sam Taylor",
            "age": 38,
            "tech_literacy": 7,
            "patience_level": 7,
            "reading_speed": 6,
            "trust_level": 4,
            "exploration_tendency": 5,
            "accessibility_needs": {"screen_reader": True},
            "role": "accessibility-focused",
        },
    ]

    def build_config(
        self,
        site_slug: str,
        site_url: str,
        tasks: list[str],
    ) -> BenchmarkRunConfig:
        """Build a benchmark run configuration with default personas.

        Args:
            site_slug: Short identifier for the site.
            site_url: Full URL of the site under test.
            tasks: List of task descriptions for personas to attempt.

        Returns:
            A BenchmarkRunConfig populated with the benchmark persona set.
        """
        return BenchmarkRunConfig(
            site_slug=site_slug,
            site_url=site_url,
            tasks=tasks,
            personas=[dict(p) for p in self.BENCHMARK_PERSONAS],
            seed_personas=True,
        )

    def save_result(self, result: BenchmarkRunResult, output_path: Path) -> None:
        """Save a benchmark run result to a JSON file.

        Creates parent directories if they do not exist.

        Args:
            result: The benchmark run result to persist.
            output_path: File path where the JSON will be written.
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)

    def load_result(self, path: Path) -> BenchmarkRunResult:
        """Load a benchmark run result from a JSON file.

        Args:
            path: File path to the JSON result file.

        Returns:
            The deserialized BenchmarkRunResult.

        Raises:
            FileNotFoundError: If the file does not exist.
            json.JSONDecodeError: If the file contains invalid JSON.
        """
        path = Path(path)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return BenchmarkRunResult.from_dict(data)

    def create_mock_result(
        self,
        config: BenchmarkRunConfig,
        mock_issues: list[dict],
    ) -> BenchmarkRunResult:
        """Create a BenchmarkRunResult from mock data for testing.

        Generates a synthetic study ID and session IDs, then constructs
        MirrorIssue instances from the provided issue dicts.

        Args:
            config: The run configuration to associate with the result.
            mock_issues: List of dicts with issue fields. Each dict must
                contain at least: page_url, element, description, severity,
                persona_role. Missing fields get sensible defaults.

        Returns:
            A fully populated BenchmarkRunResult suitable for testing.
        """
        study_id = uuid.uuid4().hex
        session_id = uuid.uuid4().hex

        issues: list[MirrorIssue] = []
        pages_visited: set[str] = set()

        for idx, raw in enumerate(mock_issues):
            issue_id = f"MI-{study_id[:8]}-{idx + 1:03d}"
            issue = MirrorIssue(
                id=issue_id,
                study_id=study_id,
                session_id=raw.get("session_id", session_id),
                persona_role=raw.get("persona_role", "unknown"),
                step_number=raw.get("step_number"),
                page_url=raw.get("page_url", "/"),
                element=raw.get("element", "unknown"),
                description=raw.get("description", ""),
                severity=raw.get("severity", "minor"),
                heuristic=raw.get("heuristic"),
                wcag=raw.get("wcag"),
                recommendation=raw.get("recommendation"),
                confidence=raw.get("confidence", 0.5),
                priority_score=raw.get("priority_score"),
                emotional_state=raw.get("emotional_state"),
                task_progress=raw.get("task_progress"),
                session_completed=raw.get("session_completed", False),
                personas_also_found=raw.get("personas_also_found", 1),
            )
            issues.append(issue)
            pages_visited.add(issue.page_url)

        # Build mock session summaries from personas in the config
        sessions: list[dict] = []
        for persona in config.personas:
            sessions.append(
                {
                    "session_id": session_id,
                    "persona_role": persona.get("role", "unknown"),
                    "persona_name": persona.get("name", "Unknown"),
                    "status": "complete",
                    "task_completed": True,
                    "total_steps": 10,
                }
            )

        return BenchmarkRunResult(
            site_slug=config.site_slug,
            study_id=study_id,
            config=config,
            mirror_issues=issues,
            pages_visited=sorted(pages_visited),
            sessions=sessions,
            total_steps=len(mock_issues) * 2,
            total_time_seconds=0.0,
            api_cost_estimate=0.0,
        )
