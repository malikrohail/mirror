"""GitHub export endpoint — export Mirror UX issues as GitHub issues."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.integrations.github import GitHubIntegration
from app.models.issue import Issue

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
