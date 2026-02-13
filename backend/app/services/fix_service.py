"""AI-powered fix suggestion generation for UX issues."""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.issue import Issue
from app.llm.client import LLMClient

logger = logging.getLogger(__name__)


class FixService:
    """Generates AI-powered code fix suggestions for UX issues."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.llm = LLMClient()

    async def generate_fixes_for_study(self, study_id: uuid.UUID, issue_ids: list[uuid.UUID] | None = None) -> list[Issue]:
        """Generate fix suggestions for issues in a study."""
        stmt = select(Issue).where(Issue.study_id == study_id)
        if issue_ids:
            stmt = stmt.where(Issue.id.in_(issue_ids))
        stmt = stmt.where(Issue.fix_code.is_(None)).order_by(Issue.severity.asc())

        result = await self.db.execute(stmt)
        issues = list(result.scalars().all())

        if not issues:
            logger.info("No issues need fix suggestions for study %s", study_id)
            return []

        logger.info("Generating fixes for %d issues in study %s", len(issues), study_id)
        updated = []
        for issue in issues:
            try:
                fix = await self.llm.generate_fix_suggestion(
                    issue_description=issue.description,
                    issue_element=issue.element,
                    issue_severity=issue.severity.value if hasattr(issue.severity, "value") else str(issue.severity),
                    issue_heuristic=issue.heuristic,
                    issue_recommendation=issue.recommendation,
                    page_url=issue.page_url,
                    wcag_criterion=issue.wcag_criterion,
                )
                issue.fix_suggestion = fix.fix_explanation
                issue.fix_code = fix.fix_code
                issue.fix_language = fix.fix_language
                updated.append(issue)
            except Exception as e:
                logger.warning("Failed to generate fix for issue %s: %s", issue.id, e)
                continue

        if updated:
            await self.db.commit()
            logger.info("Generated %d fix suggestions", len(updated))
        return updated

    async def get_fixes_for_study(self, study_id: uuid.UUID) -> list[Issue]:
        """Get all issues with fix suggestions for a study."""
        result = await self.db.execute(
            select(Issue).where(Issue.study_id == study_id).where(Issue.fix_code.isnot(None)).order_by(Issue.severity.asc())
        )
        return list(result.scalars().all())
