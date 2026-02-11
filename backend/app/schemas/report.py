import uuid

from pydantic import BaseModel


class ReportMeta(BaseModel):
    study_id: uuid.UUID
    format: str
    available_formats: list[str] = ["markdown", "pdf"]
    generated: bool = False


class ReportContent(BaseModel):
    study_id: uuid.UUID
    format: str
    content: str | None = None
    download_url: str | None = None
