"""AI-powered fix suggestion endpoints."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.comparison import FixGenerateRequest, FixGenerateResponse, FixSuggestionOut
from app.services.fix_service import FixService

router = APIRouter()


@router.post("/studies/{study_id}/fixes/generate", response_model=FixGenerateResponse)
async def generate_fixes(study_id: uuid.UUID, body: FixGenerateRequest | None = None, db: AsyncSession = Depends(get_db)):
    """Generate AI-powered code fix suggestions for issues in a study."""
    svc = FixService(db)
    req = body or FixGenerateRequest()
    updated = await svc.generate_fixes_for_study(study_id, issue_ids=req.issue_ids)
    return FixGenerateResponse(
        study_id=study_id,
        fixes_generated=len(updated),
        fixes=[
            FixSuggestionOut(
                issue_id=i.id, element=i.element, description=i.description,
                severity=i.severity.value if hasattr(i.severity, "value") else str(i.severity),
                fix_suggestion=i.fix_suggestion, fix_code=i.fix_code, fix_language=i.fix_language, page_url=i.page_url,
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
            issue_id=i.id, element=i.element, description=i.description,
            severity=i.severity.value if hasattr(i.severity, "value") else str(i.severity),
            fix_suggestion=i.fix_suggestion, fix_code=i.fix_code, fix_language=i.fix_language, page_url=i.page_url,
        )
        for i in issues
    ]
