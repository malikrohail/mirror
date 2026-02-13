import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ScheduleTaskDef(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000)
    order_index: int = 0


class ScheduleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., min_length=1, max_length=2048)
    starting_path: str = "/"
    tasks: list[ScheduleTaskDef] = Field(..., min_length=1, max_length=3)
    persona_template_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=10)
    cron_expression: str | None = Field(
        None,
        description="Cron expression for recurring runs, e.g. '0 9 * * 1' for every Monday at 9am",
    )


class ScheduleUpdate(BaseModel):
    name: str | None = None
    cron_expression: str | None = None
    status: str | None = None  # "active", "paused"
    tasks: list[ScheduleTaskDef] | None = None
    persona_template_ids: list[uuid.UUID] | None = None


class ScheduleOut(BaseModel):
    id: uuid.UUID
    name: str
    url: str
    starting_path: str
    tasks: list[dict]
    persona_template_ids: list
    cron_expression: str | None = None
    webhook_secret: str | None = None
    status: str
    last_run_at: datetime | None = None
    next_run_at: datetime | None = None
    last_study_id: uuid.UUID | None = None
    run_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ScheduleList(BaseModel):
    items: list[ScheduleOut]
    total: int


class ScheduleRunResponse(BaseModel):
    schedule_id: uuid.UUID
    study_id: uuid.UUID
    job_id: str


class WebhookTriggerResponse(BaseModel):
    schedule_id: uuid.UUID
    study_id: uuid.UUID
    job_id: str
    message: str = "Study triggered successfully"
