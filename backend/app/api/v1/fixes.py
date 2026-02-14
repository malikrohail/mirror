"""AI-powered fix suggestion endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db
from app.models.issue import Issue
from app.schemas.comparison import (
    FixGenerateRequest,
    FixGenerateResponse,
    FixPreviewResponse,
    FixSuggestionOut,
)
from app.services.fix_preview_service import FixPreviewService
from app.services.fix_service import FixService

router = APIRouter()


@router.post("/studies/{study_id}/fixes/generate", response_model=FixGenerateResponse)
async def generate_fixes(
    study_id: uuid.UUID,
    body: FixGenerateRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Generate AI-powered code fix suggestions for issues in a study."""
    svc = FixService(db)
    req = body or FixGenerateRequest()
    updated = await svc.generate_fixes_for_study(study_id, issue_ids=req.issue_ids)
    return FixGenerateResponse(
        study_id=study_id,
        fixes_generated=len(updated),
        fixes=[
            FixSuggestionOut(
                issue_id=i.id,
                element=i.element,
                description=i.description,
                severity=i.severity.value if hasattr(i.severity, "value") else str(i.severity),
                fix_suggestion=i.fix_suggestion,
                fix_code=i.fix_code,
                fix_language=i.fix_language,
                page_url=i.page_url,
            )
            for i in updated
        ],
    )


@router.get("/studies/{study_id}/fixes", response_model=list[FixSuggestionOut])
async def list_fixes(study_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """List all issues with fix suggestions for a study."""
    svc = FixService(db)
    issues = await svc.get_fixes_for_study(study_id)
    return [
        FixSuggestionOut(
            issue_id=i.id,
            element=i.element,
            description=i.description,
            severity=i.severity.value if hasattr(i.severity, "value") else str(i.severity),
            fix_suggestion=i.fix_suggestion,
            fix_code=i.fix_code,
            fix_language=i.fix_language,
            page_url=i.page_url,
        )
        for i in issues
    ]


@router.post(
    "/studies/{study_id}/issues/{issue_id}/preview-fix",
    response_model=FixPreviewResponse,
)
async def preview_fix(
    study_id: uuid.UUID,
    issue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Preview a fix by injecting it into a live browser and returning before/after diffs.

    Looks up the issue's ``fix_code`` and ``fix_language``, opens a headless
    browser pointed at the issue's ``page_url``, takes before/after screenshots,
    and generates a visual diff highlighting changed pixels.

    Returns URLs for the before, after, and diff images as well as inline
    base64 payloads for immediate rendering.
    """
    # 1. Look up the issue
    result = await db.execute(
        select(Issue).where(Issue.id == issue_id, Issue.study_id == study_id)
    )
    issue = result.scalar_one_or_none()

    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found")

    if not issue.fix_code or not issue.fix_language:
        raise HTTPException(
            status_code=400,
            detail="Issue does not have a generated fix. Call /fixes/generate first.",
        )

    if not issue.page_url:
        raise HTTPException(
            status_code=400,
            detail="Issue has no associated page_url — cannot preview fix.",
        )

    # 2. Run the preview
    preview_svc = FixPreviewService(storage_path=settings.STORAGE_PATH)
    preview_result = await preview_svc.preview_fix(
        page_url=issue.page_url,
        fix_code=issue.fix_code,
        fix_language=issue.fix_language,
        study_id=str(study_id),
        issue_id=str(issue_id),
    )

    if not preview_result.success:
        return FixPreviewResponse(
            success=False,
            error=preview_result.error,
        )

    # 3. Build public URLs from the relative storage paths
    before_url = (
        f"/api/v1/screenshots/{preview_result.before_path}"
        if preview_result.before_path
        else None
    )
    after_url = (
        f"/api/v1/screenshots/{preview_result.after_path}"
        if preview_result.after_path
        else None
    )
    diff_url = (
        f"/api/v1/screenshots/{preview_result.diff_path}"
        if preview_result.diff_path
        else None
    )

    return FixPreviewResponse(
        success=True,
        before_url=before_url,
        after_url=after_url,
        diff_url=diff_url,
        before_base64=preview_result.before_base64,
        after_base64=preview_result.after_base64,
        diff_base64=preview_result.diff_base64,
    )
