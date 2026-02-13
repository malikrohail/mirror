"""Matching result schema definitions for the benchmark matcher.

Defines data structures for judge scores, validation results, individual
issue matches, and the aggregate match result used to compute precision
and recall metrics.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field


@dataclass
class JudgeScore:
    """Result of an LLM judge scoring a pair of issues.

    Attributes:
        score: Semantic similarity score from 0 (no match) to 3 (exact match).
        reasoning: Judge's explanation of the score.
        matched_aspect: What specifically matches between the two issues, or None.
        difference: What differs between the two issues, or None.
    """

    score: int
    reasoning: str
    matched_aspect: str | None = None
    difference: str | None = None

    def to_dict(self) -> dict:
        """Serialize to a plain dictionary."""
        return asdict(self)


@dataclass
class ValidationResult:
    """Result of validating whether an unmatched Mirror issue is a true finding.

    Attributes:
        issue_id: The Mirror issue identifier.
        verdict: Classification as "real", "borderline", or "false_positive".
        reasoning: Explanation of the verdict.
        confidence: Confidence in the verdict (0.0 to 1.0).
    """

    issue_id: str
    verdict: str  # "real" | "borderline" | "false_positive"
    reasoning: str
    confidence: float

    def to_dict(self) -> dict:
        """Serialize to a plain dictionary."""
        return asdict(self)


@dataclass
class IssueMatch:
    """A confirmed match between a ground truth issue and a Mirror issue.

    Attributes:
        gt_id: The ground truth issue identifier.
        mirror_id: The Mirror issue identifier.
        score: The judge score (2 or 3, at or above the match threshold).
        reasoning: The judge's explanation of why the issues match.
    """

    gt_id: str
    mirror_id: str
    score: int  # 2 or 3 (threshold for match)
    reasoning: str

    def to_dict(self) -> dict:
        """Serialize to a plain dictionary."""
        return asdict(self)


@dataclass
class MatchResult:
    """Aggregate result of matching all Mirror issues against ground truth for a site.

    Contains matched pairs, unmatched issues from both sides, validation
    results for unmatched Mirror issues, and all raw judge scores for analysis.

    Attributes:
        site_slug: Site identifier for this match result.
        matches: List of confirmed issue matches.
        unmatched_gt: Ground truth issues with no Mirror match (false negatives).
        unmatched_mirror: Mirror issues with no ground truth match (potential FPs).
        validated_unmatched: Validation results for unmatched Mirror issues.
        judge_scores: All pairwise judge scores for analysis and debugging.
    """

    site_slug: str
    matches: list[IssueMatch] = field(default_factory=list)
    unmatched_gt: list[dict] = field(default_factory=list)
    unmatched_mirror: list[dict] = field(default_factory=list)
    validated_unmatched: list[ValidationResult] = field(default_factory=list)
    judge_scores: list[dict] = field(default_factory=list)

    @property
    def true_positives(self) -> int:
        """Count of true positives: matched issues + validated-real unmatched Mirror issues."""
        return len(self.matches) + len(
            [v for v in self.validated_unmatched if v.verdict == "real"]
        )

    @property
    def false_positives(self) -> int:
        """Count of false positives: unmatched Mirror issues validated as not real."""
        return len(
            [v for v in self.validated_unmatched if v.verdict == "false_positive"]
        )

    @property
    def false_negatives(self) -> int:
        """Count of false negatives: ground truth issues not matched by Mirror."""
        return len(self.unmatched_gt)

    def to_dict(self) -> dict:
        """Serialize to a plain dictionary including computed metrics."""
        return {
            "site_slug": self.site_slug,
            "matches": [m.to_dict() for m in self.matches],
            "unmatched_gt": self.unmatched_gt,
            "unmatched_mirror": self.unmatched_mirror,
            "validated_unmatched": [v.to_dict() for v in self.validated_unmatched],
            "judge_scores": self.judge_scores,
            "true_positives": self.true_positives,
            "false_positives": self.false_positives,
            "false_negatives": self.false_negatives,
        }
