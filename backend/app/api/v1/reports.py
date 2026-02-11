import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_storage
from app.schemas.report import ReportMeta
from app.services.report_service import ReportService
from app.storage.file_storage import FileStorage

router = APIRouter()


@router.get("/studies/{study_id}/report", response_model=ReportMeta)
async def get_report_meta(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
):
    """Get report metadata (which formats are available)."""
    svc = ReportService(db, storage)
    return await svc.get_report_meta(study_id)


@router.get("/studies/{study_id}/report/md")
async def get_markdown_report(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
):
    """Download the Markdown report."""
    svc = ReportService(db, storage)
    content = await svc.get_markdown_report(study_id)
    return PlainTextResponse(
        content=content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=mirror-report-{study_id}.md"},
    )


@router.get("/studies/{study_id}/report/pdf")
async def get_pdf_report(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
):
    """Download the PDF report."""
    svc = ReportService(db, storage)
    path = await svc.get_pdf_report_path(study_id)
    return FileResponse(
        path=path,
        media_type="application/pdf",
        filename=f"mirror-report-{study_id}.pdf",
    )
