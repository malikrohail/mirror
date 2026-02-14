"""Accessibility audit endpoints — deep WCAG compliance analysis for studies."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, get_storage
from app.llm.client import LLMClient
from app.llm.schemas import AccessibilityAudit
from app.core.accessibility_auditor import AccessibilityAuditor
from app.models.session import Session
from app.models.step import Step
from app.models.study import Study
from app.storage.file_storage import FileStorage

router = APIRouter()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class PageAuditOut(BaseModel):
    """Per-page audit result."""

    page_url: str
    wcag_level: str
    pass_count: int
    fail_count: int
    compliance_percentage: float
    criteria_count: int
    visual_issue_count: int
    summary: str

    model_config = {"from_attributes": True}


class AccessibilityAuditResponse(BaseModel):
    """Response for the accessibility audit endpoint."""

    study_id: str
    pages_audited: int
    audits: list[PageAuditOut]


class ComplianceReportResponse(BaseModel):
    """Response for the WCAG compliance report endpoint."""

    study_id: str
    overall_compliance_percentage: float
    total_pages: int
    total_pass: int
    total_fail: int
    wcag_level: str
    pages: list[dict]
    failing_criteria: list[dict]
    visual_issues: list[dict]
    summary: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/studies/{study_id}/accessibility",
    response_model=AccessibilityAuditResponse,
)
async def run_accessibility_audit(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
):
    """Run a deep accessibility audit on all unique pages in a study.

    Analyzes screenshots from completed sessions using Opus vision
    to detect WCAG violations that automated tools miss, such as
    color contrast issues, missing alt text, and focus indicator problems.
    """
    # Verify study exists
    study = await db.get(Study, study_id)
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    # Load sessions with steps
    result = await db.execute(
        select(Session)
        .where(Session.study_id == study_id)
        .options(selectinload(Session.steps))
    )
    sessions = list(result.scalars().all())

    if not sessions:
        raise HTTPException(
            status_code=404,
            detail="No sessions found for this study",
        )

    # Collect unique pages with their screenshots
    seen_urls: set[str] = set()
    pages_to_audit: list[dict] = []

    for session in sessions:
        for step in sorted(session.steps, key=lambda s: s.step_number):
            page_url = step.page_url or ""
            if page_url in seen_urls or not step.screenshot_path:
                continue
            seen_urls.add(page_url)

            # Load screenshot bytes from storage
            full_path = storage.get_screenshot_full_path(step.screenshot_path)
            if not full_path:
                continue

            pages_to_audit.append({
                "screenshot_bytes": full_path.read_bytes(),
                "page_url": page_url,
                "page_title": step.page_title or "",
            })

    if not pages_to_audit:
        raise HTTPException(
            status_code=404,
            detail="No screenshots available for accessibility audit",
        )

    # Run audits
    llm = LLMClient(study_id=str(study_id))
    auditor = AccessibilityAuditor(llm)

    audits: list[AccessibilityAudit] = []
    for page in pages_to_audit:
        try:
            audit = await auditor.audit_page(
                screenshot=page["screenshot_bytes"],
                a11y_tree="",  # Accessibility tree not stored; pass empty
                page_url=page["page_url"],
                page_title=page["page_title"],
            )
            audits.append(audit)
        except Exception:
            # Individual page failures don't fail the whole audit
            continue

    return AccessibilityAuditResponse(
        study_id=str(study_id),
        pages_audited=len(audits),
        audits=[
            PageAuditOut(
                page_url=a.page_url,
                wcag_level=a.wcag_level,
                pass_count=a.pass_count,
                fail_count=a.fail_count,
                compliance_percentage=a.compliance_percentage,
                criteria_count=len(a.criteria),
                visual_issue_count=len(a.visual_issues),
                summary=a.summary,
            )
            for a in audits
        ],
    )


@router.get(
    "/studies/{study_id}/accessibility/report",
    response_model=ComplianceReportResponse,
)
async def get_accessibility_report(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
):
    """Get a WCAG compliance report aggregating all page audits for a study.

    Runs accessibility audits on all unique pages and then generates
    a site-wide compliance summary with failing criteria, visual issues,
    and overall compliance percentage.
    """
    # Verify study exists
    study = await db.get(Study, study_id)
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    # Load sessions with steps
    result = await db.execute(
        select(Session)
        .where(Session.study_id == study_id)
        .options(selectinload(Session.steps))
    )
    sessions = list(result.scalars().all())

    if not sessions:
        raise HTTPException(
            status_code=404,
            detail="No sessions found for this study",
        )

    # Collect unique pages with their screenshots
    seen_urls: set[str] = set()
    pages_to_audit: list[dict] = []

    for session in sessions:
        for step in sorted(session.steps, key=lambda s: s.step_number):
            page_url = step.page_url or ""
            if page_url in seen_urls or not step.screenshot_path:
                continue
            seen_urls.add(page_url)

            full_path = storage.get_screenshot_full_path(step.screenshot_path)
            if not full_path:
                continue

            pages_to_audit.append({
                "screenshot_bytes": full_path.read_bytes(),
                "page_url": page_url,
                "page_title": step.page_title or "",
            })

    if not pages_to_audit:
        raise HTTPException(
            status_code=404,
            detail="No screenshots available for accessibility audit",
        )

    # Run audits and generate compliance report
    llm = LLMClient(study_id=str(study_id))
    auditor = AccessibilityAuditor(llm)

    audits: list[AccessibilityAudit] = []
    for page in pages_to_audit:
        try:
            audit = await auditor.audit_page(
                screenshot=page["screenshot_bytes"],
                a11y_tree="",
                page_url=page["page_url"],
                page_title=page["page_title"],
            )
            audits.append(audit)
        except Exception:
            continue

    report = await auditor.generate_compliance_report(audits)

    return ComplianceReportResponse(
        study_id=str(study_id),
        **report,
    )
