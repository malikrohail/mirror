import uuid
from datetime import datetime

from urllib.parse import quote

from pydantic import BaseModel, Field, model_validator


class PersonaTemplateOut(BaseModel):
    id: uuid.UUID
    name: str
    emoji: str
    category: str
    short_description: str
    default_profile: dict = {}
    created_at: datetime
    avatar_url: str = ""
    model_display_name: str = "Opus 4.6"
    estimated_cost_per_run_usd: float = 0.0

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def _set_computed_fields(self) -> "PersonaTemplateOut":
        if not self.avatar_url:
            self.avatar_url = f"https://i.pravatar.cc/200?u={quote(self.name)}"
        if self.estimated_cost_per_run_usd == 0.0:
            # Approximate per-persona, per-task cost based on current pricing:
            # persona_generation (1 call) + navigation (~15 steps) +
            # screenshot_analysis (~5 pages) + fraction of synthesis/report.
            # TODO: make dynamic when per-persona model routing is implemented.
            self.estimated_cost_per_run_usd = 0.40
        return self


class PersonaGenerateRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=2000)


class PersonaGenerateResponse(BaseModel):
    id: uuid.UUID
    profile: dict
    is_custom: bool = True
