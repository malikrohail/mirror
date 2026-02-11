import uuid

from pydantic import BaseModel


class WSSubscribe(BaseModel):
    type: str = "subscribe"
    study_id: uuid.UUID


class WSUnsubscribe(BaseModel):
    type: str = "unsubscribe"
    study_id: uuid.UUID


class WSStudyProgress(BaseModel):
    type: str = "study:progress"
    study_id: str
    percent: float
    phase: str


class WSActionDetail(BaseModel):
    type: str
    description: str
    selector: str | None = None


class WSSessionStep(BaseModel):
    type: str = "session:step"
    session_id: str
    persona_name: str
    step_number: int
    think_aloud: str
    screenshot_url: str
    emotional_state: str
    action: WSActionDetail | str
    task_progress: float
    confidence: float = 0.0
    ux_issues_found: int = 0
    page_url: str | None = None


class WSEmotionalShift(BaseModel):
    type: str = "session:emotional_shift"
    session_id: str
    persona_name: str
    step_number: int
    from_emotion: str
    to_emotion: str
    intensity_delta: int
    think_aloud: str


class WSSessionComplete(BaseModel):
    type: str = "session:complete"
    session_id: str
    completed: bool
    total_steps: int


class WSStudyAnalyzing(BaseModel):
    type: str = "study:analyzing"
    study_id: str
    phase: str


class WSStudyComplete(BaseModel):
    type: str = "study:complete"
    study_id: str
    score: float
    issues_count: int


class WSStudyError(BaseModel):
    type: str = "study:error"
    study_id: str
    error: str
