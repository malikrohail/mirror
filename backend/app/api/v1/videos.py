"""Video replay endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_storage
from app.schemas.video import VideoGenerateRequest, VideoGenerateResponse, VideoOut
from app.services.video_service import VideoService
from app.storage.file_storage import FileStorage

router = APIRouter()


@router.get("/sessions/{session_id}/video", response_model=VideoOut | None)
async def get_video(session_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get video metadata for a session."""
    svc = VideoService(db)
    return await svc.get_video(session_id)


@router.post("/sessions/{session_id}/video/generate", response_model=VideoGenerateResponse)
async def generate_video(
    session_id: uuid.UUID,
    body: VideoGenerateRequest | None = None,
    db: AsyncSession = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
):
    """Generate a video replay for a session."""
    svc = VideoService(db, storage)
    req = body or VideoGenerateRequest()
    video = await svc.generate_video(session_id, frame_duration_ms=req.frame_duration_ms, include_narration=req.include_narration)
    if video.status.value == "failed":
        raise HTTPException(status_code=500, detail=video.error_message or "Video generation failed")
    return VideoGenerateResponse(video_id=video.id, session_id=session_id, status=video.status.value)


@router.get("/sessions/{session_id}/video/download")
async def download_video(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
):
    """Download the generated video file."""
    svc = VideoService(db, storage)
    video = await svc.get_video(session_id)
    if not video or not video.video_path:
        raise HTTPException(status_code=404, detail="Video not found")
    data = await storage.read(video.video_path)
    return Response(content=data, media_type="image/gif", headers={"Content-Disposition": f'attachment; filename="session-{session_id}-replay.gif"'})


@router.get("/studies/{study_id}/videos", response_model=list[VideoOut])
async def list_study_videos(study_id: uuid.UUID, db: AsyncSession = Depends(get_db), storage: FileStorage = Depends(get_storage)):
    """List all generated videos for a study."""
    svc = VideoService(db, storage)
    return await svc.list_videos(study_id)
