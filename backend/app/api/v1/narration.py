"""Voice narration endpoints for session replay."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_storage
from app.services.voice_service import VoiceService
from app.storage.file_storage import FileStorage

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────


class NarrationStatusOut(BaseModel):
    """Response model for narration generation status."""

    session_id: str
    status: str
    total_steps: int = 0
    generated_steps: int = 0
    failed_steps: int = 0
    voice_id: str | None = None
    error: str | None = None


class NarrationGenerateResponse(BaseModel):
    """Response model for narration generation trigger."""

    session_id: str
    status: str
    message: str


# ── Endpoints ────────────────────────────────────────────


@router.post(
    "/sessions/{session_id}/narration/generate",
    response_model=NarrationGenerateResponse,
)
async def generate_narration(
    session_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
) -> NarrationGenerateResponse:
    """Trigger voice narration generation for a session.

    Uses ElevenLabs TTS to convert each step's think-aloud text into audio.
    Generation runs in the background; poll the status endpoint to track progress.
    """
    svc = VoiceService(db, storage)

    # Verify the API key is configured before accepting the request
    try:
        svc._get_api_key()
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Check current status — don't restart if already generating
    current = svc.get_narration_status(session_id)
    if current["status"] == "generating":
        return NarrationGenerateResponse(
            session_id=str(session_id),
            status="generating",
            message="Narration generation already in progress",
        )

    # Run generation in background
    background_tasks.add_task(_run_narration, session_id, db, storage)

    return NarrationGenerateResponse(
        session_id=str(session_id),
        status="generating",
        message="Narration generation started",
    )


async def _run_narration(
    session_id: uuid.UUID,
    db: AsyncSession,
    storage: FileStorage,
) -> None:
    """Background task wrapper for narration generation."""
    svc = VoiceService(db, storage)
    try:
        await svc.generate_session_narration(session_id)
    except Exception:
        # Errors are captured inside generate_session_narration
        pass


@router.get(
    "/sessions/{session_id}/narration/status",
    response_model=NarrationStatusOut,
)
async def get_narration_status(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
) -> NarrationStatusOut:
    """Check the current status of narration generation for a session.

    Returns progress information including how many steps have been generated.
    If narration has not been requested, status will be "not_started".
    If narration files already exist on disk, status will be "complete".
    """
    svc = VoiceService(db, storage)
    status = svc.get_narration_status(session_id)

    # If status says not_started, check if audio files already exist on disk
    if status["status"] == "not_started":
        has_audio = await svc.has_narration(session_id)
        if has_audio:
            status["status"] = "complete"

    return NarrationStatusOut(session_id=str(session_id), **status)


@router.get("/sessions/{session_id}/narration/{step_number}")
async def get_step_narration(
    session_id: uuid.UUID,
    step_number: int,
    db: AsyncSession = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
) -> Response:
    """Get the narration audio for a specific step.

    Returns an MP3 audio file suitable for playback in the browser.
    Returns 404 if no narration has been generated for this step.
    """
    svc = VoiceService(db, storage)
    audio = await svc.get_step_audio(session_id, step_number)

    if audio is None:
        raise HTTPException(
            status_code=404,
            detail=f"No narration audio found for session {session_id} step {step_number}",
        )

    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": (
                f'inline; filename="narration-step-{step_number:03d}.mp3"'
            ),
            "Cache-Control": "public, max-age=86400",
        },
    )
