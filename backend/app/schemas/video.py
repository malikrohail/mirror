import uuid
from datetime import datetime

from pydantic import BaseModel


class VideoOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    video_path: str | None = None
    duration_seconds: float | None = None
    frame_count: int | None = None
    has_narration: bool = False
    status: str
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VideoGenerateRequest(BaseModel):
    include_narration: bool = True
    frame_duration_ms: int = 2000  # ms per screenshot frame


class VideoGenerateResponse(BaseModel):
    video_id: uuid.UUID
    session_id: uuid.UUID
    status: str = "pending"
    message: str = "Video generation started"
