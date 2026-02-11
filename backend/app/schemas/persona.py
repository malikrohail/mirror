import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PersonaTemplateOut(BaseModel):
    id: uuid.UUID
    name: str
    emoji: str
    category: str
    short_description: str
    default_profile: dict = {}
    created_at: datetime

    model_config = {"from_attributes": True}


class PersonaGenerateRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=2000)


class PersonaGenerateResponse(BaseModel):
    id: uuid.UUID
    profile: dict
    is_custom: bool = True
