"""End-to-end benchmark demo.

Run this to see the full pipeline produce precision/recall scores.
Uses realistic mock Mirror output against real ground truth data.

Usage:
    cd backend
    .venv/bin/python -m benchmark.run_demo
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

from benchmark.executor.collector import IssueCollector
from benchmark.executor.normalizer import normalize_gt_issue, normalize_mirror_issue
from benchmark.executor.runner import BenchmarkRunner
from benchmark.executor.schema import BenchmarkRunResult
from benchmark.ground_truth.loader import get_available_sites, load_all_issues, load_site_config
from benchmark.matcher.judge import IssueMatcher, MockLLMJudge
from benchmark.matcher.schema import MatchResult
from benchmark.matcher.validator import MockFPValidator
from benchmark.optimizer import PromptOptimizer
from benchmark.scorer import BenchmarkReporter, BenchmarkScorer, ErrorAnalyzer

# ---------------------------------------------------------------------------
# Simulated Mirror findings — what Mirror *would* plausibly detect
# These simulate realistic AI output: some match ground truth, some are
# novel findings, some are false positives.
# ---------------------------------------------------------------------------

MOCK_MIRROR_FINDINGS: dict[str, list[dict]] = {
    "healthcare_gov": [
        # TRUE POSITIVES — should match ground truth
        {
            "page_url": "/marketplace",
            "element": "Registration wall",
            "description": "Users are forced to create an account before they can browse available health plans, creating a significant barrier to entry",
            "severity": "critical",
            "heuristic": "H7",
            "persona_role": "low-tech-elderly",
            "confidence": 0.3,
            "emotional_state": "frustrated",
            "task_progress": 5.0,
            "session_completed": False,
            "recommendation": "Allow users to browse plans as guests before requiring registration",
        },
        {
            "page_url": "/marketplace/plan-compare",
            "element": "Call to action buttons",
            "description": "The primary action buttons are pushed below the fold by a large hero image, users must scroll to find them",
            "severity": "major",
            "heuristic": "H8",
            "persona_role": "power-user-impatient",
            "confidence": 0.4,
            "emotional_state": "confused",
            "task_progress": 10.0,
            "session_completed": True,
            "recommendation": "Move CTA buttons above the fold or reduce hero image size",
        },
        {
            "page_url": "/accounts/create",
            "element": "Password field",
            "description": "The password field has excessive requirements (8-20 chars, mixed case, numbers) with no visibility toggle to verify input",
            "severity": "major",
            "heuristic": "H5",
            "persona_role": "low-tech-elderly",
            "confidence": 0.2,
            "emotional_state": "frustrated",
            "task_progress": 15.0,
            "session_completed": False,
            "recommendation": "Add a show/hide password toggle and simplify requirements",
        },
        {
            "page_url": "/accounts/create",
            "element": "Error messages",
            "description": "Error messages are vague — says 'not a valid email' without explaining what specifically is wrong (e.g., trailing spaces)",
            "severity": "critical",
            "heuristic": "H9",
            "persona_role": "explorer-skeptical",
            "confidence": 0.3,
            "emotional_state": "frustrated",
            "task_progress": 20.0,
            "session_completed": False,
            "recommendation": "Provide specific error descriptions that tell users exactly what to fix",
        },
        {
            "page_url": "/accounts/create",
            "element": "Username field",
            "description": "Username requirements are overly complex with 6-74 character range and mixed criteria that confuse users",
            "severity": "major",
            "heuristic": "H5",
            "persona_role": "non-native-moderate",
            "confidence": 0.3,
            "emotional_state": "confused",
            "task_progress": 12.0,
            "session_completed": False,
            "recommendation": "Simplify username rules or use email as username",
        },
        # NOVEL FINDINGS — real issues not in ground truth
        {
            "page_url": "/marketplace",
            "element": "Language selector",
            "description": "The language selector dropdown is difficult to find, buried in the footer with low contrast text",
            "severity": "minor",
            "heuristic": "H7",
            "persona_role": "non-native-moderate",
            "confidence": 0.4,
            "emotional_state": "confused",
            "task_progress": 3.0,
            "session_completed": False,
            "recommendation": "Move language selector to the header with a prominent icon",
        },
        {
            "page_url": "/accounts/create",
            "element": "Form layout",
            "description": "The registration form does not indicate which fields are required vs optional, causing user uncertainty",
            "severity": "minor",
            "heuristic": "H5",
            "persona_role": "explorer-skeptical",
            "confidence": 0.5,
            "emotional_state": "hesitant",
            "task_progress": 18.0,
            "session_completed": False,
            "recommendation": "Mark required fields with asterisks and add a legend",
        },
        # FALSE POSITIVES — things that aren't really issues
        {
            "page_url": "/marketplace",
            "element": "Page layout",
            "description": "Could be better organized",
            "severity": "minor",
            "persona_role": "power-user-impatient",
            "confidence": 0.9,
            "emotional_state": "confident",
            "task_progress": 80.0,
            "session_completed": True,
        },
        {
            "page_url": "/help",
            "element": "FAQ section",
            "description": "The help section might benefit from a search function",
            "severity": "enhancement",
            "persona_role": "explorer-skeptical",
            "confidence": 0.85,
            "emotional_state": "neutral",
            "task_progress": 90.0,
            "session_completed": True,
        },
    ],
    "edx": [
        # TRUE POSITIVES
        {
            "page_url": "/search",
            "element": "Search results page",
            "description": "Search results page loads extremely slowly with a PageSpeed score around 12/100, causing user frustration",
            "severity": "critical",
            "heuristic": "H7",
            "persona_role": "power-user-impatient",
            "confidence": 0.2,
            "emotional_state": "frustrated",
            "task_progress": 30.0,
            "session_completed": True,
            "recommendation": "Optimize search page performance — lazy load results, reduce JavaScript bundle",
        },
        {
            "page_url": "/courses",
            "element": "Course catalog filter",
            "description": "Category pages with 100+ courses have no filtering or sorting options, forcing users to scroll through everything",
            "severity": "major",
            "heuristic": "H7",
            "persona_role": "power-user-impatient",
            "confidence": 0.3,
            "emotional_state": "frustrated",
            "task_progress": 25.0,
            "session_completed": True,
            "recommendation": "Add filter sidebar with options for topic, level, duration, and price",
        },
        {
            "page_url": "/courses",
            "element": "Course cards",
            "description": "Course cards do not indicate whether courses are currently available or have ended, users must click to find out",
            "severity": "major",
            "heuristic": "H1",
            "persona_role": "explorer-skeptical",
            "confidence": 0.4,
            "emotional_state": "confused",
            "task_progress": 35.0,
            "session_completed": True,
            "recommendation": "Add availability badge (Active/Ended/Upcoming) to each course card",
        },
        {
            "page_url": "/register",
            "element": "Country selection dropdown",
            "description": "Country selector is dropdown-only with no text search, users from countries far alphabetically must scroll extensively",
            "severity": "minor",
            "heuristic": "H7",
            "persona_role": "non-native-moderate",
            "confidence": 0.5,
            "emotional_state": "frustrated",
            "task_progress": 40.0,
            "session_completed": True,
            "recommendation": "Add type-ahead search to the country dropdown",
        },
        # NOVEL FINDING
        {
            "page_url": "/courses",
            "element": "Course pricing",
            "description": "Course prices are not visible on the catalog cards, requiring users to click into each course to see cost",
            "severity": "major",
            "heuristic": "H6",
            "persona_role": "explorer-skeptical",
            "confidence": 0.4,
            "emotional_state": "confused",
            "task_progress": 30.0,
            "session_completed": True,
            "recommendation": "Display price range on course cards",
        },
        # FALSE POSITIVE
        {
            "page_url": "/",
            "element": "Hero section",
            "description": "Design is clean",
            "severity": "enhancement",
            "persona_role": "accessibility-focused",
            "confidence": 0.95,
            "emotional_state": "confident",
            "task_progress": 95.0,
            "session_completed": True,
        },
    ],
    "sunuva": [
        # TRUE POSITIVES
        {
            "page_url": "/",
            "element": "Header navigation",
            "description": "Header is cluttered with Currency, Wishlist, Search, Account, and Basket elements all crammed together without visual separation",
            "severity": "major",
            "heuristic": "H8",
            "persona_role": "low-tech-elderly",
            "confidence": 0.3,
            "emotional_state": "confused",
            "task_progress": 5.0,
            "session_completed": False,
            "recommendation": "Group header elements with visual dividers and increase spacing",
        },
        {
            "page_url": "/collections",
            "element": "Page load performance",
            "description": "Product listing pages take over 5 seconds to load, users see blank screen during loading",
            "severity": "critical",
            "heuristic": "H7",
            "persona_role": "power-user-impatient",
            "confidence": 0.2,
            "emotional_state": "frustrated",
            "task_progress": 10.0,
            "session_completed": False,
            "recommendation": "Implement lazy loading for product images and optimize server response time",
        },
        {
            "page_url": "/checkout",
            "element": "Checkout flow",
            "description": "The checkout process has unnecessary friction points including forced account creation and excessive form fields",
            "severity": "critical",
            "heuristic": "H7",
            "persona_role": "explorer-skeptical",
            "confidence": 0.2,
            "emotional_state": "frustrated",
            "task_progress": 60.0,
            "session_completed": False,
            "recommendation": "Offer guest checkout and reduce form fields to essentials",
        },
        # FALSE POSITIVE
        {
            "page_url": "/",
            "element": "Colors",
            "description": "Bright colors used",
            "severity": "minor",
            "persona_role": "accessibility-focused",
            "confidence": 0.9,
            "emotional_state": "confident",
            "task_progress": 90.0,
            "session_completed": True,
        },
    ],
    "dominos": [
        # TRUE POSITIVES
        {
            "page_url": "/",
            "element": "Product images",
            "description": "Multiple images across the homepage and menu pages lack alternative text descriptions, making them invisible to screen readers",
            "severity": "critical",
            "wcag": "1.1.1",
            "persona_role": "accessibility-focused",
            "confidence": 0.2,
            "emotional_state": "frustrated",
            "task_progress": 5.0,
            "session_completed": False,
            "recommendation": "Add descriptive alt text to all product and promotional images",
        },
        {
            "page_url": "/pages/order",
            "element": "Navigation links",
            "description": "Several links in the ordering interface have empty link text, providing no context about their destination",
            "severity": "critical",
            "wcag": "2.4.4",
            "persona_role": "accessibility-focused",
            "confidence": 0.2,
            "emotional_state": "frustrated",
            "task_progress": 15.0,
            "session_completed": False,
            "recommendation": "Add descriptive text or aria-label to all links",
        },
        {
            "page_url": "/pages/order",
            "element": "Pizza customization form",
            "description": "The pizza ordering workflow cannot be completed using keyboard or screen reader — custom pizza builder relies entirely on mouse drag interactions",
            "severity": "critical",
            "wcag": "2.1.1",
            "persona_role": "accessibility-focused",
            "confidence": 0.1,
            "emotional_state": "frustrated",
            "task_progress": 20.0,
            "session_completed": False,
            "recommendation": "Provide keyboard-accessible alternatives for all interactive elements",
        },
        # NOVEL FINDING
        {
            "page_url": "/pages/order",
            "element": "Order summary",
            "description": "The order summary updates dynamically but does not announce changes to screen readers via ARIA live regions",
            "severity": "major",
            "wcag": "4.1.3",
            "persona_role": "accessibility-focused",
            "confidence": 0.3,
            "emotional_state": "confused",
            "task_progress": 25.0,
            "session_completed": False,
            "recommendation": "Add aria-live='polite' to the order summary container",
        },
    ],
}


async def run_benchmark_demo() -> None:
    """Run the complete benchmark pipeline end-to-end."""
    print("=" * 70)
    print("  MIRROR BENCHMARK PIPELINE — End-to-End Demo")
    print("=" * 70)
    print()

    runner = BenchmarkRunner()
    collector = IssueCollector()
    matcher = IssueMatcher(judge=MockLLMJudge(), match_threshold=2)
    fp_validator = MockFPValidator()
    scorer = BenchmarkScorer()
    error_analyzer = ErrorAnalyzer()
    reporter = BenchmarkReporter()
    optimizer = PromptOptimizer()

    # ── Step 1: Load ground truth ────────────────────────────────────
    print("[1/7] Loading ground truth corpus...")
    gt_by_site = load_all_issues()
    total_gt = sum(len(v) for v in gt_by_site.values())
    print(f"       Loaded {total_gt} issues across {len(gt_by_site)} sites")
    for slug, issues in sorted(gt_by_site.items()):
        print(f"       - {slug}: {len(issues)} issues")
    print()

    # ── Step 2: Create mock Mirror results ───────────────────────────
    print("[2/7] Simulating Mirror runs on benchmark sites...")
    run_results: dict[str, BenchmarkRunResult] = {}
    for site_slug in gt_by_site:
        config_data = load_site_config(site_slug)
        config = runner.build_config(site_slug, config_data.site_url, config_data.tasks)
        mock_issues = MOCK_MIRROR_FINDINGS.get(site_slug, [])
        result = runner.create_mock_result(config, mock_issues)
        run_results[site_slug] = result
        print(f"       - {site_slug}: {len(result.mirror_issues)} issues detected")
    print()

    # ── Step 3: Apply precision filters ──────────────────────────────
    print("[3/7] Applying precision interventions...")
    filtered_by_site: dict[str, list] = {}
    for site_slug, result in run_results.items():
        all_issues = collector.collect_from_result(result)
        all_issues = collector.compute_corroboration(all_issues)
        filtered = collector.apply_all_filters(all_issues)
        filtered_by_site[site_slug] = filtered
        dropped = len(all_issues) - len(filtered)
        print(f"       - {site_slug}: {len(all_issues)} raw → {len(filtered)} after filtering ({dropped} dropped)")
    print()

    # ── Step 4: Normalize issues to dicts for matcher ──────────────
    print("[4/7] Normalizing issues for comparison...")
    gt_dicts_by_site: dict[str, list[dict]] = {}
    mi_dicts_by_site: dict[str, list[dict]] = {}
    for site_slug in gt_by_site:
        # Convert GT issues to matcher-compatible dicts
        gt_dicts_by_site[site_slug] = [
            {
                "id": i.id,
                "page_url": i.page_url,
                "element": i.element,
                "description": i.description,
                "severity": i.severity,
                "heuristic": i.heuristic or "",
            }
            for i in gt_by_site[site_slug]
        ]
        # Convert Mirror issues to matcher-compatible dicts
        mi_dicts_by_site[site_slug] = [
            {
                "id": i.id,
                "page_url": i.page_url,
                "element": i.element,
                "description": i.description,
                "severity": i.severity,
                "heuristic": i.heuristic or "",
                "recommendation": i.recommendation or "",
                "persona_role": i.persona_role,
                "emotional_state": i.emotional_state or "",
                "task_progress": i.task_progress,
                "session_completed": i.session_completed,
                "corroboration_count": i.personas_also_found,
            }
            for i in filtered_by_site.get(site_slug, [])
        ]
    print("       Done.")
    print()

    # ── Step 5: Match issues (LLM-as-Judge) ──────────────────────────
    print("[5/7] Matching Mirror findings against ground truth...")
    match_results: list[MatchResult] = []
    for site_slug in gt_by_site:
        config_data = load_site_config(site_slug)
        result = await matcher.match_site(
            gt_issues=gt_dicts_by_site[site_slug],
            mirror_issues=mi_dicts_by_site[site_slug],
            site_slug=site_slug,
            site_url=config_data.site_url,
        )

        # Validate unmatched Mirror issues (FP check)
        validated = await fp_validator.validate_issues(
            result.unmatched_mirror, config_data.site_url
        )
        result.validated_unmatched = validated

        match_results.append(result)
        print(f"       - {site_slug}: {result.true_positives} TP, "
              f"{result.false_positives} FP, {result.false_negatives} FN")
    print()

    # ── Step 6: Compute scores ───────────────────────────────────────
    print("[6/7] Computing benchmark metrics...")
    metrics = scorer.score(
        match_results=match_results,
        gt_issues_by_site=gt_dicts_by_site,
        mirror_issues_by_site=mi_dicts_by_site,
    )
    print()

    # ── Print the scorecard ──────────────────────────────────────────
    print("=" * 70)
    print("  BENCHMARK RESULTS")
    print("=" * 70)
    print()
    print(f"  Precision:  {metrics.precision:.1%}  {'PASS' if metrics.precision >= 0.75 else 'BELOW TARGET'} (target: 75%)")
    print(f"  Recall:     {metrics.recall:.1%}  {'PASS' if metrics.recall >= 0.45 else 'BELOW TARGET'} (target: 45%)")
    print(f"  F1 Score:   {metrics.f1:.1%}  {'PASS' if metrics.f1 >= 0.55 else 'BELOW TARGET'} (target: 55%)")
    print()
    print(f"  True Positives:   {metrics.total_tp}")
    print(f"  False Positives:  {metrics.total_fp}")
    print(f"  False Negatives:  {metrics.total_fn}")
    print(f"  Novel Findings:   {metrics.novel_finding_rate:.1%} of Mirror issues were valid but not in ground truth")
    print()
    print("  Per-Site Breakdown:")
    print("  " + "-" * 66)
    print(f"  {'Site':<20} {'Prec':>8} {'Recall':>8} {'F1':>8} {'TP':>5} {'FP':>5} {'FN':>5}")
    print("  " + "-" * 66)
    for site in metrics.per_site:
        print(f"  {site.site_slug:<20} {site.precision:>7.1%} {site.recall:>7.1%} "
              f"{site.f1:>7.1%} {site.true_positives:>5} {site.false_positives:>5} "
              f"{site.false_negatives:>5}")
    print("  " + "-" * 66)
    print()

    if metrics.recall_by_severity:
        print("  Recall by Severity:")
        for sev, val in sorted(metrics.recall_by_severity.items()):
            print(f"    {sev:<15} {val:.1%}")
        print()

    # ── Step 7: Error analysis + optimization ────────────────────────
    print("[7/7] Running error analysis...")
    pages_visited = {s: list({i.page_url for i in filtered_by_site.get(s, [])}) for s in gt_by_site}
    analysis = error_analyzer.analyze(
        match_results=match_results,
        gt_by_site=gt_dicts_by_site,
        mirror_by_site=mi_dicts_by_site,
        pages_visited_by_site=pages_visited,
    )

    if analysis.fn_by_mode:
        print("  False Negative Breakdown (WHY Mirror missed issues):")
        for mode, count in sorted(analysis.fn_by_mode.items(), key=lambda x: -x[1]):
            print(f"    {mode:<25} {count}")
        print()

    if analysis.fp_by_mode:
        print("  False Positive Breakdown (WHY Mirror hallucinated issues):")
        for mode, count in sorted(analysis.fp_by_mode.items(), key=lambda x: -x[1]):
            print(f"    {mode:<25} {count}")
        print()

    suggestions = optimizer.suggest(analysis)
    if suggestions:
        print("  Top Prompt Optimization Suggestions:")
        for i, s in enumerate(suggestions, 1):
            print(f"    {i}. [{s['mode']}] (count: {s['count']})")
            print(f"       Target: {s['target']}")
            print(f"       Action: {s['suggestion']}")
        print()

    # ── Generate markdown report ─────────────────────────────────────
    report_md = reporter.generate(metrics, analysis, title="Mirror Benchmark Report — Demo Run")
    report_path = Path("benchmark_report_demo.md")
    report_path.write_text(report_md)
    print(f"  Full report saved to: {report_path.resolve()}")
    print()

    # ── Save scores JSON ─────────────────────────────────────────────
    scores_path = Path("benchmark_scores_demo.json")
    scores_path.write_text(json.dumps(metrics.to_dict(), indent=2))
    print(f"  Scores JSON saved to: {scores_path.resolve()}")
    print()
    print("=" * 70)
    print("  DONE. Review benchmark_report_demo.md for the full report.")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_benchmark_demo())
