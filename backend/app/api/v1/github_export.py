"""GitHub export endpoint — export Mirror UX issues as GitHub issues and PRs."""

import logging
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.integrations.github import GitHubIntegration
from app.models.issue import Issue
from app.models.study import Study

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class GitHubExportRequest(BaseModel):
    """Request body for the GitHub export endpoint."""

    repo: str = Field(
        ...,
        description="GitHub repository in 'owner/repo' format",
        pattern=r"^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$",
    )
    token: str = Field(
        ...,
        min_length=1,
        description="GitHub personal access token with repo scope",
    )
    issue_ids: list[uuid.UUID] | None = Field(
        None,
        description="Optional list of specific issue IDs to export. Exports all if omitted.",
    )


class GitHubExportResult(BaseModel):
    """Result for a single exported issue."""

    issue_id: str
    github_url: str


class GitHubExportResponse(BaseModel):
    """Response from the GitHub export endpoint."""

    study_id: str
    total_issues: int
    exported_count: int
    results: list[GitHubExportResult]


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/studies/{study_id}/export/github",
    response_model=GitHubExportResponse,
)
async def export_issues_to_github(
    study_id: uuid.UUID,
    body: GitHubExportRequest,
    db: AsyncSession = Depends(get_db),
):
    """Export UX issues from a study to GitHub as well-structured issues.

    Creates GitHub issues with severity labels, affected elements,
    heuristic violations, WCAG criteria, recommendations, and
    suggested fix code when available.
    """
    # Load issues from the database
    stmt = select(Issue).where(Issue.study_id == study_id)
    if body.issue_ids:
        stmt = stmt.where(Issue.id.in_(body.issue_ids))
    stmt = stmt.order_by(Issue.severity.asc())

    result = await db.execute(stmt)
    issues = list(result.scalars().all())

    if not issues:
        raise HTTPException(
            status_code=404,
            detail="No issues found for this study",
        )

    # Convert ORM models to dicts for the integration
    issue_dicts: list[dict] = []
    issue_id_map: list[uuid.UUID] = []

    for issue in issues:
        issue_dicts.append({
            "description": issue.description,
            "severity": (
                issue.severity.value
                if hasattr(issue.severity, "value")
                else str(issue.severity)
            ),
            "element": issue.element,
            "heuristic": issue.heuristic,
            "wcag_criterion": issue.wcag_criterion,
            "recommendation": issue.recommendation,
            "page_url": issue.page_url,
            "fix_code": issue.fix_code,
            "fix_language": issue.fix_language,
        })
        issue_id_map.append(issue.id)

    # Export to GitHub
    integration = GitHubIntegration()
    try:
        github_urls = await integration.bulk_export(
            repo=body.repo,
            token=body.token,
            issues=issue_dicts,
        )
    finally:
        await integration.close()

    # Build results mapping issue IDs to created GitHub URLs
    results: list[GitHubExportResult] = [
        GitHubExportResult(
            issue_id=str(issue_id_map[i]),
            github_url=url,
        )
        for i, url in enumerate(github_urls)
    ]

    return GitHubExportResponse(
        study_id=str(study_id),
        total_issues=len(issues),
        exported_count=len(github_urls),
        results=results,
    )


# ---------------------------------------------------------------------------
# GitHub PR creation schemas
# ---------------------------------------------------------------------------

class GitHubPRRequest(BaseModel):
    """Request body for creating a GitHub PR with overlay fix files."""

    repo: str = Field(
        ...,
        description="GitHub repository in 'owner/repo' format",
        pattern=r"^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$",
    )
    token: str = Field(
        ...,
        min_length=1,
        description="GitHub personal access token with repo scope",
    )
    issue_ids: list[uuid.UUID] | None = Field(
        None,
        description="Specific issue IDs to include. Defaults to all issues with fixes.",
    )


class GitHubPRResponse(BaseModel):
    """Response from the GitHub PR creation endpoint."""

    pr_url: str
    pr_number: int
    branch_name: str
    files_created: list[str]
    fixes_included: int


# ---------------------------------------------------------------------------
# GitHub PR endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/studies/{study_id}/export/github-pr",
    response_model=GitHubPRResponse,
    status_code=201,
)
async def create_github_pr(
    study_id: uuid.UUID,
    body: GitHubPRRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a GitHub PR with overlay fix files (CSS/JS) for UX issues.

    Generates mirror-fixes.css, mirror-patches.js (if JS fixes exist),
    and MIRROR-FIXES.md documentation. Opens a PR with a rich description
    linking back to the Mirror report.
    """
    # Load study for URL and score
    study_result = await db.execute(
        select(Study).where(Study.id == study_id)
    )
    study = study_result.scalar_one_or_none()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    # Load issues with fix code
    stmt = select(Issue).where(
        Issue.study_id == study_id,
        Issue.fix_code.isnot(None),
    )
    if body.issue_ids:
        stmt = stmt.where(Issue.id.in_(body.issue_ids))
    stmt = stmt.order_by(Issue.severity.asc())

    result = await db.execute(stmt)
    issues = list(result.scalars().all())

    if not issues:
        raise HTTPException(
            status_code=404,
            detail="No issues with generated fixes found. Generate fixes first.",
        )

    # Convert ORM to dicts
    issue_dicts: list[dict] = []
    for issue in issues:
        issue_dicts.append({
            "description": issue.description,
            "severity": (
                issue.severity.value
                if hasattr(issue.severity, "value")
                else str(issue.severity)
            ),
            "element": issue.element,
            "heuristic": issue.heuristic,
            "wcag_criterion": issue.wcag_criterion,
            "recommendation": issue.recommendation,
            "page_url": issue.page_url,
            "fix_code": issue.fix_code,
            "fix_language": issue.fix_language,
            "fix_suggestion": issue.fix_suggestion,
        })

    # Create the PR
    integration = GitHubIntegration()
    try:
        pr_result = await integration.create_pr_with_fixes(
            repo=body.repo,
            token=body.token,
            study_id=str(study_id),
            study_url=study.url,
            score=study.overall_score,
            issues=issue_dicts,
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        text = e.response.text[:300]
        logger.warning("GitHub API error %d: %s", status, text)
        if status == 404:
            raise HTTPException(
                status_code=404,
                detail="Repository not found. Check the owner/repo format.",
            )
        if status == 401:
            raise HTTPException(
                status_code=401,
                detail="Invalid GitHub token. Create a token with 'repo' scope.",
            )
        if status == 403:
            raise HTTPException(
                status_code=403,
                detail="Token doesn't have write access to this repository.",
            )
        if status == 422:
            raise HTTPException(
                status_code=422,
                detail=f"GitHub rejected the request: {text}",
            )
        if status == 429:
            raise HTTPException(
                status_code=429,
                detail="GitHub rate limit exceeded. Try again in a few minutes.",
            )
        raise HTTPException(
            status_code=502,
            detail=f"GitHub API error ({status}): {text}",
        )
    finally:
        await integration.close()

    return GitHubPRResponse(**pr_result)
