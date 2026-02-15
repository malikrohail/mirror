"""Team management API — persist user's persona team server-side."""

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.dependencies import get_db
from app.models.team import UserTeam

router = APIRouter()

DEFAULT_USER_ID = "default-user"


def _get_user_id(x_user_id: str | None = Header(None)) -> str:
    """Extract user ID from header, falling back to default."""
    return x_user_id or DEFAULT_USER_ID


# --- Schemas ---


class TeamMemberOut(BaseModel):
    """A single team member (persona template in the user's team)."""

    id: uuid.UUID
    persona_template_id: uuid.UUID
    order_index: int
    persona_template: dict | None = None

    model_config = {"from_attributes": True}


class TeamListResponse(BaseModel):
    """Response for listing team members."""

    items: list[TeamMemberOut]
    total: int


class TeamAddRequest(BaseModel):
    """Request to add a persona template to the team."""

    persona_template_id: uuid.UUID


class TeamReorderRequest(BaseModel):
    """Request to reorder team members."""

    persona_template_ids: list[uuid.UUID] = Field(
        ..., description="Ordered list of persona template IDs"
    )


# --- Endpoints ---


@router.get("", response_model=TeamListResponse)
async def list_team(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
) -> TeamListResponse:
    """List all persona templates in the user's team, ordered by order_index."""
    result = await db.execute(
        select(UserTeam)
        .where(UserTeam.user_id == user_id)
        .options(selectinload(UserTeam.persona_template))
        .order_by(UserTeam.order_index)
    )
    teams = list(result.scalars().all())

    items = []
    for t in teams:
        template_data = None
        if t.persona_template:
            template_data = {
                "id": str(t.persona_template.id),
                "name": t.persona_template.name,
                "emoji": t.persona_template.emoji,
                "category": t.persona_template.category,
                "short_description": t.persona_template.short_description,
            }
        items.append(
            TeamMemberOut(
                id=t.id,
                persona_template_id=t.persona_template_id,
                order_index=t.order_index,
                persona_template=template_data,
            )
        )

    return TeamListResponse(items=items, total=len(items))


@router.post("", response_model=TeamMemberOut, status_code=201)
async def add_to_team(
    data: TeamAddRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
) -> TeamMemberOut:
    """Add a persona template to the user's team."""
    # Check for duplicates
    existing = await db.execute(
        select(UserTeam).where(
            UserTeam.user_id == user_id,
            UserTeam.persona_template_id == data.persona_template_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Persona already in team")

    # Get next order_index
    count_result = await db.execute(
        select(func.count()).select_from(UserTeam).where(UserTeam.user_id == user_id)
    )
    next_index = count_result.scalar() or 0

    team_member = UserTeam(
        user_id=user_id,
        persona_template_id=data.persona_template_id,
        order_index=next_index,
    )
    db.add(team_member)
    await db.flush()

    # Reload with relationship
    result = await db.execute(
        select(UserTeam)
        .where(UserTeam.id == team_member.id)
        .options(selectinload(UserTeam.persona_template))
    )
    member = result.scalar_one()

    template_data = None
    if member.persona_template:
        template_data = {
            "id": str(member.persona_template.id),
            "name": member.persona_template.name,
            "emoji": member.persona_template.emoji,
            "category": member.persona_template.category,
            "short_description": member.persona_template.short_description,
        }

    return TeamMemberOut(
        id=member.id,
        persona_template_id=member.persona_template_id,
        order_index=member.order_index,
        persona_template=template_data,
    )


@router.delete("/{persona_template_id}", status_code=204)
async def remove_from_team(
    persona_template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
) -> None:
    """Remove a persona template from the user's team."""
    result = await db.execute(
        delete(UserTeam).where(
            UserTeam.user_id == user_id,
            UserTeam.persona_template_id == persona_template_id,
        )
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Persona not found in team")


@router.put("/reorder", response_model=TeamListResponse)
async def reorder_team(
    data: TeamReorderRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(_get_user_id),
) -> TeamListResponse:
    """Reorder the user's team by providing the desired order of persona template IDs."""
    for idx, template_id in enumerate(data.persona_template_ids):
        await db.execute(
            update(UserTeam)
            .where(
                UserTeam.user_id == user_id,
                UserTeam.persona_template_id == template_id,
            )
            .values(order_index=idx)
        )
    await db.flush()

    # Return updated list
    return await list_team(db=db, user_id=user_id)
