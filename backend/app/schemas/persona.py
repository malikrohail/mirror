import uuid
from datetime import datetime

from urllib.parse import quote
from typing import Literal

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
        if not self.avatar_url and isinstance(self.default_profile, dict):
            profile_avatar = self.default_profile.get("avatar_url")
            if isinstance(profile_avatar, str) and profile_avatar:
                self.avatar_url = profile_avatar

        if not self.avatar_url:
            self.avatar_url = f"https://i.pravatar.cc/200?u={quote(self.name)}"
        if self.estimated_cost_per_run_usd == 0.0:
            # Approximate per-persona, per-task cost based on current pricing:
            # persona_generation (1 call) + navigation (~15 steps) +
            # screenshot_analysis (~5 pages) + fraction of synthesis/report.
            # TODO: make dynamic when per-persona model routing is implemented.
            self.estimated_cost_per_run_usd = 0.40
        return self


class PersonaAccessibilityOptions(BaseModel):
    screen_reader: bool | None = None
    low_vision: bool | None = None
    color_blind: bool | None = None
    motor_impairment: bool | None = None
    cognitive: bool | None = None
    description: str | None = Field(default=None, max_length=500)


class PersonaGenerationOptions(BaseModel):
    tech_literacy: int | None = Field(default=None, ge=1, le=10)
    patience_level: int | None = Field(default=None, ge=1, le=10)
    reading_speed: int | None = Field(default=None, ge=1, le=10)
    trust_level: int | None = Field(default=None, ge=1, le=10)
    exploration_tendency: int | None = Field(default=None, ge=1, le=10)
    device_preference: Literal["desktop", "mobile", "tablet"] | None = None
    accessibility_needs: PersonaAccessibilityOptions | None = None


class PersonaGenerateDraftResponse(PersonaGenerationOptions):
    name: str
    short_description: str | None = None
    emoji: str | None = None


class PersonaGenerateRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=2000)
    options: PersonaGenerationOptions | None = None
    avatar_url: str | None = Field(default=None, max_length=2_000_000)


class PersonaGenerateResponse(BaseModel):
    id: uuid.UUID
    profile: dict
    is_custom: bool = True
