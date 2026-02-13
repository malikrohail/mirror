"""Markdown report generator for benchmark results.

Produces human-readable reports with summary metrics, per-site breakdowns,
severity and category analysis, and error analysis sections. Output is
clean markdown suitable for GitHub rendering or PDF conversion.
"""

from __future__ import annotations

from datetime import datetime, timezone

from benchmark.scorer.analyzer import ErrorAnalysis
from benchmark.scorer.metrics import BenchmarkMetrics


class BenchmarkReporter:
    """Generates markdown benchmark reports from computed metrics.

    Assembles a complete report from individual sections including header,
    summary card, per-site table, severity/category breakdowns, and
    optional error analysis.
    """

    def generate(
        self,
        metrics: BenchmarkMetrics,
        error_analysis: ErrorAnalysis | None = None,
        title: str = "Mirror Benchmark Report",
    ) -> str:
        """Generate a full markdown benchmark report.

        Args:
            metrics: Computed benchmark metrics to report on.
            error_analysis: Optional error analysis for failure mode breakdown.
            title: Title for the report header.

        Returns:
            A complete markdown document as a string.
        """
        sections = [
            self._header(title),
            self._summary_card(metrics),
            self._per_site_table(metrics),
            self._severity_breakdown(metrics),
            self._category_breakdown(metrics),
        ]
        if error_analysis:
            sections.append(self._error_analysis_section(error_analysis))
        sections.append(self._footer())
        return "\n\n".join(sections)

    def _header(self, title: str) -> str:
        """Generate the report header with title and timestamp.

        Args:
            title: Report title text.

        Returns:
            Markdown header string.
        """
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        return f"# {title}\n\n**Generated:** {timestamp}"

    def _summary_card(self, metrics: BenchmarkMetrics) -> str:
        """Generate the summary metrics card.

        Shows key aggregate numbers: precision, recall, F1, weighted recall,
        and issue counts in a compact format.

        Args:
            metrics: The benchmark metrics to summarize.

        Returns:
            Markdown summary section string.
        """
        lines = [
            "## Summary",
            "",
            "| Metric | Value |",
            "|--------|-------|",
            f"| **Precision** | {metrics.precision:.1%} |",
            f"| **Recall** | {metrics.recall:.1%} |",
            f"| **F1 Score** | {metrics.f1:.1%} |",
            f"| **Weighted Recall** | {metrics.weighted_recall:.1%} |",
            f"| **Severity Accuracy** | {metrics.severity_accuracy:.1%} |",
            "",
            "| Count | Value |",
            "|-------|-------|",
            f"| Sites evaluated | {metrics.total_sites} |",
            f"| Ground truth issues | {metrics.total_gt_issues} |",
            f"| Mirror issues | {metrics.total_mirror_issues} |",
            f"| True positives | {metrics.total_tp} |",
            f"| False positives | {metrics.total_fp} |",
            f"| False negatives | {metrics.total_fn} |",
        ]

        if metrics.novel_finding_rate > 0:
            lines.append(
                f"| Novel finding rate | {metrics.novel_finding_rate:.1%} |"
            )

        if metrics.total_api_cost > 0:
            lines.append(f"| Total API cost | ${metrics.total_api_cost:.2f} |")
            lines.append(
                f"| Cost per true positive | ${metrics.cost_per_true_positive:.2f} |"
            )

        return "\n".join(lines)

    def _per_site_table(self, metrics: BenchmarkMetrics) -> str:
        """Generate the per-site metrics table.

        Args:
            metrics: The benchmark metrics containing per-site data.

        Returns:
            Markdown table string with per-site precision, recall, and F1.
        """
        if not metrics.per_site:
            return "## Per-Site Results\n\nNo site data available."

        lines = [
            "## Per-Site Results",
            "",
            "| Site | Precision | Recall | F1 | TP | FP | FN | GT | Mirror | Novel |",
            "|------|-----------|--------|----|----|----|----|----|--------|-------|",
        ]

        for site in metrics.per_site:
            lines.append(
                f"| {site.site_slug} "
                f"| {site.precision:.1%} "
                f"| {site.recall:.1%} "
                f"| {site.f1:.1%} "
                f"| {site.true_positives} "
                f"| {site.false_positives} "
                f"| {site.false_negatives} "
                f"| {site.total_gt_issues} "
                f"| {site.total_mirror_issues} "
                f"| {site.novel_findings} |"
            )

        return "\n".join(lines)

    def _severity_breakdown(self, metrics: BenchmarkMetrics) -> str:
        """Generate the severity recall breakdown.

        Args:
            metrics: The benchmark metrics with severity data.

        Returns:
            Markdown section string with severity recall table.
        """
        if not metrics.recall_by_severity:
            return "## Recall by Severity\n\nNo severity data available."

        lines = [
            "## Recall by Severity",
            "",
            "| Severity | Recall |",
            "|----------|--------|",
        ]

        # Sort by severity importance (critical first)
        severity_order = ["critical", "major", "minor", "enhancement"]
        for severity in severity_order:
            if severity in metrics.recall_by_severity:
                recall = metrics.recall_by_severity[severity]
                lines.append(f"| {severity} | {recall:.1%} |")

        # Include any severities not in the standard order
        for severity, recall in sorted(metrics.recall_by_severity.items()):
            if severity not in severity_order:
                lines.append(f"| {severity} | {recall:.1%} |")

        return "\n".join(lines)

    def _category_breakdown(self, metrics: BenchmarkMetrics) -> str:
        """Generate the category recall breakdown.

        Args:
            metrics: The benchmark metrics with category data.

        Returns:
            Markdown section string with category recall table.
        """
        if not metrics.recall_by_category:
            return "## Recall by Category\n\nNo category data available."

        lines = [
            "## Recall by Category",
            "",
            "| Category | Recall |",
            "|----------|--------|",
        ]

        for category, recall in sorted(
            metrics.recall_by_category.items(),
            key=lambda x: x[1],
            reverse=True,
        ):
            lines.append(f"| {category} | {recall:.1%} |")

        return "\n".join(lines)

    def _error_analysis_section(self, analysis: ErrorAnalysis) -> str:
        """Generate the error analysis section.

        Includes false negative and false positive breakdowns by failure
        mode, plus the top improvement suggestions.

        Args:
            analysis: The error analysis results.

        Returns:
            Markdown section string with error analysis tables and suggestions.
        """
        lines = [
            "## Error Analysis",
            "",
            f"**Total false negatives:** {analysis.total_false_negatives}  ",
            f"**Total false positives:** {analysis.total_false_positives}",
        ]

        # False negative breakdown by mode
        if analysis.fn_by_mode:
            lines.extend([
                "",
                "### False Negative Breakdown",
                "",
                "| Failure Mode | Count |",
                "|-------------|-------|",
            ])
            for mode, count in sorted(
                analysis.fn_by_mode.items(),
                key=lambda x: x[1],
                reverse=True,
            ):
                lines.append(f"| {mode} | {count} |")

        # False positive breakdown by mode
        if analysis.fp_by_mode:
            lines.extend([
                "",
                "### False Positive Breakdown",
                "",
                "| Failure Mode | Count |",
                "|-------------|-------|",
            ])
            for mode, count in sorted(
                analysis.fp_by_mode.items(),
                key=lambda x: x[1],
                reverse=True,
            ):
                lines.append(f"| {mode} | {count} |")

        # FN by severity
        if analysis.fn_by_severity:
            lines.extend([
                "",
                "### Missed Issues by Severity",
                "",
                "| Severity | Missed |",
                "|----------|--------|",
            ])
            for severity, count in sorted(
                analysis.fn_by_severity.items(),
                key=lambda x: x[1],
                reverse=True,
            ):
                lines.append(f"| {severity} | {count} |")

        # FN by category
        if analysis.fn_by_category:
            lines.extend([
                "",
                "### Missed Issues by Category",
                "",
                "| Category | Missed |",
                "|----------|--------|",
            ])
            for category, count in sorted(
                analysis.fn_by_category.items(),
                key=lambda x: x[1],
                reverse=True,
            ):
                lines.append(f"| {category} | {count} |")

        # Top improvements
        if analysis.top_improvement_areas:
            lines.extend([
                "",
                "### Top Improvement Areas",
                "",
            ])
            for i, suggestion in enumerate(analysis.top_improvement_areas, 1):
                lines.append(f"{i}. {suggestion}")

        return "\n".join(lines)

    def _footer(self) -> str:
        """Generate the report footer.

        Returns:
            Markdown footer string with attribution.
        """
        return (
            "---\n\n"
            "*Generated by Mirror Benchmark Pipeline. "
            "Metrics computed against curated ground truth data sets.*"
        )
