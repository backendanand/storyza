import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ProjectObject(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    kind: str
    name: str = "Object"
    x: float = 0.0
    y: float = 0.0
    rotation: float = 0.0
    scale: float = 1.0
    visible: bool = True
    asset_id: str | None = None
    z_index: int = 0


class SceneObject(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    name: str = "Scene"
    background_id: str | None = None
    objects: list[ProjectObject] = Field(default_factory=list)


class Keyframe(BaseModel):
    model_config = ConfigDict(extra="allow")

    t: float = Field(ge=0)
    value: float | bool
    easing: Literal["linear", "easeInOut"] = "linear"


class AnimationTrack(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    object_id: str
    property: Literal["x", "y", "rotation", "scale", "visible"]
    keyframes: list[Keyframe] = Field(default_factory=list)

    @field_validator("keyframes")
    @classmethod
    def _keyframes_sorted(cls, keyframes: list[Keyframe]) -> list[Keyframe]:
        times = [k.t for k in keyframes]
        if any(second < first for first, second in zip(times, times[1:], strict=False)):
            raise ValueError("keyframes must be sorted by ascending time")
        return keyframes


class ProjectDocument(BaseModel):
    model_config = ConfigDict(extra="allow")

    schema_version: int = 1
    renderer_version: str = "v1"
    title: str
    meta: dict = Field(default_factory=dict)
    scenes: list[SceneObject] = Field(default_factory=list)
    animation_tracks: list[AnimationTrack] = Field(default_factory=list)
    animations: list[dict] = Field(default_factory=list)
    audio: list[dict] = Field(default_factory=list)
    export_settings: dict = Field(default_factory=dict)
    duration: float = 0.0

    @model_validator(mode="after")
    def check_schema_version(self) -> "ProjectDocument":
        if self.schema_version < 1:
            raise ValueError("schema_version must be >= 1")
        if self.renderer_version != "v1":
            raise ValueError("unsupported renderer_version")
        content_max = max(
            (k.t for track in self.animation_tracks for k in track.keyframes), default=0.0
        )
        self.duration = max(self.duration, content_max)
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
    category: str | None = None
    theme: str | None = None
    description: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ProjectDetail(ProjectRead):
    document: ProjectDocument | None = None
    author_name: str | None = None
    author_role: str | None = None


class ProjectRestore(BaseModel):
    version: int = Field(ge=1)