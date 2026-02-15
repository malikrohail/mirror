import json
import logging
import os
import uuid

from anthropic import AsyncAnthropic
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.persona import (
    PersonaAccessibilityOptions,
    PersonaGenerateDraftResponse,
    PersonaGenerateRequest,
    PersonaGenerationOptions,
    PersonaTemplateOut,
)
from app.services.persona_service import PersonaService

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Persona recommendation schemas (inline)
# ---------------------------------------------------------------------------

class PersonaRecommendRequest(BaseModel):
    url: str = Field(..., min_length=1)
    task_description: str = Field(..., min_length=1)


class PersonaRecommendation(BaseModel):
    template_id: str
    name: str
    emoji: str
    reason: str


class PersonaRecommendResponse(BaseModel):
    personas: list[PersonaRecommendation]

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
        profile = await llm.generate_persona_from_description(
            data.description,
            config=data.options.model_dump(exclude_none=True) if data.options else None,
        )
    except Exception as e:
        logger.error("Persona generation failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail=f"AI persona generation failed: {e}",
        )

    # Save as a custom template so it appears in the template list
    svc = PersonaService(db)
    template = await svc.create_custom_template(profile, avatar_url=data.avatar_url)
    await db.commit()
    await db.refresh(template)
    return template


@router.post("/generate/draft", response_model=PersonaGenerateDraftResponse)
async def generate_persona_draft(
    data: PersonaGenerateRequest,
):
    """Generate a draft persona configuration from description without saving."""
    from app.llm.client import LLMClient

    try:
        llm = LLMClient()
        profile = await llm.generate_persona_from_description(
            data.description,
            config=data.options.model_dump(exclude_none=True) if data.options else None,
        )
    except Exception as e:
        logger.error("Persona draft generation failed: %s", e)
        raise HTTPException(
            status_code=502,
            detail=f"AI persona draft generation failed: {e}",
        )

    return PersonaGenerateDraftResponse(
        name=profile.name,
        short_description=profile.short_description,
        emoji=profile.emoji,
        tech_literacy=profile.tech_literacy,
        patience_level=profile.patience_level,
        reading_speed=profile.reading_speed,
        trust_level=profile.trust_level,
        exploration_tendency=profile.exploration_tendency,
        device_preference=profile.device_preference,
        accessibility_needs=PersonaAccessibilityOptions(
            **profile.accessibility_needs.model_dump(),
        ),
    )


@router.post("/recommend", response_model=PersonaRecommendResponse)
async def recommend_personas(
    data: PersonaRecommendRequest,
    db: AsyncSession = Depends(get_db),
):
    """Use LLM to recommend the 5 best personas for a given URL + task.

    Fetches all persona templates from the database, asks Sonnet to pick the
    5 most relevant ones, and returns the recommendations with real template IDs.
    """
    svc = PersonaService(db)
    templates = await svc.list_templates()

    # Auto-seed if no templates exist yet
    if not templates:
        try:
            count = await svc.seed_templates()
            if count > 0:
                await db.commit()
                logger.info("Auto-seeded %d persona templates for recommend endpoint", count)
                templates = await svc.list_templates()
        except Exception as e:
            logger.warning("Failed to auto-seed templates: %s", e)

    if not templates:
        raise HTTPException(status_code=404, detail="No persona templates available")

    # Build a lookup and the persona catalog for the prompt
    template_lookup: dict[str, dict] = {}
    persona_lines: list[str] = []
    for t in templates:
        tid = str(t.id)
        template_lookup[tid] = {
            "name": t.name,
            "emoji": t.emoji,
            "category": t.category,
            "short_description": t.short_description,
        }
        persona_lines.append(
            f"- ID: {tid} | Name: {t.emoji} {t.name} | Category: {t.category} | Description: {t.short_description}"
        )

    persona_catalog = "\n".join(persona_lines)

    prompt = f"""You are an expert UX researcher selecting personas for a usability test.

Website URL: {data.url}
Task: {data.task_description}

Available personas:
{persona_catalog}

Select exactly 5 personas that would be most valuable for testing this website and task.
Consider diversity of perspectives, relevance to the domain, and potential to uncover different types of usability issues.

Return ONLY a JSON array with exactly 5 objects. No markdown fences, no explanation — just the raw JSON array:
[
  {{"template_id": "the-exact-uuid-from-above", "reason": "1-2 sentence explanation of why this persona is relevant"}}
]

IMPORTANT:
- Use ONLY template_id values from the list above. Do not invent IDs.
- Return exactly 5 personas.
- Return ONLY the JSON array, nothing else."""

    try:
        from app.config import settings

        api_key = settings.ANTHROPIC_API_KEY or os.getenv("ANTHROPIC_API_KEY")
        client = AsyncAnthropic(api_key=api_key)
        response = await client.messages.create(
            model=os.getenv("SONNET_MODEL", "claude-sonnet-4-5-20250929"),
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        raw_text = ""
        for block in response.content:
            if block.type == "text":
                raw_text += block.text

        raw_text = raw_text.strip()

        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            raw_text = "\n".join(lines)

        recommendations_raw = json.loads(raw_text)

        if not isinstance(recommendations_raw, list):
            raise ValueError("LLM response is not a JSON array")

    except json.JSONDecodeError as e:
        logger.error("Failed to parse LLM recommendation response: %s\nRaw: %s", e, raw_text[:500])
        raise HTTPException(status_code=502, detail="AI returned invalid JSON for persona recommendations")
    except Exception as e:
        logger.error("Persona recommendation LLM call failed: %s", e)
        raise HTTPException(status_code=502, detail=f"AI persona recommendation failed: {e}")

    # Validate template_ids against our actual templates and build the response
    personas: list[PersonaRecommendation] = []
    for rec in recommendations_raw:
        tid = rec.get("template_id", "")
        if tid in template_lookup:
            info = template_lookup[tid]
            personas.append(PersonaRecommendation(
                template_id=tid,
                name=info["name"],
                emoji=info["emoji"],
                reason=rec.get("reason", "Selected for this study"),
            ))

    # If the LLM returned fewer valid IDs than expected, pad with remaining templates
    if len(personas) < 5:
        used_ids = {p.template_id for p in personas}
        for tid, info in template_lookup.items():
            if tid not in used_ids:
                personas.append(PersonaRecommendation(
                    template_id=tid,
                    name=info["name"],
                    emoji=info["emoji"],
                    reason="Additional persona for testing diversity",
                ))
                if len(personas) >= 5:
                    break

    return PersonaRecommendResponse(personas=personas[:5])


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
