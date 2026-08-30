import uuid

from pydantic import BaseModel, ConfigDict

from storyza_backend.models.enums import AssetKind


class AssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str | None
    kind: AssetKind
    name: str
    description: str | None
    tags: list[str] | None
    media_url: str
    thumbnail_url: str | None
    age_min: int | None
    age_max: int | None
    safety_class: str
    source: str
    version: int