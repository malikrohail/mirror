"""User preferences API — persist user settings server-side."""

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.preference import UserPreference

router = APIRouter()

DEFAULT_USER_ID = "default-user"

# Default preferences applied when a user has no saved preferences
DEFAULT_PREFERENCES = {
    "browser_mode": "cloud",
    "theme": "system",
    "default_model": "sonnet-4.5",
}


def _get_user_id(x_user_id: str | None = Header(None)) -> str:
    """Extract user ID from header, falling back to default."""
    return x_user_id or DEFAULT_USER_ID


# --- Schemas ---


class PreferencesData(BaseModel):
    """User preference values."""

    browser_mode: str | None = Field(None, description="Browser mode: local or cloud")
    theme: str | None = Field(None, description="UI theme: light, dark, or system")
    default_model: str | None = Field(None, description="Default AI model for studies")

    model_config = {"extra": "allow"}


class PreferencesResponse(BaseModel):
    """Response containing user preferences."""

    user_id: str
    preferences: dict

    model_config = {"from_attributes": True}


# --- Endpoints ---


@router.get("", response_model=PreferencesResponse)
async def get_preferences(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
) -> PreferencesResponse:
    """Get the current user's preferences.

    Returns default preferences merged with any saved overrides.
    """
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == user_id)
    )
    pref = result.scalar_one_or_none()

    if pref:
        # Merge defaults with saved preferences (saved values take precedence)
        merged = {**DEFAULT_PREFERENCES, **pref.preferences}
        return PreferencesResponse(user_id=user_id, preferences=merged)

    return PreferencesResponse(user_id=user_id, preferences=DEFAULT_PREFERENCES)


@router.put("", response_model=PreferencesResponse)
async def update_preferences(
    data: PreferencesData,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
) -> PreferencesResponse:
    """Update the current user's preferences.

    Creates a new record if none exists. Merges provided fields
    with existing preferences (partial update).
    """
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == user_id)
    )
    pref = result.scalar_one_or_none()

    # Build update dict from non-None fields
    update_data = data.model_dump(exclude_none=True)

    if pref:
        # Merge with existing preferences
        merged = {**pref.preferences, **update_data}
        pref.preferences = merged
    else:
        # Create new record
        merged = {**DEFAULT_PREFERENCES, **update_data}
        pref = UserPreference(
            user_id=user_id,
            preferences=merged,
        )
        db.add(pref)

    await db.flush()

    return PreferencesResponse(user_id=user_id, preferences=merged)
