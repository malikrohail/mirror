import json
import uuid
from pathlib import Path
from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.persona_repo import PersonaRepository

if TYPE_CHECKING:
    from app.llm.schemas import PersonaProfile


class PersonaService:
    """Business logic for personas and templates."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PersonaRepository(db)

    async def list_templates(self, category: str | None = None):
        return await self.repo.list_templates(category=category)

    async def get_template(self, template_id: uuid.UUID):
        template = await self.repo.get_template(template_id)
        if not template:
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Template not found")
        return template

    async def get_persona(self, persona_id: uuid.UUID):
        persona = await self.repo.get_persona(persona_id)
        if not persona:
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Persona not found")
        return persona

    async def create_custom_template(
        self,
        profile: "PersonaProfile",
        avatar_url: str | None = None,
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
            default_profile = dict(t.get("default_profile", {}))
            if t.get("avatar_url"):
                default_profile["avatar_url"] = t["avatar_url"]

            existing = await self.repo.get_template_by_name(t["name"])
            if existing:
                old_profile = existing.default_profile or {}
                new_avatar = default_profile.get("avatar_url", "")
                if old_profile.get("avatar_url") != new_avatar:
                    existing.default_profile = {**old_profile, "avatar_url": new_avatar}
                    count += 1
            else:
                await self.repo.create_template(
                    name=t["name"],
                    emoji=t.get("emoji", "👤"),
                    category=t["category"],
                    short_description=t["short_description"],
                    default_profile=default_profile,
                )
                count += 1

        await self.db.flush()
        return count
