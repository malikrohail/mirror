import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.study import Study, StudyStatus


class StudyRepository:
    """Data access layer for studies."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **kwargs) -> Study:
        study = Study(**kwargs)
        self.session.add(study)
        await self.session.flush()
        return study

    async def get_by_id(self, study_id: uuid.UUID) -> Study | None:
        result = await self.session.execute(
            select(Study)
            .where(Study.id == study_id)
            .options(
                selectinload(Study.tasks),
                selectinload(Study.personas),
            )
        )
        return result.scalar_one_or_none()

    async def get_with_all(self, study_id: uuid.UUID) -> Study | None:
        """Get study with all related data loaded."""
        result = await self.session.execute(
            select(Study)
            .where(Study.id == study_id)
            .options(
                selectinload(Study.tasks),
                selectinload(Study.personas),
                selectinload(Study.sessions),
                selectinload(Study.issues),
                selectinload(Study.insights),
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        page: int = 1,
        limit: int = 20,
        status: StudyStatus | None = None,
    ) -> tuple[list[Study], int]:
        query = (
            select(Study)
            .options(selectinload(Study.tasks), selectinload(Study.personas))
            .order_by(Study.created_at.desc())
        )
        count_query = select(func.count()).select_from(Study)

        if status:
            query = query.where(Study.status == status)
            count_query = count_query.where(Study.status == status)

        total = (await self.session.execute(count_query)).scalar() or 0

        query = query.offset((page - 1) * limit).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def update_status(self, study_id: uuid.UUID, status: StudyStatus) -> Study | None:
        study = await self.get_by_id(study_id)
        if study:
            study.status = status
            await self.session.flush()
        return study

    async def update(self, study_id: uuid.UUID, **kwargs) -> Study | None:
        study = await self.get_by_id(study_id)
        if study:
            for key, value in kwargs.items():
                setattr(study, key, value)
            await self.session.flush()
        return study

    async def delete(self, study_id: uuid.UUID) -> bool:
        study = await self.get_by_id(study_id)
        if study:
            await self.session.delete(study)
            await self.session.flush()
            return True
        return False
