import uuid
from urllib.parse import urlparse

import redis.asyncio as aioredis
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.persona_repo import PersonaRepository
from app.db.repositories.session_repo import SessionRepository
from app.db.repositories.study_repo import StudyRepository
from app.models.study import Study, StudyStatus
from app.schemas.study import StudyCreate


class StudyService:
    """Business logic for studies."""

    def __init__(self, db: AsyncSession, redis: aioredis.Redis | None = None):
        self.db = db
        self.redis = redis
        self.study_repo = StudyRepository(db)
        self.persona_repo = PersonaRepository(db)
        self.session_repo = SessionRepository(db)

    async def _generate_study_name(self, url: str) -> str:
        """Generate a unique study name from the URL hostname.

        Extracts the domain, counts existing studies with the same domain,
        and produces a name like "google-3".
        """
        parsed = urlparse(url)
        hostname = parsed.hostname or "unknown"

        # Strip common prefixes and TLD for cleaner names
        domain = hostname.replace("www.", "")
        # Take just the main domain part (e.g., "google" from "google.com")
        domain_parts = domain.split(".")
        if len(domain_parts) > 1:
            domain_label = domain_parts[0]
        else:
            domain_label = domain

        # Count existing studies with the same domain in the URL
        result = await self.db.execute(
            select(func.count()).select_from(Study).where(
                Study.url.ilike(f"%{hostname}%")
            )
        )
        count = result.scalar() or 0
        next_number = count + 1

        return f"{domain_label}-{next_number}"

    async def create_study(self, data: StudyCreate):
        """Create a study with tasks and personas."""
        # Ensure URL has a scheme so Playwright can navigate to it
        url = data.url.strip()
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        # Auto-generate a name from the URL
        name = await self._generate_study_name(url)

        study = await self.study_repo.create(
            url=url,
            starting_path=data.starting_path,
            name=name,
        )

        # Create tasks
        from app.models.task import Task

        for i, task_data in enumerate(data.tasks):
            task = Task(
                study_id=study.id,
                description=task_data.description,
                order_index=task_data.order_index or i,
            )
            self.db.add(task)

        # Create personas from templates
        for template_id in data.persona_template_ids:
            template = await self.persona_repo.get_template(template_id)
            if not template:
                raise HTTPException(status_code=400, detail=f"Template {template_id} not found")
            await self.persona_repo.create_persona(
                study_id=study.id,
                template_id=template.id,
                profile=template.default_profile,
            )

        await self.db.flush()

        # Reload with relationships
        return await self.study_repo.get_by_id(study.id)

    async def get_study(self, study_id: uuid.UUID):
        study = await self.study_repo.get_by_id(study_id)
        if not study:
            raise HTTPException(status_code=404, detail="Study not found")
        return study

    async def list_studies(self, page: int = 1, limit: int = 20, status: str | None = None):
        status_enum = StudyStatus(status) if status else None
        studies, total = await self.study_repo.list(page=page, limit=limit, status=status_enum)
        return studies, total

    async def delete_study(self, study_id: uuid.UUID):
        deleted = await self.study_repo.delete(study_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Study not found")

        # Clean up screenshot files from disk
        import os
        import shutil
        storage_path = os.getenv("STORAGE_PATH", "./data")
        study_dir = os.path.join(storage_path, "studies", str(study_id))
        if os.path.isdir(study_dir):
            shutil.rmtree(study_dir, ignore_errors=True)

    async def run_study(self, study_id: uuid.UUID, browser_mode: str | None = None) -> str:
        """Start running a study by dispatching to the job queue."""
        study = await self.get_study(study_id)

        if study.status != StudyStatus.SETUP:
            raise HTTPException(
                status_code=400,
                detail=f"Study is already in '{study.status.value}' state",
            )

        # Update status
        await self.study_repo.update_status(study_id, StudyStatus.RUNNING)

        # Create sessions for each persona × task combination
        for persona in study.personas:
            for task in study.tasks:
                await self.session_repo.create_session(
                    study_id=study.id,
                    persona_id=persona.id,
                    task_id=task.id,
                )

        await self.db.flush()

        # Dispatch to arq job queue
        if self.redis:
            try:
                from arq import create_pool
                from arq.connections import RedisSettings
                from app.config import settings

                pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
                job = await pool.enqueue_job("run_study_task", str(study_id), browser_mode)
                await pool.close()
                return job.job_id if job else str(study_id)
            except Exception:
                # No arq worker running — study stays in "running" state
                # and can be picked up when worker starts
                pass

        return str(study_id)

    async def get_study_status(self, study_id: uuid.UUID) -> dict:
        study = await self.get_study(study_id)
        progress = 0.0
        phase = study.status.value

        if self.redis:
            cached = await self.redis.get(f"study:{study_id}:progress")
            if cached:
                progress = float(cached)

        return {
            "study_id": study.id,
            "status": study.status.value,
            "percent": progress,
            "phase": phase,
        }
