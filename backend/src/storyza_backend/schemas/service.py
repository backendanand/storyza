import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from storyza_backend.models.enums import ExportFormat


class ExportRequest(BaseModel):
    project_id: uuid.UUID
    export_format: ExportFormat = ExportFormat.MP4
    resolution: str | None = Field(default=None, pattern=r"^\d{2,4}x\d{2,4}$")


class ExportJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    export_format: str
    status: str
    result_url: str | None
    error: str | None
    created_at: datetime | None = None


class AiAssistRequest(BaseModel):
    feature: str = "story_assistant"
    prompt: str = Field(min_length=1, max_length=2000)
    project_id: str | None = None
    context: dict = Field(default_factory=dict)


class AiAssistResponse(BaseModel):
    provider: str
    feature: str
    suggestions: list[str] = Field(default_factory=list)
    message: str | None = None