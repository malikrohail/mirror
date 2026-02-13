import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ScoreHistoryPoint(BaseModel):
    study_id: uuid.UUID
    score: float | None
    status: str
    created_at: datetime
    schedule_id: uuid.UUID | None = None

    model_config = {"from_attributes": True}


class ScoreHistoryResponse(BaseModel):
    url: str
    data_points: list[ScoreHistoryPoint]
    total_studies: int
    average_score: float | None = None
    trend: str | None = None  # "improving", "declining", "stable"
    score_delta: float | None = None  # latest - earliest


class ComparisonSummary(BaseModel):
    """Enhanced comparison with persona-level breakdowns."""
    baseline_study_id: str
    comparison_study_id: str
    baseline_url: str
    comparison_url: str
    baseline_score: float | None = None
    comparison_score: float | None = None
    score_delta: float = 0
    score_improved: bool = False
    issues_fixed_count: int = 0
    issues_new_count: int = 0
    issues_persisting_count: int = 0
    total_baseline_issues: int = 0
    total_comparison_issues: int = 0
    summary: str = ""


class FixSuggestionOut(BaseModel):
    issue_id: uuid.UUID
    element: str | None = None
    description: str
    severity: str
    fix_suggestion: str | None = None
    fix_code: str | None = None
    fix_language: str | None = None
    page_url: str | None = None

    model_config = {"from_attributes": True}


class FixGenerateRequest(BaseModel):
    issue_ids: list[uuid.UUID] | None = Field(
        None, description="Specific issue IDs to generate fixes for. If None, generates for all issues."
    )


class FixGenerateResponse(BaseModel):
    study_id: uuid.UUID
    fixes_generated: int
    fixes: list[FixSuggestionOut]
