import uuid
from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


# --- Request schemas ---

class TaskCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000)
    order_index: int = 0


class PersonaSelect(BaseModel):
    template_id: uuid.UUID


class StudyCreate(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048)
    starting_path: str = "/"
    tasks: list[TaskCreate] = Field(..., min_length=1, max_length=10)
    persona_template_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=10)


# --- Response schemas ---

class TaskOut(BaseModel):
    id: uuid.UUID
    study_id: uuid.UUID
    description: str
    order_index: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PersonaOut(BaseModel):
    id: uuid.UUID
    study_id: uuid.UUID
    template_id: uuid.UUID | None = None
    profile: dict = {}
    is_custom: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class StudyOut(BaseModel):
    id: uuid.UUID
    name: str | None = None
    url: str
    starting_path: str
    status: str
    overall_score: float | None = None
    executive_summary: str | None = None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    duration_seconds: float | None = None
    tasks: list[TaskOut] = []
    personas: list[PersonaOut] = []

    # Cost tracking
    llm_input_tokens: int | None = None
    llm_output_tokens: int | None = None
    llm_total_tokens: int | None = None
    llm_api_calls: int | None = None
    llm_cost_usd: float | None = None
    browser_mode: str | None = None
    browser_cost_usd: float | None = None
    total_cost_usd: float | None = None

    model_config = {"from_attributes": True}


class StudySummary(BaseModel):
    id: uuid.UUID
    name: str | None = None
    url: str
    status: str
    overall_score: float | None = None
    created_at: datetime
    task_count: int = 0
    persona_count: int = 0
    first_task: str | None = None

    model_config = {"from_attributes": True}


class StudyList(BaseModel):
    items: list[StudySummary]
    total: int
    page: int
    limit: int


class StudyRunResponse(BaseModel):
    study_id: uuid.UUID
    job_id: str
    status: str = "running"


class StudyStatusResponse(BaseModel):
    study_id: uuid.UUID
    status: str
    percent: float = 0
    phase: str | None = None
