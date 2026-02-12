import uuid

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.session_repo import SessionRepository
from app.models.insight import Insight


class SessionService:
    """Business logic for sessions, steps, and issues."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SessionRepository(db)

    async def list_sessions(self, study_id: uuid.UUID):
        return await self.repo.list_sessions(study_id)

    async def get_session(self, session_id: uuid.UUID):
        session = await self.repo.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session

    async def get_steps(self, session_id: uuid.UUID, page: int = 1, limit: int = 50):
        return await self.repo.get_steps(session_id, page=page, limit=limit)

    async def get_step(self, session_id: uuid.UUID, step_number: int):
        step = await self.repo.get_step(session_id, step_number)
        if not step:
            raise HTTPException(status_code=404, detail="Step not found")
        return step

    async def list_issues(
        self,
        study_id: uuid.UUID,
        severity: str | None = None,
        persona_id: uuid.UUID | None = None,
        page_url: str | None = None,
    ):
        return await self.repo.list_issues(
            study_id, severity=severity, persona_id=persona_id, page_url=page_url
        )

    async def get_insights(self, study_id: uuid.UUID):
        from sqlalchemy import select

        result = await self.db.execute(
            select(Insight)
            .where(Insight.study_id == study_id)
            .order_by(Insight.rank.nulls_last())
        )
        return list(result.scalars().all())

    async def get_heatmap_data(self, study_id: uuid.UUID, page_url: str | None = None):
        """Aggregate click data for heatmap generation."""
        from sqlalchemy import select

        from app.models.persona import Persona
        from app.models.session import Session
        from app.models.step import Step

        query = (
            select(Step, Session.persona_id)
            .join(Session)
            .where(
                Session.study_id == study_id,
                Step.click_x.is_not(None),
                Step.click_y.is_not(None),
            )
        )

        if page_url:
            query = query.where(Step.page_url == page_url)

        result = await self.db.execute(query)
        rows = result.all()

        # Batch-load persona names
        persona_ids = {row[1] for row in rows}
        persona_names: dict[uuid.UUID, str] = {}
        if persona_ids:
            p_result = await self.db.execute(
                select(Persona).where(Persona.id.in_(persona_ids))
            )
            for persona in p_result.scalars().all():
                profile = persona.profile or {}
                persona_names[persona.id] = profile.get("name", "Unknown")

        data_points = []
        for step, persona_id in rows:
            data_points.append({
                "page_url": step.page_url or "",
                "click_x": step.click_x,
                "click_y": step.click_y,
                "viewport_width": step.viewport_width or 1920,
                "viewport_height": step.viewport_height or 1080,
                "persona_name": persona_names.get(persona_id),
            })

        return {
            "page_url": page_url or "all",
            "data_points": data_points,
            "total_clicks": len(data_points),
        }
