import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.persona import PersonaGenerateRequest, PersonaTemplateOut
from app.services.persona_service import PersonaService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/templates", response_model=list[PersonaTemplateOut])
async def list_templates(
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List pre-built persona templates. Auto-seeds from JSON if DB is empty."""
    svc = PersonaService(db)
    templates = await svc.list_templates(category=category)
    if not templates:
        # Auto-seed on first access if DB is empty
        try:
            count = await svc.seed_templates()
            if count > 0:
                await db.commit()
                logger.info("Auto-seeded %d persona templates on first access", count)
                templates = await svc.list_templates(category=category)
        except Exception as e:
            logger.warning("Failed to auto-seed templates: %s", e)
    return templates


@router.get("/templates/{template_id}", response_model=PersonaTemplateOut)
async def get_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a persona template by ID."""
    svc = PersonaService(db)
    return await svc.get_template(template_id)


@router.post("/generate", response_model=PersonaTemplateOut)
async def generate_persona(
    data: PersonaGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a custom persona from a natural language description using Opus.

    Saves the generated persona as a custom template so it can be selected in studies.
    """
    from app.llm.client import LLMClient

    try:
        llm = LLMClient()
        profile = await llm.generate_persona_from_description(data.description)
    except Exception as e:
        logger.error("Persona generation failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail=f"AI persona generation failed: {e}",
        )

    # Save as a custom template so it appears in the template list
    svc = PersonaService(db)
    template = await svc.create_custom_template(profile)
    await db.commit()
    await db.refresh(template)
    return template


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
