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

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def _set_avatar_url(self) -> "PersonaTemplateOut":
        if not self.avatar_url:
            self.avatar_url = f"https://i.pravatar.cc/200?u={quote(self.name)}"
        return self


class PersonaGenerateRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=2000)


class PersonaGenerateResponse(BaseModel):
    id: uuid.UUID
    profile: dict
    is_custom: bool = True
