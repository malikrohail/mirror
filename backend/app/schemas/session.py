import uuid
from datetime import datetime

from pydantic import BaseModel


class StepOut(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    step_number: int
    page_url: str | None = None
    page_title: str | None = None
    screenshot_path: str | None = None
    think_aloud: str | None = None
    action_type: str | None = None
    action_selector: str | None = None
    action_value: str | None = None
    confidence: float | None = None
    task_progress: float | None = None
    emotional_state: str | None = None
    click_x: int | None = None
    click_y: int | None = None
    viewport_width: int | None = None
    viewport_height: int | None = None
    scroll_y: int | None = None
    max_scroll_y: int | None = None
    load_time_ms: int | None = None
    first_paint_ms: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class IssueOut(BaseModel):
    id: uuid.UUID
    step_id: uuid.UUID | None = None
    session_id: uuid.UUID
    study_id: uuid.UUID
    element: str | None = None
    description: str
    severity: str
    heuristic: str | None = None
    wcag_criterion: str | None = None
    recommendation: str | None = None
    page_url: str | None = None
    first_seen_study_id: uuid.UUID | None = None
    times_seen: int = 1
    is_regression: bool = False
    priority_score: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SessionOut(BaseModel):
    id: uuid.UUID
    study_id: uuid.UUID
    persona_id: uuid.UUID
    task_id: uuid.UUID
    status: str
    total_steps: int = 0
    task_completed: bool = False
    summary: str | None = None
    emotional_arc: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SessionDetail(SessionOut):
    steps: list[StepOut] = []
    issues: list[IssueOut] = []


class InsightOut(BaseModel):
    id: uuid.UUID
    study_id: uuid.UUID
    type: str
    title: str
    description: str
    severity: str | None = None
    impact: str | None = None
    effort: str | None = None
    personas_affected: list | dict | None = None
    evidence: list | dict | None = None
    rank: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class HeatmapDataPoint(BaseModel):
    page_url: str
    click_x: int
    click_y: int
    viewport_width: int
    viewport_height: int
    persona_name: str | None = None


class HeatmapResponse(BaseModel):
    page_url: str
    data_points: list[HeatmapDataPoint]
    total_clicks: int
