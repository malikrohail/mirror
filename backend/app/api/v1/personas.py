import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.persona import PersonaGenerateRequest, PersonaTemplateOut
from app.services.persona_service import PersonaService

router = APIRouter()


@router.get("/templates", response_model=list[PersonaTemplateOut])
async def list_templates(
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List pre-built persona templates."""
    svc = PersonaService(db)
    return await svc.list_templates(category=category)


@router.get("/templates/{template_id}", response_model=PersonaTemplateOut)
async def get_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a persona template by ID."""
    svc = PersonaService(db)
    return await svc.get_template(template_id)


@router.post("/generate")
async def generate_persona(
    data: PersonaGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a custom persona from a natural language description using Opus."""
    from app.llm.client import LLMClient

    llm = LLMClient()
    profile = await llm.generate_persona_from_description(data.description)
    return profile.model_dump()


@router.get("/{persona_id}")
async def get_persona(
    persona_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get persona detail."""
    svc = PersonaService(db)
    persona = await svc.get_persona(persona_id)
    return {
        "id": persona.id,
        "study_id": persona.study_id,
        "template_id": persona.template_id,
        "profile": persona.profile,
        "is_custom": persona.is_custom,
        "created_at": persona.created_at,
    }
