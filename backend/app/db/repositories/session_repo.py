import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.issue import Issue
from app.models.session import Session, SessionStatus
from app.models.step import Step


class SessionRepository:
    """Data access layer for sessions and steps."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_session(self, **kwargs) -> Session:
        sess = Session(**kwargs)
        self.session.add(sess)
        await self.session.flush()
        return sess

    async def get_session(self, session_id: uuid.UUID) -> Session | None:
        result = await self.session.execute(
            select(Session)
            .where(Session.id == session_id)
            .options(
                selectinload(Session.steps),
                selectinload(Session.issues),
            )
        )
        return result.scalar_one_or_none()

    async def list_sessions(self, study_id: uuid.UUID) -> list[Session]:
        result = await self.session.execute(
            select(Session)
            .where(Session.study_id == study_id)
            .order_by(Session.created_at)
        )
        return list(result.scalars().all())

    async def update_session(self, session_id: uuid.UUID, **kwargs) -> Session | None:
        sess = await self.get_session(session_id)
        if sess:
            for key, value in kwargs.items():
                setattr(sess, key, value)
            await self.session.flush()
        return sess

    # Steps
    async def create_step(self, **kwargs) -> Step:
        step = Step(**kwargs)
        self.session.add(step)
        await self.session.flush()
        return step

    async def get_steps(
        self, session_id: uuid.UUID, page: int = 1, limit: int = 50
    ) -> list[Step]:
        result = await self.session.execute(
            select(Step)
            .where(Step.session_id == session_id)
            .order_by(Step.step_number)
            .offset((page - 1) * limit)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_step(self, session_id: uuid.UUID, step_number: int) -> Step | None:
        result = await self.session.execute(
            select(Step).where(
                Step.session_id == session_id,
                Step.step_number == step_number,
            )
        )
        return result.scalar_one_or_none()

    # Issues
    async def create_issue(self, **kwargs) -> Issue:
        issue = Issue(**kwargs)
        self.session.add(issue)
        await self.session.flush()
        return issue

    async def list_issues(
        self,
        study_id: uuid.UUID,
        severity: str | None = None,
        persona_id: uuid.UUID | None = None,
        page_url: str | None = None,
    ) -> list[Issue]:
        query = select(Issue).where(Issue.study_id == study_id)

        if severity:
            query = query.where(Issue.severity == severity)
        if page_url:
            query = query.where(Issue.page_url == page_url)
        if persona_id:
            query = query.join(Session).where(Session.persona_id == persona_id)

        query = query.order_by(Issue.created_at)
        result = await self.session.execute(query)
        return list(result.scalars().all())
