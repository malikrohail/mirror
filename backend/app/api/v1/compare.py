"""Study comparison API — before/after and competitive analysis."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.comparator import ComparisonResult, StudyComparator
from app.dependencies import get_db

router = APIRouter()


@router.post("/studies/{study_id}/compare/{other_id}", response_model=ComparisonResult)
async def compare_studies(
    study_id: uuid.UUID,
    other_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Compare two study runs and return the delta analysis.

    study_id is the baseline ("before"), other_id is the comparison ("after").
    Returns score delta, issues fixed, issues introduced, and summary.
    """
    comparator = StudyComparator(db)
    return await comparator.compare(baseline_id=study_id, comparison_id=other_id)
