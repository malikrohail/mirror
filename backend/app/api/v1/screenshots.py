from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.dependencies import get_storage
from app.storage.file_storage import FileStorage

router = APIRouter()


@router.get("/{path:path}")
async def serve_screenshot(
    path: str,
    storage: FileStorage = Depends(get_storage),
):
    """Serve a screenshot image by its storage path."""
    full_path = storage.get_screenshot_full_path(path)
    if full_path is None or not full_path.exists():
        raise HTTPException(status_code=404, detail="Screenshot not found")

    return FileResponse(
        path=str(full_path),
        media_type="image/png",
    )
