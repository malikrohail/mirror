"""Mirror CLI — run UX tests from the command line.

Usage:
    mirror test https://mysite.com --task "Sign up for account" --personas 5
    mirror test https://mysite.com --task "Complete checkout" --api-url http://localhost:8000
    mirror compare <study_id_1> <study_id_2>
"""

from __future__ import annotations

import sys
import time

import click
import httpx

DEFAULT_API_URL = "http://localhost:8000"


def _api_url(ctx: click.Context) -> str:
    return ctx.obj.get("api_url", DEFAULT_API_URL)


@click.group()
@click.option("--api-url", default=DEFAULT_API_URL, help="Mirror API base URL")
@click.pass_context
def cli(ctx: click.Context, api_url: str):
    """Mirror — AI-powered usability testing from the command line."""
    ctx.ensure_object(dict)
    ctx.obj["api_url"] = api_url.rstrip("/")


@cli.command()
@click.argument("url")
@click.option("--task", "-t", required=True, multiple=True, help="Task description (repeatable)")
@click.option("--personas", "-p", type=int, default=3, help="Number of personas to generate")
@click.option("--fail-below", type=int, default=0, help="Exit with code 1 if score below this threshold")
@click.option("--timeout", type=int, default=600, help="Max seconds to wait for study completion")
@click.pass_context
def test(
    ctx: click.Context,
    url: str,
    task: tuple[str, ...],
    personas: int,
    fail_below: int,
    timeout: int,
):
    """Run a usability test on a URL."""
    base = _api_url(ctx)
    client = httpx.Client(base_url=base, timeout=30.0)

    click.echo(f"  Targeting: {url}")
    click.echo(f"  Tasks: {len(task)}")
    click.echo(f"  Personas: {personas}")
    click.echo()

    # Step 1: Get persona templates
    click.echo("  Fetching persona templates...")
    try:
        templates_resp = client.get("/api/v1/personas/templates")
        templates_resp.raise_for_status()
        templates = templates_resp.json()
    except Exception as e:
        click.echo(f"  Failed to fetch templates: {e}", err=True)
        sys.exit(1)

    if not templates:
        click.echo("  No persona templates found. Seed templates first.", err=True)
        sys.exit(1)

    # Select up to `personas` templates
    selected = templates[:min(personas, len(templates))]
    template_ids = [t["id"] for t in selected]

    # Step 2: Create study
    click.echo("  Creating study...")
    study_data = {
        "url": url,
        "starting_path": "/",
        "tasks": [{"description": t, "order_index": i} for i, t in enumerate(task)],
        "persona_template_ids": template_ids,
    }

    try:
        create_resp = client.post("/api/v1/studies", json=study_data)
        create_resp.raise_for_status()
        study = create_resp.json()
        study_id = study["id"]
    except Exception as e:
        click.echo(f"  Failed to create study: {e}", err=True)
        sys.exit(1)

    click.echo(f"  Study created: {study_id}")

    # Step 3: Run study
    click.echo("  Starting study run...")
    try:
        run_resp = client.post(f"/api/v1/studies/{study_id}/run")
        run_resp.raise_for_status()
    except Exception as e:
        click.echo(f"  Failed to start study: {e}", err=True)
        sys.exit(1)

    # Step 4: Poll for completion
    start_time = time.time()
    last_percent = 0

    while time.time() - start_time < timeout:
        try:
            status_resp = client.get(f"/api/v1/studies/{study_id}/status")
            status_resp.raise_for_status()
            status = status_resp.json()
        except Exception:
            time.sleep(2)
            continue

        percent = int(status.get("percent", 0))
        phase = status.get("phase", "")
        study_status = status.get("status", "")

        if percent > last_percent:
            bar_len = 40
            filled = int(bar_len * percent / 100)
            bar = "#" * filled + "-" * (bar_len - filled)
            click.echo(f"\r  [{bar}] {percent}% — {phase}", nl=False)
            last_percent = percent

        if study_status in ("complete", "failed"):
            click.echo()
            break

        time.sleep(3)
    else:
        click.echo(f"\n  Study timed out after {timeout}s", err=True)
        sys.exit(1)

    # Step 5: Show results
    try:
        result_resp = client.get(f"/api/v1/studies/{study_id}")
        result_resp.raise_for_status()
        result = result_resp.json()
    except Exception as e:
        click.echo(f"  Failed to get results: {e}", err=True)
        sys.exit(1)

    score = result.get("overall_score")
    summary = result.get("executive_summary", "")

    click.echo()
    if score is not None:
        click.echo(f"  Score: {score:.0f}/100")
    click.echo()
    if summary:
        click.echo(f"  Summary: {summary[:200]}")
    click.echo()

    # Get issues
    try:
        issues_resp = client.get(f"/api/v1/studies/{study_id}/issues")
        issues_resp.raise_for_status()
        issues = issues_resp.json()

        if issues:
            critical = sum(1 for i in issues if i.get("severity") == "critical")
            major = sum(1 for i in issues if i.get("severity") == "major")
            minor = sum(1 for i in issues if i.get("severity") == "minor")
            enhancements = sum(1 for i in issues if i.get("severity") == "enhancement")

            click.echo(
                f"  {len(issues)} issues found "
                f"({critical} critical, {major} major, {minor} minor, {enhancements} enhancements)"
            )
            click.echo()

            # Top 3 issues
            sorted_issues = sorted(
                issues,
                key=lambda i: i.get("priority_score", 0) or 0,
                reverse=True,
            )
            click.echo("  Top Issues:")
            for i, issue in enumerate(sorted_issues[:5], 1):
                sev_icon = {"critical": "!!!", "major": "!! ", "minor": "!  ", "enhancement": "   "}.get(
                    issue.get("severity", ""), "   "
                )
                click.echo(f"    {sev_icon} #{i} {issue.get('description', '')[:80]}")
    except Exception:
        pass

    click.echo()
    click.echo(f"  Full results: {base}/api/v1/studies/{study_id}")

    # Exit code based on score threshold
    if fail_below > 0 and score is not None and score < fail_below:
        click.echo(f"\n  FAILED: Score {score:.0f} is below threshold {fail_below}", err=True)
        sys.exit(1)


@cli.command()
@click.argument("baseline_id")
@click.argument("comparison_id")
@click.pass_context
def compare(ctx: click.Context, baseline_id: str, comparison_id: str):
    """Compare two study runs (before/after analysis)."""
    base = _api_url(ctx)
    client = httpx.Client(base_url=base, timeout=30.0)

    click.echo(f"  Comparing studies:")
    click.echo(f"    Baseline:   {baseline_id}")
    click.echo(f"    Comparison: {comparison_id}")
    click.echo()

    try:
        resp = client.post(f"/api/v1/studies/{baseline_id}/compare/{comparison_id}")
        resp.raise_for_status()
        result = resp.json()
    except Exception as e:
        click.echo(f"  Comparison failed: {e}", err=True)
        sys.exit(1)

    score_delta = result.get("score_delta", 0)
    direction = "+" if score_delta >= 0 else ""
    click.echo(f"  Score: {result.get('baseline_score', '?')} -> {result.get('comparison_score', '?')} ({direction}{score_delta:.0f})")
    click.echo(f"  Issues fixed: {len(result.get('issues_fixed', []))}")
    click.echo(f"  Issues new: {len(result.get('issues_new', []))}")
    click.echo(f"  Issues persisting: {len(result.get('issues_persisting', []))}")
    click.echo()
    click.echo(f"  {result.get('summary', '')}")


if __name__ == "__main__":
    cli()
