"""Mirror Benchmark Pipeline CLI.

Provides subcommands for scoring benchmark runs, generating reports,
analyzing errors, getting prompt optimization suggestions, and comparing
two benchmark runs.

Usage:
    python -m benchmark score --gt-dir <path> --run <path> --output <path>
    python -m benchmark report --scores <path> --output <path>
    python -m benchmark analyze --scores <path> --gt-dir <path> --output <path>
    python -m benchmark optimize --errors <path>
    python -m benchmark compare --run-a <path> --run-b <path>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _load_json(path: str) -> dict:
    """Load and parse a JSON file.

    Args:
        path: Path to the JSON file.

    Returns:
        Parsed JSON data as a dictionary.
    """
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_json(data: dict, path: str) -> None:
    """Save data to a JSON file, creating parent directories as needed.

    Args:
        data: Dictionary to serialize.
        path: Output file path.
    """
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Saved: {out}")


def _save_text(text: str, path: str) -> None:
    """Save text to a file, creating parent directories as needed.

    Args:
        text: Text content to write.
        path: Output file path.
    """
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Saved: {out}")


def handle_score(args: argparse.Namespace) -> None:
    """Handle the 'score' subcommand.

    Loads ground truth issues and a benchmark run result, runs the matcher
    logic to produce MatchResult objects, then scores them to compute
    precision, recall, and F1 metrics.

    Args:
        args: Parsed CLI arguments with gt_dir, run, and output paths.
    """
    from benchmark.executor.schema import BenchmarkRunResult
    from benchmark.ground_truth.schema import GroundTruthIssue
    from benchmark.matcher.schema import IssueMatch, MatchResult, ValidationResult
    from benchmark.scorer.metrics import BenchmarkScorer

    # Load ground truth from directory (one JSON per site)
    gt_dir = Path(args.gt_dir)
    gt_issues_by_site: dict[str, list] = {}
    for gt_file in sorted(gt_dir.glob("*.json")):
        data = _load_json(str(gt_file))
        site_slug = data.get("site_slug", gt_file.stem)
        issues = data.get("issues", [])
        gt_issues_by_site[site_slug] = issues

    # Load run result(s)
    run_path = Path(args.run)
    run_data = _load_json(str(run_path))

    # The run file can be a single result or contain multiple site results
    results: list[dict] = []
    if "site_slug" in run_data:
        results = [run_data]
    elif "results" in run_data:
        results = run_data["results"]
    else:
        results = [run_data]

    # Build mirror issues by site and match results
    mirror_issues_by_site: dict[str, list] = {}
    match_results: list[MatchResult] = []

    for result_data in results:
        slug = result_data.get("site_slug", "unknown")
        mirror_issues = result_data.get("mirror_issues", [])
        mirror_issues_by_site[slug] = mirror_issues

        # Build MatchResult from pre-computed match data if available
        if "matches" in result_data:
            matches = [
                IssueMatch(**m) for m in result_data.get("matches", [])
            ]
            validated = [
                ValidationResult(**v)
                for v in result_data.get("validated_unmatched", [])
            ]
            mr = MatchResult(
                site_slug=slug,
                matches=matches,
                unmatched_gt=result_data.get("unmatched_gt", []),
                unmatched_mirror=result_data.get("unmatched_mirror", []),
                validated_unmatched=validated,
                judge_scores=result_data.get("judge_scores", []),
            )
            match_results.append(mr)

    if not match_results:
        print("Error: No match results found in run file. "
              "Expected 'matches' key in the run data.", file=sys.stderr)
        sys.exit(1)

    # Score
    scorer = BenchmarkScorer()
    metrics = scorer.score(match_results, gt_issues_by_site, mirror_issues_by_site)

    _save_json(metrics.to_dict(), args.output)
    print(f"\nPrecision: {metrics.precision:.1%}")
    print(f"Recall:    {metrics.recall:.1%}")
    print(f"F1:        {metrics.f1:.1%}")


def handle_report(args: argparse.Namespace) -> None:
    """Handle the 'report' subcommand.

    Loads pre-computed scores from JSON and generates a markdown report.

    Args:
        args: Parsed CLI arguments with scores and output paths.
    """
    from benchmark.scorer.analyzer import ErrorAnalysis
    from benchmark.scorer.metrics import BenchmarkMetrics, SiteMetrics
    from benchmark.scorer.reporter import BenchmarkReporter

    data = _load_json(args.scores)

    # Reconstruct BenchmarkMetrics from dict
    per_site_data = data.pop("per_site", [])
    metrics = BenchmarkMetrics(**{
        k: v for k, v in data.items()
        if k in BenchmarkMetrics.__dataclass_fields__
    })
    metrics.per_site = [SiteMetrics(**s) for s in per_site_data]

    # Optionally load error analysis if present
    error_analysis = None
    error_path = Path(args.scores).parent / "error_analysis.json"
    if error_path.exists():
        ea_data = _load_json(str(error_path))
        error_analysis = ErrorAnalysis(**{
            k: v for k, v in ea_data.items()
            if k in ErrorAnalysis.__dataclass_fields__
        })

    reporter = BenchmarkReporter()
    report = reporter.generate(metrics, error_analysis=error_analysis)

    _save_text(report, args.output)


def handle_analyze(args: argparse.Namespace) -> None:
    """Handle the 'analyze' subcommand.

    Performs error analysis on scored results to categorize failure modes.

    Args:
        args: Parsed CLI arguments with scores, gt_dir, and output paths.
    """
    from benchmark.matcher.schema import IssueMatch, MatchResult, ValidationResult
    from benchmark.scorer.analyzer import ErrorAnalyzer

    scores_data = _load_json(args.scores)

    # Load ground truth
    gt_dir = Path(args.gt_dir)
    gt_by_site: dict[str, list] = {}
    for gt_file in sorted(gt_dir.glob("*.json")):
        data = _load_json(str(gt_file))
        site_slug = data.get("site_slug", gt_file.stem)
        gt_by_site[site_slug] = data.get("issues", [])

    # Reconstruct match results from scores data
    match_results: list[MatchResult] = []
    mirror_by_site: dict[str, list] = {}
    pages_visited_by_site: dict[str, list[str]] = {}

    results_list = scores_data.get("results", [scores_data])
    for result_data in results_list:
        slug = result_data.get("site_slug", "unknown")
        mirror_by_site[slug] = result_data.get("mirror_issues", [])
        pages_visited_by_site[slug] = result_data.get("pages_visited", [])

        if "matches" in result_data:
            matches = [
                IssueMatch(**m) for m in result_data.get("matches", [])
            ]
            validated = [
                ValidationResult(**v)
                for v in result_data.get("validated_unmatched", [])
            ]
            mr = MatchResult(
                site_slug=slug,
                matches=matches,
                unmatched_gt=result_data.get("unmatched_gt", []),
                unmatched_mirror=result_data.get("unmatched_mirror", []),
                validated_unmatched=validated,
                judge_scores=result_data.get("judge_scores", []),
            )
            match_results.append(mr)

    if not match_results:
        print("Error: No match results found in scores file.", file=sys.stderr)
        sys.exit(1)

    analyzer = ErrorAnalyzer()
    analysis = analyzer.analyze(
        match_results, gt_by_site, mirror_by_site, pages_visited_by_site
    )

    _save_json(analysis.to_dict(), args.output)
    print(f"\nFalse negatives: {analysis.total_false_negatives}")
    print(f"False positives: {analysis.total_false_positives}")
    if analysis.top_improvement_areas:
        print("\nTop improvement areas:")
        for i, area in enumerate(analysis.top_improvement_areas[:3], 1):
            print(f"  {i}. {area}")


def handle_optimize(args: argparse.Namespace) -> None:
    """Handle the 'optimize' subcommand.

    Loads error analysis results and generates prompt optimization suggestions.

    Args:
        args: Parsed CLI arguments with errors path.
    """
    from benchmark.optimizer.suggestions import PromptOptimizer
    from benchmark.scorer.analyzer import ErrorAnalysis

    data = _load_json(args.errors)
    analysis = ErrorAnalysis(**{
        k: v for k, v in data.items()
        if k in ErrorAnalysis.__dataclass_fields__
    })

    optimizer = PromptOptimizer()
    suggestions = optimizer.suggest(analysis)

    if not suggestions:
        print("No optimization suggestions generated (no failure modes found).")
        return

    print(f"\nPrompt Optimization Suggestions ({len(suggestions)} total):\n")
    for i, s in enumerate(suggestions, 1):
        print(f"--- Suggestion {i} ---")
        print(f"  Failure mode: {s['mode']} ({s['count']}x {s['type']})")
        print(f"  Target: {s['target']}")
        print(f"  Change: {s['suggestion']}")
        if s.get("also_consider"):
            print(f"  Also consider: {s['also_consider']}")
        print()


def handle_compare(args: argparse.Namespace) -> None:
    """Handle the 'compare' subcommand.

    Compares metrics from two benchmark runs and shows improvements/regressions.

    Args:
        args: Parsed CLI arguments with run_a and run_b paths.
    """
    data_a = _load_json(args.run_a)
    data_b = _load_json(args.run_b)

    print("\nBenchmark Comparison")
    print("=" * 60)
    print(f"{'Metric':<25} {'Run A':>10} {'Run B':>10} {'Delta':>10}")
    print("-" * 60)

    key_metrics = [
        ("precision", "Precision"),
        ("recall", "Recall"),
        ("f1", "F1 Score"),
        ("weighted_recall", "Weighted Recall"),
        ("severity_accuracy", "Severity Accuracy"),
        ("total_tp", "True Positives"),
        ("total_fp", "False Positives"),
        ("total_fn", "False Negatives"),
    ]

    for key, label in key_metrics:
        val_a = data_a.get(key, 0)
        val_b = data_b.get(key, 0)
        delta = val_b - val_a

        # Format based on type
        if isinstance(val_a, float):
            delta_str = f"{delta:+.1%}" if abs(delta) > 0.0005 else "="
            print(f"{label:<25} {val_a:>9.1%} {val_b:>9.1%} {delta_str:>10}")
        else:
            delta_str = f"{delta:+d}" if delta != 0 else "="
            print(f"{label:<25} {val_a:>10} {val_b:>10} {delta_str:>10}")

    print("-" * 60)

    # Compare per-site if available
    sites_a = {s["site_slug"]: s for s in data_a.get("per_site", [])}
    sites_b = {s["site_slug"]: s for s in data_b.get("per_site", [])}
    all_sites = sorted(set(sites_a.keys()) | set(sites_b.keys()))

    if all_sites:
        print(f"\n{'Site':<20} {'F1 (A)':>10} {'F1 (B)':>10} {'Delta':>10}")
        print("-" * 55)
        for slug in all_sites:
            f1_a = sites_a.get(slug, {}).get("f1", 0.0)
            f1_b = sites_b.get(slug, {}).get("f1", 0.0)
            delta = f1_b - f1_a
            delta_str = f"{delta:+.1%}" if abs(delta) > 0.0005 else "="
            print(f"{slug:<20} {f1_a:>9.1%} {f1_b:>9.1%} {delta_str:>10}")


def main() -> None:
    """Main entry point for the benchmark CLI."""
    parser = argparse.ArgumentParser(
        description="Mirror Benchmark Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python -m benchmark score --gt-dir gt/ --run results.json --output scores.json\n"
            "  python -m benchmark report --scores scores.json --output report.md\n"
            "  python -m benchmark analyze --scores results.json --gt-dir gt/ --output errors.json\n"
            "  python -m benchmark optimize --errors errors.json\n"
            "  python -m benchmark compare --run-a scores_v1.json --run-b scores_v2.json\n"
        ),
    )
    subparsers = parser.add_subparsers(dest="command")

    # score command
    score_parser = subparsers.add_parser(
        "score",
        help="Score a benchmark run against ground truth",
    )
    score_parser.add_argument(
        "--gt-dir",
        required=True,
        help="Directory containing ground truth JSON files (one per site)",
    )
    score_parser.add_argument(
        "--run",
        required=True,
        help="Path to benchmark run result JSON file",
    )
    score_parser.add_argument(
        "--output",
        required=True,
        help="Output path for computed scores JSON",
    )

    # report command
    report_parser = subparsers.add_parser(
        "report",
        help="Generate a markdown benchmark report",
    )
    report_parser.add_argument(
        "--scores",
        required=True,
        help="Path to computed scores JSON file",
    )
    report_parser.add_argument(
        "--output",
        default="benchmark_report.md",
        help="Output path for the markdown report (default: benchmark_report.md)",
    )

    # analyze command
    analyze_parser = subparsers.add_parser(
        "analyze",
        help="Perform error analysis on benchmark results",
    )
    analyze_parser.add_argument(
        "--scores",
        required=True,
        help="Path to benchmark run result JSON with match data",
    )
    analyze_parser.add_argument(
        "--gt-dir",
        required=True,
        help="Directory containing ground truth JSON files",
    )
    analyze_parser.add_argument(
        "--output",
        required=True,
        help="Output path for error analysis JSON",
    )

    # optimize command
    opt_parser = subparsers.add_parser(
        "optimize",
        help="Get prompt optimization suggestions from error analysis",
    )
    opt_parser.add_argument(
        "--errors",
        required=True,
        help="Path to error analysis JSON file",
    )

    # compare command
    cmp_parser = subparsers.add_parser(
        "compare",
        help="Compare metrics from two benchmark runs",
    )
    cmp_parser.add_argument(
        "--run-a",
        required=True,
        help="Path to first run's scores JSON",
    )
    cmp_parser.add_argument(
        "--run-b",
        required=True,
        help="Path to second run's scores JSON",
    )

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    handlers = {
        "score": handle_score,
        "report": handle_report,
        "analyze": handle_analyze,
        "optimize": handle_optimize,
        "compare": handle_compare,
    }

    handler = handlers.get(args.command)
    if handler:
        handler(args)
    else:
        parser.print_help()
        sys.exit(1)
