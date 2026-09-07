import hashlib
import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from storyza_backend.api.deps import CurrentUser
from storyza_backend.core.db import get_db
from storyza_backend.models.enums import ProjectStatus
from storyza_backend.models.project import Project, ProjectVersion
from storyza_backend.schemas.common import Page
from storyza_backend.schemas.project import (
    ProjectCreate,
    ProjectDetail,
    ProjectDocument,
    ProjectRead,
    ProjectVersionRead,
)

router = APIRouter(prefix="/projects", tags=["projects"])


def _checksum(document: dict) -> str:
    return hashlib.sha256(
        json.dumps(document, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


@router.get("", response_model=Page[ProjectRead])
async def list_projects(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Page[ProjectRead]:
    base = select(Project).where(Project.owner_id == user.id)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    result = await db.execute(
        base.order_by(Project.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return Page(
        items=list(result.scalars().all()),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Project:
    document = payload.document or ProjectDocument(title=payload.title)
    document.schema_version = 1
    project = Project(
        owner_id=user.id,
        title=payload.title,
        status=ProjectStatus.DRAFT.value,
        source_activity_id=payload.source_activity_id,
        scene_count=len(document.scenes),
    )
    db.add(project)
    await db.flush()

    version = ProjectVersion(
        project_id=project.id,
        version=1,
        document=document.model_dump(mode="json"),
        renderer_version="v1",
        checksum=_checksum(document.model_dump(mode="json")),
    )
    db.add(version)
    await db.flush()
    project.current_version_id = version.id
    await db.commit()
    await db.refresh(project)
    return project


async def _get_owned_project(db: AsyncSession, user_id, project_id: str) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.get("/{project_id}", response_model=ProjectDetail)
async def get_project(
    project_id: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectDetail:
    project = await _get_owned_project(db, user.id, project_id)
    document = None
    if project.current_version_id:
        version = await db.get(ProjectVersion, project.current_version_id)
        if version is not None:
            document = ProjectDocument.model_validate(version.document)
    detail = ProjectDetail.model_validate(project)
    detail.document = document
    return detail


@router.post("/{project_id}/save", response_model=ProjectRead)
async def save_project(
    project_id: str,
    document: ProjectDocument,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Project:
    project = await _get_owned_project(db, user.id, project_id)
    if project.status == ProjectStatus.LOCKED.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Project is locked")

    payload = document.model_dump(mode="json")
    payload["schema_version"] = project.schema_version

    # Only one version per project — saving overwrites the current document.
    version = None
    if project.current_version_id:
        version = await db.get(ProjectVersion, project.current_version_id)
    if version is None:
        version = ProjectVersion(
            project_id=project.id,
            version=1,
            document=payload,
            renderer_version=document.renderer_version,
            checksum=_checksum(payload),
        )
        db.add(version)
        await db.flush()
        project.current_version_id = version.id
    else:
        version.document = payload
        version.renderer_version = document.renderer_version
        version.checksum = _checksum(payload)

    project.scene_count = len(document.scenes)
    await db.commit()
    await db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: str,
    title: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Project:
    project = await _get_owned_project(db, user.id, project_id)
    project.title = title
    await db.commit()
    await db.refresh(project)
    return project


class _PublishRequest(BaseModel):
    description: str | None = Field(default=None, max_length=1000)
    category: str | None = Field(default=None, max_length=64)
    theme: str | None = Field(default=None, max_length=64)


@router.post("/{project_id}/publish", response_model=ProjectRead)
async def publish_project(
    project_id: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    payload: _PublishRequest | None = None,
) -> Project:
    project = await _get_owned_project(db, user.id, project_id)
    if project.status == ProjectStatus.LOCKED.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Project is locked")
    if payload is not None:
        project.description = payload.description
        project.category = payload.category
        project.theme = payload.theme
    project.status = ProjectStatus.PUBLISHED.value
    await db.commit()
    await db.refresh(project)
    return project


@router.post("/{project_id}/unpublish", response_model=ProjectRead)
async def unpublish_project(
    project_id: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Project:
    project = await _get_owned_project(db, user.id, project_id)
    project.status = ProjectStatus.DRAFT.value
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}/versions", response_model=list[ProjectVersionRead])
async def list_project_versions(
    project_id: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ProjectVersion]:
    await _get_owned_project(db, user.id, project_id)
    result = await db.execute(
        select(ProjectVersion)
        .where(ProjectVersion.project_id == project_id)
        .order_by(ProjectVersion.version.desc())
    )
    return list(result.scalars().all())


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    project = await _get_owned_project(db, user.id, project_id)
    await db.delete(project)
    await db.commit()