"""LLM-as-Judge matching engine for the benchmark pipeline.

Provides the IssueMatcher class that uses an LLM judge (or mock) to
determine semantic matches between ground truth and Mirror-detected
UX issues. Includes pre-filtering by page URL, position bias mitigation,
and greedy best-match assignment.
"""

from __future__ import annotations

import json
import random
import re
from difflib import SequenceMatcher
from typing import Any, Protocol
from urllib.parse import urlparse

from benchmark.matcher.prompts import JUDGE_SYSTEM_PROMPT, JUDGE_USER_PROMPT
from benchmark.matcher.schema import IssueMatch, JudgeScore, MatchResult


class LLMJudge(Protocol):
    """Protocol for LLM judge implementations.

    Supports both real (Claude API) and mock (string similarity)
    implementations for testing without API keys.
    """

    async def judge_pair(self, system: str, user: str) -> str:
        """Send a system+user prompt pair and return the raw response text."""
        ...


class MockLLMJudge:
    """Mock judge using string similarity for testing without an API.

    Extracts issue descriptions from the formatted user prompt and
    computes a SequenceMatcher ratio to produce a deterministic score.
    """

    def _extract_descriptions(self, user_prompt: str) -> tuple[str, str]:
        """Extract the two Description fields from the judge user prompt.

        Args:
            user_prompt: The formatted JUDGE_USER_PROMPT text.

        Returns:
            A tuple of (description_a, description_b).
        """
        desc_pattern = r"Description:\s*(.+)"
        matches = re.findall(desc_pattern, user_prompt)
        if len(matches) >= 2:
            return matches[0].strip(), matches[1].strip()
        return "", ""

    def _extract_elements(self, user_prompt: str) -> tuple[str, str]:
        """Extract the two Element fields from the judge user prompt.

        Args:
            user_prompt: The formatted JUDGE_USER_PROMPT text.

        Returns:
            A tuple of (element_a, element_b).
        """
        elem_pattern = r"Element:\s*(.+)"
        matches = re.findall(elem_pattern, user_prompt)
        if len(matches) >= 2:
            return matches[0].strip(), matches[1].strip()
        return "", ""

    def _extract_pages(self, user_prompt: str) -> tuple[str, str]:
        """Extract the two Page fields from the judge user prompt.

        Args:
            user_prompt: The formatted JUDGE_USER_PROMPT text.

        Returns:
            A tuple of (page_a, page_b).
        """
        page_pattern = r"Page:\s*(.+)"
        matches = re.findall(page_pattern, user_prompt)
        if len(matches) >= 2:
            return matches[0].strip(), matches[1].strip()
        return "", ""

    async def judge_pair(self, system: str, user: str) -> str:
        """Score a pair of issues using string similarity.

        Computes similarity from descriptions, elements, and page URLs
        to produce a deterministic score from 0 to 3.

        Args:
            system: The system prompt (unused in mock but accepted for protocol).
            user: The formatted user prompt containing both issues.

        Returns:
            A JSON string with score, reasoning, matched_aspect, and difference.
        """
        desc_a, desc_b = self._extract_descriptions(user)
        elem_a, elem_b = self._extract_elements(user)
        page_a, page_b = self._extract_pages(user)

        # Compute similarity ratios
        desc_ratio = SequenceMatcher(None, desc_a.lower(), desc_b.lower()).ratio()
        elem_ratio = SequenceMatcher(None, elem_a.lower(), elem_b.lower()).ratio()
        page_ratio = SequenceMatcher(None, page_a.lower(), page_b.lower()).ratio()

        # Weighted composite: description matters most, then element, then page
        composite = desc_ratio * 0.5 + elem_ratio * 0.3 + page_ratio * 0.2

        # Map composite ratio to 0-3 score
        if composite >= 0.75:
            score = 3
        elif composite >= 0.55:
            score = 2
        elif composite >= 0.35:
            score = 1
        else:
            score = 0

        matched_aspect = None
        difference = None

        if score >= 2:
            matched_aspect = "Similar descriptions and elements"
        if score <= 1:
            difference = "Descriptions or elements differ significantly"

        result = {
            "score": score,
            "reasoning": (
                f"String similarity: desc={desc_ratio:.2f}, "
                f"elem={elem_ratio:.2f}, page={page_ratio:.2f}. "
                f"Composite={composite:.2f} maps to score {score}."
            ),
            "matched_aspect": matched_aspect,
            "difference": difference,
        }
        return json.dumps(result)


class IssueMatcher:
    """Matches Mirror-detected issues against ground truth using an LLM judge.

    Performs three phases:
    1. Pre-filter candidate pairs by page URL compatibility.
    2. Score each candidate pair via the LLM judge.
    3. Greedy best-match assignment to produce final matches.

    Args:
        judge: An LLM judge implementation (defaults to MockLLMJudge).
        match_threshold: Minimum judge score to consider a pair a match (default 2).
    """

    def __init__(self, judge: LLMJudge | None = None, match_threshold: int = 2) -> None:
        self.judge = judge or MockLLMJudge()
        self.match_threshold = match_threshold

    async def match_site(
        self,
        gt_issues: list[dict],
        mirror_issues: list[dict],
        site_slug: str,
        site_url: str,
    ) -> MatchResult:
        """Match all Mirror issues against ground truth for one site.

        Args:
            gt_issues: List of ground truth issue dicts. Expected keys:
                id, page_url, element, description, severity, heuristic.
            mirror_issues: List of Mirror issue dicts with the same keys.
            site_slug: The site identifier.
            site_url: The full site URL.

        Returns:
            A MatchResult with matches, unmatched issues, and all judge scores.
        """
        result = MatchResult(site_slug=site_slug)

        if not gt_issues or not mirror_issues:
            # No possible matches
            result.unmatched_gt = list(gt_issues)
            result.unmatched_mirror = list(mirror_issues)
            return result

        gt_ids = [g["id"] for g in gt_issues]
        mi_ids = [m["id"] for m in mirror_issues]

        # Build lookup dicts
        gt_by_id = {g["id"]: g for g in gt_issues}
        mi_by_id = {m["id"]: m for m in mirror_issues}

        # Phase 1: Pre-filter candidate pairs by page URL
        candidates: list[tuple[str, str]] = []
        for gt in gt_issues:
            for mi in mirror_issues:
                gt_page = gt.get("page_url", "/")
                mi_page = mi.get("page_url", "/")
                if self._pages_could_match(gt_page, mi_page):
                    candidates.append((gt["id"], mi["id"]))

        # Phase 2: Score each candidate pair
        # score_matrix[gt_id][mi_id] = JudgeScore
        score_matrix: dict[str, dict[str, JudgeScore]] = {}
        for gt_id, mi_id in candidates:
            gt = gt_by_id[gt_id]
            mi = mi_by_id[mi_id]
            judge_score = await self._score_pair(gt, mi, site_url)

            if gt_id not in score_matrix:
                score_matrix[gt_id] = {}
            score_matrix[gt_id][mi_id] = judge_score

            # Record all scores for analysis
            result.judge_scores.append({
                "gt_id": gt_id,
                "mirror_id": mi_id,
                "score": judge_score.score,
                "reasoning": judge_score.reasoning,
                "matched_aspect": judge_score.matched_aspect,
                "difference": judge_score.difference,
            })

        # Phase 3: Greedy best-match assignment
        result.matches = self._greedy_assign(score_matrix, gt_ids, mi_ids)

        # Determine unmatched issues
        matched_gt_ids = {m.gt_id for m in result.matches}
        matched_mi_ids = {m.mirror_id for m in result.matches}

        result.unmatched_gt = [g for g in gt_issues if g["id"] not in matched_gt_ids]
        result.unmatched_mirror = [m for m in mirror_issues if m["id"] not in matched_mi_ids]

        return result

    def _pages_could_match(self, gt_page: str, mirror_page: str) -> bool:
        """Check if two page URLs could refer to the same page.

        Considers exact match, homepage wildcard (ground truth "/" matches
        any page), and shared path prefix for related pages.

        Args:
            gt_page: The ground truth page URL or path.
            mirror_page: The Mirror-detected page URL or path.

        Returns:
            True if the pages could plausibly refer to the same location.
        """
        # Normalize to paths only
        gt_path = self._normalize_to_path(gt_page)
        mi_path = self._normalize_to_path(mirror_page)

        # Exact match
        if gt_path == mi_path:
            return True

        # Homepage wildcard: ground truth "/" applies to any page
        if gt_path == "/":
            return True

        # Shared prefix: pages under the same section
        # e.g. "/products/shoes" and "/products/hats" share "/products"
        gt_segments = [s for s in gt_path.split("/") if s]
        mi_segments = [s for s in mi_path.split("/") if s]

        if gt_segments and mi_segments and gt_segments[0] == mi_segments[0]:
            return True

        return False

    @staticmethod
    def _normalize_to_path(url: str) -> str:
        """Extract and normalize the path from a URL or path string.

        Args:
            url: A full URL or path.

        Returns:
            The normalized path with trailing slash removed (except for root).
        """
        if not url:
            return "/"

        parsed = urlparse(url)
        path = parsed.path if parsed.path else "/"

        # Strip trailing slash except for root
        if path != "/" and path.endswith("/"):
            path = path.rstrip("/")

        return path

    async def _score_pair(
        self, gt: dict, mi: dict, site_url: str
    ) -> JudgeScore:
        """Score a single issue pair with position bias mitigation.

        Randomly swaps the order of issues A and B 50% of the time
        to reduce positional bias in the judge's scoring.

        Args:
            gt: Ground truth issue dict.
            mi: Mirror issue dict.
            site_url: The site URL for context.

        Returns:
            A JudgeScore with the judge's assessment.
        """
        # Position bias mitigation: randomly swap order
        if random.random() < 0.5:
            issue_a, source_a = gt, "ground truth"
            issue_b, source_b = mi, "mirror"
        else:
            issue_a, source_a = mi, "mirror"
            issue_b, source_b = gt, "ground truth"

        user_prompt = JUDGE_USER_PROMPT.format(
            site_url=site_url,
            source_a=source_a,
            page_url_a=issue_a.get("page_url", "/"),
            element_a=issue_a.get("element", "unknown"),
            description_a=issue_a.get("description", ""),
            severity_a=issue_a.get("severity", "minor"),
            heuristic_a=issue_a.get("heuristic", "N/A"),
            source_b=source_b,
            page_url_b=issue_b.get("page_url", "/"),
            element_b=issue_b.get("element", "unknown"),
            description_b=issue_b.get("description", ""),
            severity_b=issue_b.get("severity", "minor"),
            heuristic_b=issue_b.get("heuristic", "N/A"),
        )

        response = await self.judge.judge_pair(JUDGE_SYSTEM_PROMPT, user_prompt)
        return self._parse_judge_response(response)

    def _greedy_assign(
        self,
        score_matrix: dict[str, dict[str, JudgeScore]],
        gt_ids: list[str],
        mi_ids: list[str],
    ) -> list[IssueMatch]:
        """Perform greedy best-match assignment from the score matrix.

        Iterates through all scored pairs in descending score order,
        assigning each ground truth issue to at most one Mirror issue
        and vice versa. Only pairs at or above the match threshold
        are considered.

        Args:
            score_matrix: Nested dict of gt_id -> mi_id -> JudgeScore.
            gt_ids: All ground truth issue IDs.
            mi_ids: All Mirror issue IDs.

        Returns:
            List of IssueMatch objects for confirmed matches.
        """
        # Collect all scored pairs above threshold
        scored_pairs: list[tuple[int, str, str, str]] = []
        for gt_id, mi_scores in score_matrix.items():
            for mi_id, judge_score in mi_scores.items():
                if judge_score.score >= self.match_threshold:
                    scored_pairs.append(
                        (judge_score.score, gt_id, mi_id, judge_score.reasoning)
                    )

        # Sort by score descending for greedy assignment
        scored_pairs.sort(key=lambda x: x[0], reverse=True)

        assigned_gt: set[str] = set()
        assigned_mi: set[str] = set()
        matches: list[IssueMatch] = []

        for score, gt_id, mi_id, reasoning in scored_pairs:
            if gt_id in assigned_gt or mi_id in assigned_mi:
                continue
            matches.append(IssueMatch(
                gt_id=gt_id,
                mirror_id=mi_id,
                score=score,
                reasoning=reasoning,
            ))
            assigned_gt.add(gt_id)
            assigned_mi.add(mi_id)

        return matches

    @staticmethod
    def _parse_judge_response(response: str) -> JudgeScore:
        """Parse a JSON response string from the judge LLM.

        Handles malformed JSON gracefully by returning a default
        score of 0 with an error message.

        Args:
            response: Raw JSON string from the judge.

        Returns:
            A JudgeScore parsed from the response, or a default on failure.
        """
        try:
            data = json.loads(response)
            return JudgeScore(
                score=int(data.get("score", 0)),
                reasoning=str(data.get("reasoning", "")),
                matched_aspect=data.get("matched_aspect"),
                difference=data.get("difference"),
            )
        except (json.JSONDecodeError, TypeError, ValueError):
            return JudgeScore(
                score=0,
                reasoning=f"Failed to parse judge response: {response[:200]}",
                matched_aspect=None,
                difference=None,
            )
