import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProjectObject(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    kind: str
    name: str = "Object"
    x: float = 0.0
    y: float = 0.0
    rotation: float = 0.0
    scale_x: float = 1.0
    scale_y: float = 1.0
    visible: bool = True
    asset_id: str | None = None
    z_index: int = 0


class SceneObject(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    name: str = "Scene"
    background_id: str | None = None
    objects: list[ProjectObject] = Field(default_factory=list)


class AnimationTrack(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    object_id: str
    property: str
    keyframes: list[dict] = Field(default_factory=list)


class ProjectDocument(BaseModel):
    model_config = ConfigDict(extra="allow")

    schema_version: int = 1
    renderer_version: str = "v1"
    title: str
    meta: dict = Field(default_factory=dict)
    scenes: list[SceneObject] = Field(default_factory=list)
    animation_tracks: list[AnimationTrack] = Field(default_factory=list)
    audio: list[dict] = Field(default_factory=list)
    export_settings: dict = Field(default_factory=dict)

    @model_validator(mode="after")
    def check_schema_version(self) -> "ProjectDocument":
        if self.schema_version < 1:
            raise ValueError("schema_version must be >= 1")
        return self


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    source_activity_id: str | None = None
    document: ProjectDocument | None = None


class ProjectVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    version: int
    renderer_version: str
    created_at: datetime | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    status: str
    schema_version: int
    scene_count: int
    current_version_id: uuid.UUID | None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ProjectDetail(ProjectRead):
    document: ProjectDocument | None = None