"""Prompt optimization suggestions based on benchmark error analysis.

Maps failure modes to concrete prompt changes and configuration
adjustments. Suggestions are ranked by the frequency of the failure
mode they address, so the highest-impact changes surface first.
"""

from __future__ import annotations

from benchmark.scorer.analyzer import ErrorAnalysis

OPTIMIZATION_RULES: dict[str, dict] = {
    "coverage_gap": {
        "target": "navigation_system_prompt",
        "suggestion": (
            "Add: 'Visit all main sections including pages missed in prior "
            "runs. Explore navigation menus, footer links, and secondary pages.'"
        ),
        "also_consider": "Increase max_steps from 30 to 40",
    },
    "observation_gap": {
        "target": "screenshot_analysis_system_prompt",
        "suggestion": (
            "Add structured checklist for each page: check forms, navigation, "
            "images, text readability, accessibility, interactive elements, "
            "and error states."
        ),
        "also_consider": "Enable multiple screenshot angles per page",
    },
    "analysis_gap": {
        "target": "screenshot_analysis_system_prompt",
        "suggestion": (
            "Add: 'Pay attention to commonly missed categories: accessibility "
            "issues (alt text, keyboard nav), form validation, error messages, "
            "and responsive layout problems.'"
        ),
        "also_consider": "Run a dedicated accessibility-focused pass",
    },
    "classification_gap": {
        "target": "screenshot_analysis_system_prompt",
        "suggestion": (
            "Add: 'Describe each issue with maximum specificity: name the "
            "exact element, its location, and the precise problem. Avoid "
            "generic descriptions.'"
        ),
        "also_consider": "Improve the matching threshold or add fuzzy matching",
    },
    "task_mismatch": {
        "target": "study_configuration",
        "suggestion": (
            "Review task definitions to ensure they cover pages where known "
            "issues exist. Consider adding exploratory tasks that encourage "
            "broader site coverage."
        ),
        "also_consider": "Add a 'free exploration' task after main tasks",
    },
    "design_misinterp": {
        "target": "navigation_system_prompt",
        "suggestion": (
            "Add: 'Only flag issues that prevent or frustrate task completion. "
            "Do not flag reasonable design choices or intentional patterns.'"
        ),
        "also_consider": "Provide site context/purpose in the prompt",
    },
    "generic_complaint": {
        "target": "navigation_system_prompt",
        "suggestion": (
            "Add: 'Every issue MUST reference a specific UI element (e.g., "
            "'the Submit button on the checkout form') and describe concrete "
            "user impact (e.g., 'users cannot complete purchase').'"
        ),
        "also_consider": "Add post-processing filter for vague issues",
    },
    "duplicate_variant": {
        "target": "post_processing",
        "suggestion": (
            "Add a deduplication step that merges issues with >70% description "
            "similarity on the same page across personas."
        ),
        "also_consider": "Use the corroboration step to consolidate duplicates",
    },
    "context_wrong": {
        "target": "navigation_system_prompt",
        "suggestion": (
            "Add more site context to the prompt: include the site's purpose, "
            "target audience, and key workflows to reduce misinterpretation."
        ),
        "also_consider": "Use Firecrawl pre-crawl data to provide site context",
    },
    "severity_inflation": {
        "target": "navigation_system_prompt",
        "suggestion": (
            "Add severity calibration examples:\n"
            "  - critical: 'Blocks task completion entirely (e.g., broken submit button)'\n"
            "  - major: 'Significantly impedes task (e.g., confusing multi-step form)'\n"
            "  - minor: 'Causes minor friction (e.g., unclear label)'\n"
            "  - enhancement: 'Could be improved (e.g., better color contrast)'"
        ),
        "also_consider": "Add a severity validation pass after initial detection",
    },
}


class PromptOptimizer:
    """Generates prompt optimization suggestions from error analysis.

    Examines the most frequent failure modes in the error analysis
    and returns ranked, actionable suggestions for improving Mirror's
    prompts and configuration.
    """

    def suggest(self, error_analysis: ErrorAnalysis) -> list[dict]:
        """Generate prompt optimization suggestions based on error patterns.

        Examines both false negative and false positive failure modes,
        ranks them by frequency, and returns the top suggestions with
        full context.

        Args:
            error_analysis: Error analysis from the benchmark scorer.

        Returns:
            A list of suggestion dicts, each containing:
                - mode: The failure mode string.
                - count: How many times this mode occurred.
                - type: "false_negative" or "false_positive".
                - target: Which prompt or config to modify.
                - suggestion: The specific change to make.
                - also_consider: Additional recommendation (may be None).
        """
        # Collect all failure modes with their counts and types
        all_modes: list[tuple[str, int, str]] = []

        for mode, count in error_analysis.fn_by_mode.items():
            all_modes.append((mode, count, "false_negative"))

        for mode, count in error_analysis.fp_by_mode.items():
            all_modes.append((mode, count, "false_positive"))

        # Sort by count descending (highest impact first)
        all_modes.sort(key=lambda x: x[1], reverse=True)

        suggestions: list[dict] = []
        for mode, count, failure_type in all_modes[:3]:
            rule = OPTIMIZATION_RULES.get(mode)
            if rule:
                suggestions.append({
                    "mode": mode,
                    "count": count,
                    "type": failure_type,
                    "target": rule["target"],
                    "suggestion": rule["suggestion"],
                    "also_consider": rule.get("also_consider"),
                })

        return suggestions
