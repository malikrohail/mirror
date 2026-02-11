import uuid

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.study_repo import StudyRepository
from app.storage.file_storage import FileStorage


class ReportService:
    """Business logic for report generation and retrieval."""

    def __init__(self, db: AsyncSession, storage: FileStorage):
        self.db = db
        self.storage = storage
        self.study_repo = StudyRepository(db)

    async def get_report_meta(self, study_id: uuid.UUID) -> dict:
        study = await self.study_repo.get_by_id(study_id)
        if not study:
            raise HTTPException(status_code=404, detail="Study not found")

        md_exists = self.storage.report_exists(study_id, "markdown")
        pdf_exists = self.storage.report_exists(study_id, "pdf")

        return {
            "study_id": study_id,
            "format": "markdown" if md_exists else "none",
            "available_formats": (
                (["markdown"] if md_exists else []) + (["pdf"] if pdf_exists else [])
            ),
            "generated": md_exists or pdf_exists,
        }

    async def get_markdown_report(self, study_id: uuid.UUID) -> str | None:
        content = self.storage.get_report(study_id, "markdown")
        if content is None:
            raise HTTPException(status_code=404, detail="Markdown report not yet generated")
        return content

    async def get_pdf_report_path(self, study_id: uuid.UUID) -> str | None:
        path = self.storage.get_report_path(study_id, "pdf")
        if path is None or not path.exists():
            raise HTTPException(status_code=404, detail="PDF report not yet generated")
        return str(path)
