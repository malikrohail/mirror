import json
import uuid
from pathlib import Path
from typing import TYPE_CHECKING, Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.persona_repo import PersonaRepository

if TYPE_CHECKING:
    from app.llm.schemas import PersonaProfile


# Canonical level mapping: string labels -> 1-10 integer scale
LEVEL_MAP: dict[str, int] = {
    "very_low": 2,
    "low": 3,
    "moderate": 5,
    "medium": 5,
    "high": 7,
    "very_high": 9,
    "skeptical": 3,
    "very_skeptical": 2,
    "neutral": 5,
    "skims": 3,
    "scans": 3,
    "normal": 5,
    "thorough": 8,
    "careful": 8,
}


def normalize_profile(profile: dict[str, Any]) -> dict[str, Any]:
    """Normalize a persona profile to the canonical format.

    Ensures:
    - Level fields (tech_literacy, patience_level, reading_speed, trust_level)
      are integers 1-10
    - List fields (accessibility_needs, goals, frustrations, behavioral_traits)
      are flat string arrays
    - device_preference is a string
    """
    # Normalize level fields: string labels -> integers
    for field in ("tech_literacy", "patience_level", "reading_speed", "trust_level"):
        val = profile.get(field)
        if isinstance(val, str):
            profile[field] = LEVEL_MAP.get(val.lower(), 5)
        elif isinstance(val, (int, float)):
            profile[field] = max(1, min(10, int(val)))

    # Normalize accessibility_needs: dict -> flat array, or keep as array
    needs = profile.get("accessibility_needs")
    if isinstance(needs, dict):
        # Extract keys where value is truthy, skip "description"
        profile["accessibility_needs"] = [
            k for k, v in needs.items() if v and k != "description"
        ]
    elif needs is None:
        profile["accessibility_needs"] = []
    # If it's already a list, leave it as-is

    # Normalize other list fields
    for field in ("goals", "frustrations", "behavioral_traits", "frustration_triggers"):
        val = profile.get(field)
        if val is not None and not isinstance(val, list):
            profile[field] = []

    return profile


class PersonaService:
    """Business logic for personas and templates."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PersonaRepository(db)

    async def list_templates(self, category: str | None = None):
        templates = await self.repo.list_templates(category=category)
        # Normalize profiles on read for backward compatibility
        for t in templates:
            if isinstance(t.default_profile, dict):
                t.default_profile = normalize_profile(t.default_profile)
        return templates

    async def get_template(self, template_id: uuid.UUID):
        template = await self.repo.get_template(template_id)
        if not template:
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Template not found")
        if isinstance(template.default_profile, dict):
            template.default_profile = normalize_profile(template.default_profile)
        return template

    async def get_persona(self, persona_id: uuid.UUID):
        persona = await self.repo.get_persona(persona_id)
        if not persona:
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Persona not found")
        if isinstance(persona.profile, dict):
            persona.profile = normalize_profile(persona.profile)
        return persona

    async def create_custom_template(
        self,
        profile: "PersonaProfile",
        avatar_url: str | None = None,
        model: str = "opus-4.6",
    ):
        """Save an LLM-generated persona profile as a custom template."""
        default_profile = profile.model_dump()
        if avatar_url:
            default_profile["avatar_url"] = avatar_url

        return await self.repo.create_template(
            name=profile.name,
            emoji=profile.emoji,
            category="Custom",
            short_description=profile.short_description,
            default_profile=default_profile,
            model=model,
        )

    async def seed_templates(self) -> int:
        """Load persona templates from JSON file into the database.

        Returns the number of templates loaded.
        """
        templates_path = Path(__file__).parent.parent / "data" / "persona_templates.json"
        if not templates_path.exists():
            return 0

        with open(templates_path) as f:
            templates = json.load(f)

        count = 0
        for t in templates:
            exists = await self.repo.template_exists(t["name"])
            if not exists:
                await self.repo.create_template(
                    name=t["name"],
                    emoji=t.get("emoji", "\ud83d\udc64"),
                    category=t["category"],
                    short_description=t["short_description"],
                    default_profile=t.get("default_profile", {}),
                )
                count += 1

        await self.db.flush()
        return count
