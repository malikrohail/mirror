import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.persona import Persona, PersonaTemplate


class PersonaRepository:
    """Data access layer for personas and templates."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # Templates
    async def list_templates(self, category: str | None = None) -> list[PersonaTemplate]:
        query = select(PersonaTemplate).order_by(PersonaTemplate.category, PersonaTemplate.name)
        if category:
            query = query.where(PersonaTemplate.category == category)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_template(self, template_id: uuid.UUID) -> PersonaTemplate | None:
        result = await self.session.execute(
            select(PersonaTemplate).where(PersonaTemplate.id == template_id)
        )
        return result.scalar_one_or_none()

    async def create_template(self, **kwargs) -> PersonaTemplate:
        template = PersonaTemplate(**kwargs)
        self.session.add(template)
        await self.session.flush()
        return template

    async def template_exists(self, name: str) -> bool:
        result = await self.session.execute(
            select(PersonaTemplate.id).where(PersonaTemplate.name == name).limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def get_template_by_name(self, name: str) -> PersonaTemplate | None:
        result = await self.session.execute(
            select(PersonaTemplate).where(PersonaTemplate.name == name).limit(1)
        )
        return result.scalar_one_or_none()

    # Personas
    async def create_persona(self, **kwargs) -> Persona:
        persona = Persona(**kwargs)
        self.session.add(persona)
        await self.session.flush()
        return persona

    async def get_persona(self, persona_id: uuid.UUID) -> Persona | None:
        result = await self.session.execute(
            select(Persona).where(Persona.id == persona_id)
        )
        return result.scalar_one_or_none()

    async def list_personas(self, study_id: uuid.UUID) -> list[Persona]:
        result = await self.session.execute(
            select(Persona)
            .where(Persona.study_id == study_id)
            .order_by(Persona.created_at)
        )
        return list(result.scalars().all())
