from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from storyza_backend.api.deps import CurrentUser
from storyza_backend.core.db import get_db
from storyza_backend.models.enums import ProjectStatus
from storyza_backend.models.project import Project, ProjectVersion

router = APIRouter(prefix="/me", tags=["me"])


class UserStats(BaseModel):
    total_projects: int
    draft_projects: int
    shared_projects: int
    total_saves: int
    total_scenes: int
    total_animations: int
    total_audio: int
    total_keyframes: int
    total_duration: float
    member_since: datetime | None
    last_login_at: datetime | None


@router.get("/stats", response_model=UserStats)
async def my_stats(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserStats:
    status_result = await db.execute(
        select(Project.status, func.count())
        .where(Project.owner_id == user.id)
        .group_by(Project.status)
    )
    status_counts = dict(status_result.all())

    total_projects = sum(status_counts.values())
    draft_projects = status_counts.get(ProjectStatus.DRAFT.value, 0)
    shared_projects = total_projects - draft_projects

    scene_result = await db.execute(
        select(func.coalesce(func.sum(Project.scene_count), 0)).where(
            Project.owner_id == user.id
        )
    )
    total_scenes = int(scene_result.scalar_one())

    saves_result = await db.execute(
        select(func.count(ProjectVersion.id))
        .join(Project, ProjectVersion.project_id == Project.id)
        .where(Project.owner_id == user.id)
    )
    total_saves = int(saves_result.scalar_one())

    current_versions = await db.execute(
        select(ProjectVersion)
        .join(Project, ProjectVersion.id == Project.current_version_id)
        .where(Project.owner_id == user.id)
    )
    documents = [
        version.document for version in current_versions.scalars().all() if version.document
    ]

    total_animations = sum(len(doc.get("animations", []) or []) for doc in documents)
    total_audio = sum(len(doc.get("audio", []) or []) for doc in documents)
    total_keyframes = sum(
        len(track.get("keyframes", []) or [])
        for doc in documents
        for track in (doc.get("animation_tracks", []) or [])
    )
    total_duration = round(sum(doc.get("duration", 0) or 0 for doc in documents), 1)

    return UserStats(
        total_projects=total_projects,
        draft_projects=draft_projects,
        shared_projects=shared_projects,
        total_saves=total_saves,
        total_scenes=total_scenes,
        total_animations=total_animations,
        total_audio=total_audio,
        total_keyframes=total_keyframes,
        total_duration=total_duration,
        member_since=user.created_at,
        last_login_at=user.last_login_at,
    )