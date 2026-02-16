"""Browser favorites API — persist bookmarked test URLs server-side."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.favorite import BrowserFavorite

router = APIRouter()

DEFAULT_USER_ID = "default-user"


def _get_user_id(x_user_id: str | None = Header(None)) -> str:
    """Extract user ID from header, falling back to default."""
    return x_user_id or DEFAULT_USER_ID


# --- Schemas ---


class FavoriteCreate(BaseModel):
    """Request body for creating a favorite."""

    url: str = Field(..., min_length=1, max_length=2048)
    label: str | None = Field(None, max_length=255)
    notes: str | None = None


class FavoriteUpdate(BaseModel):
    """Request body for updating a favorite."""

    url: str | None = Field(None, min_length=1, max_length=2048)
    label: str | None = Field(None, max_length=255)
    notes: str | None = None


class FavoriteOut(BaseModel):
    """Response model for a single favorite."""

    id: uuid.UUID
    url: str
    label: str | None = None
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FavoriteListResponse(BaseModel):
    """Response for listing favorites."""

    items: list[FavoriteOut]
    total: int


# --- Endpoints ---


@router.get("", response_model=FavoriteListResponse)
async def list_favorites(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
) -> FavoriteListResponse:
    """List all bookmarked URLs for the current user."""
    result = await db.execute(
        select(BrowserFavorite)
        .where(BrowserFavorite.user_id == user_id)
        .order_by(BrowserFavorite.created_at.desc())
    )
    favorites = list(result.scalars().all())

    return FavoriteListResponse(
        items=[FavoriteOut.model_validate(f) for f in favorites],
        total=len(favorites),
    )


@router.post("", response_model=FavoriteOut, status_code=201)
async def create_favorite(
    data: FavoriteCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
) -> FavoriteOut:
    """Bookmark a URL for future testing."""
    favorite = BrowserFavorite(
        user_id=user_id,
        url=data.url,
        label=data.label,
        notes=data.notes,
    )
    db.add(favorite)
    await db.flush()
    return FavoriteOut.model_validate(favorite)


@router.get("/{favorite_id}", response_model=FavoriteOut)
async def get_favorite(
    favorite_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
) -> FavoriteOut:
    """Get a single favorite by ID."""
    result = await db.execute(
        select(BrowserFavorite).where(
            BrowserFavorite.id == favorite_id,
            BrowserFavorite.user_id == user_id,
        )
    )
    favorite = result.scalar_one_or_none()
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return FavoriteOut.model_validate(favorite)


@router.put("/{favorite_id}", response_model=FavoriteOut)
async def update_favorite(
    favorite_id: uuid.UUID,
    data: FavoriteUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
) -> FavoriteOut:
    """Update a bookmarked URL."""
    result = await db.execute(
        select(BrowserFavorite).where(
            BrowserFavorite.id == favorite_id,
            BrowserFavorite.user_id == user_id,
        )
    )
    favorite = result.scalar_one_or_none()
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(favorite, key, value)

    await db.flush()
    return FavoriteOut.model_validate(favorite)


@router.delete("/{favorite_id}", status_code=204)
async def delete_favorite(
    favorite_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
) -> None:
    """Remove a bookmarked URL."""
    result = await db.execute(
        delete(BrowserFavorite).where(
            BrowserFavorite.id == favorite_id,
            BrowserFavorite.user_id == user_id,
        )
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
