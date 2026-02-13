"""Issue collector: extracts and filters issues from Mirror study results.

Implements the precision interventions that reduce false positives
by requiring behavioral evidence and cross-persona corroboration.
"""

from __future__ import annotations

from collections import defaultdict
from difflib import SequenceMatcher

from benchmark.executor.schema import BenchmarkRunResult, MirrorIssue

# Emotional states considered indicative of genuine UX struggle
_STRUGGLE_EMOTIONS = frozenset({"frustrated", "confused", "anxious"})

# Minimum similarity ratio for two issue descriptions to be considered
# the same finding by different personas (used in corroboration).
_DESCRIPTION_SIMILARITY_THRESHOLD = 0.5


class IssueCollector:
    """Extracts and filters issues from Mirror study results.

    Provides multiple filtering "interventions" that can be applied
    individually or chained to improve precision:

    1. Confidence filter -- keeps issues where the persona was struggling.
    2. Behavioral evidence filter -- weights issues by observable signals.
    3. Corroboration -- counts how many personas reported similar issues.
    """

    def collect_from_result(self, result: BenchmarkRunResult) -> list[MirrorIssue]:
        """Get all issues from a benchmark run result without filtering.

        Args:
            result: A completed benchmark run result.

        Returns:
            A copy of the issue list from the result.
        """
        return list(result.mirror_issues)

    def filter_by_confidence(
        self,
        issues: list[MirrorIssue],
        threshold: float = 0.6,
    ) -> list[MirrorIssue]:
        """Intervention 1: Only keep issues where the persona struggled.

        An issue is kept if any of these conditions hold:
          - The persona's confidence was at or below the threshold.
          - Multiple personas corroborated the finding (personas_also_found >= 2).
          - The persona's emotional state indicates struggle (confused, frustrated, anxious).

        Args:
            issues: List of MirrorIssues to filter.
            threshold: Maximum confidence value to pass through directly.

        Returns:
            Filtered list of issues meeting at least one keep criterion.
        """
        kept: list[MirrorIssue] = []
        for issue in issues:
            if issue.confidence <= threshold:
                kept.append(issue)
            elif issue.personas_also_found >= 2:
                kept.append(issue)
            elif issue.emotional_state in _STRUGGLE_EMOTIONS:
                kept.append(issue)
        return kept

    def filter_by_behavioral_evidence(
        self,
        issues: list[MirrorIssue],
        min_score: float = 0.2,
    ) -> list[MirrorIssue]:
        """Intervention 3: Weight issues by behavioral evidence.

        Computes a behavioral evidence score for each issue and only
        keeps those that exceed the minimum threshold.

        Args:
            issues: List of MirrorIssues to filter.
            min_score: Minimum behavioral_evidence_score to keep.

        Returns:
            Filtered list of issues with sufficient behavioral evidence.
        """
        return [
            issue
            for issue in issues
            if self.behavioral_evidence_score(issue) >= min_score
        ]

    @staticmethod
    def behavioral_evidence_score(issue: MirrorIssue) -> float:
        """Compute a behavioral evidence score for a single issue.

        The score aggregates multiple behavioral signals:
          - Emotional struggle (frustrated/confused/anxious): +0.4
          - No task progress (task_progress <= 0): +0.3
          - Cross-persona corroboration (up to 3 extra): +0.1 per persona
          - Session not completed: +0.2

        Args:
            issue: The MirrorIssue to score.

        Returns:
            A float between 0.0 and 1.0 inclusive.
        """
        score = 0.0
        if issue.emotional_state in _STRUGGLE_EMOTIONS:
            score += 0.4
        if issue.task_progress is not None and issue.task_progress <= 0:
            score += 0.3
        score += min(issue.personas_also_found - 1, 3) * 0.1
        if not issue.session_completed:
            score += 0.2
        return min(score, 1.0)

    def apply_all_filters(self, issues: list[MirrorIssue]) -> list[MirrorIssue]:
        """Apply all precision interventions sequentially.

        Runs confidence filtering first, then behavioral evidence filtering.

        Args:
            issues: List of MirrorIssues to filter.

        Returns:
            Filtered list after all interventions are applied.
        """
        filtered = self.filter_by_confidence(issues)
        filtered = self.filter_by_behavioral_evidence(filtered)
        return filtered

    def compute_corroboration(
        self, issues: list[MirrorIssue]
    ) -> list[MirrorIssue]:
        """Count how many personas reported similar issues on the same page.

        Groups issues by page_url, then for each pair of issues on the
        same page checks whether their descriptions are sufficiently similar
        (using SequenceMatcher). Updates the personas_also_found field on
        each issue.

        Args:
            issues: List of MirrorIssues to analyze. Modified in-place.

        Returns:
            The same list with updated personas_also_found values.
        """
        # Group issues by page_url
        by_page: dict[str, list[MirrorIssue]] = defaultdict(list)
        for issue in issues:
            by_page[issue.page_url].append(issue)

        # For each page, compare all pairs of issues from different personas
        for page_url, page_issues in by_page.items():
            for i, issue_a in enumerate(page_issues):
                similar_personas: set[str] = {issue_a.persona_role}
                for j, issue_b in enumerate(page_issues):
                    if i == j:
                        continue
                    if issue_a.persona_role == issue_b.persona_role:
                        continue
                    similarity = SequenceMatcher(
                        None,
                        issue_a.description.lower(),
                        issue_b.description.lower(),
                    ).ratio()
                    if similarity >= _DESCRIPTION_SIMILARITY_THRESHOLD:
                        similar_personas.add(issue_b.persona_role)
                issue_a.personas_also_found = len(similar_personas)

        return issues
