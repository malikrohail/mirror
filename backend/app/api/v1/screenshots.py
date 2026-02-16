import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.dependencies import get_storage
from app.storage.file_storage import FileStorage

logger = logging.getLogger(__name__)

router = APIRouter()

_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}


@router.get("/{path:path}")
async def serve_screenshot(
    path: str,
    storage: FileStorage = Depends(get_storage),
):
    """Serve a screenshot image by its storage path."""
    if not path or not path.strip():
        raise HTTPException(status_code=400, detail="Empty screenshot path")

    try:
        full_path = storage.get_screenshot_full_path(path)
    except Exception as exc:
        logger.error("Error resolving screenshot path %s: %s", path, exc)
        raise HTTPException(status_code=404, detail="Screenshot not found")

    if full_path is None or not full_path.exists():
        logger.warning("Screenshot not found: %s (resolved to %s)", path, full_path)
        raise HTTPException(status_code=404, detail="Screenshot not found")

    if not full_path.is_file():
        raise HTTPException(status_code=404, detail="Screenshot not found")

    suffix = full_path.suffix.lower()
    media_type = _MEDIA_TYPES.get(suffix, "image/png")

    return FileResponse(
        path=str(full_path),
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )
