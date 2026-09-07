from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from storyza_backend.core.db import get_db
from storyza_backend.models.asset import Asset
from storyza_backend.models.enums import ProjectStatus
from storyza_backend.models.project import Project, ProjectVersion
from storyza_backend.models.tenant import User
from storyza_backend.schemas.common import Page
from storyza_backend.schemas.project import ProjectDetail, ProjectDocument

router = APIRouter(prefix="/community", tags=["community"])


class CommunityStory(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str | None = None
    category: str | None = None
    theme: str | None = None
    status: str
    scene_count: int
    author_name: str | None = None
    author_role: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


@router.get("/stories", response_model=Page[CommunityStory])
async def list_community_stories(
    db: Annotated[AsyncSession, Depends(get_db)],
    category: str | None = Query(default=None, max_length=64),
    theme: str | None = Query(default=None, max_length=64),
    sort: str = Query(default="newest", pattern="^(newest|oldest)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
) -> Page[CommunityStory]:
    base = (
        select(Project, User.full_name, User.role)
        .join(User, Project.owner_id == User.id)
        .where(Project.status == ProjectStatus.PUBLISHED.value)
    )
    if category:
        base = base.where(Project.category == category)
    if theme:
        base = base.where(Project.theme == theme)

    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()

    order = Project.updated_at.desc() if sort == "newest" else Project.updated_at.asc()
    result = await db.execute(
        base.order_by(order).offset((page - 1) * page_size).limit(page_size)
    )
    rows = result.all()

    items = [
        CommunityStory(
            id=str(project.id),
            title=project.title,
            description=project.description,
            category=project.category,
            theme=project.theme,
            status=project.status,
            scene_count=project.scene_count,
            author_name=author_name,
            author_role=str(author_role) if author_role is not None else None,
            created_at=project.created_at.isoformat() if project.created_at else None,
            updated_at=project.updated_at.isoformat() if project.updated_at else None,
        )
        for project, author_name, author_role in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


async def _get_published(db: AsyncSession, story_id: str) -> Project:
    result = await db.execute(
        select(Project).where(
            Project.id == story_id, Project.status == ProjectStatus.PUBLISHED.value
        )
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Story not found")
    return project


async def _resolve_media_urls(db: AsyncSession, document: ProjectDocument) -> None:
    """Attach public media urls to each scene object so the public viewer can
    render published scenes without any auth."""
    scene = document.scenes[0] if document.scenes else None
    if scene is None:
        return

    asset_ids: set[str] = set()
    if scene.background_id:
        asset_ids.add(scene.background_id)
    for obj in scene.objects:
        if obj.asset_id:
            asset_ids.add(obj.asset_id)
    if not asset_ids:
        return

    assets = await db.execute(select(Asset).where(Asset.id.in_(asset_ids)))
    media_by_id = {str(asset.id): asset.media_url for asset in assets.scalars().all()}

    if scene.background_id and scene.background_id in media_by_id:
        scene.background_url = media_by_id[scene.background_id]
    for obj in scene.objects:
        if obj.asset_id and obj.asset_id in media_by_id:
            obj.media_url = media_by_id[obj.asset_id]


@router.get("/stories/{story_id}", response_model=ProjectDetail)
async def get_community_story(
    story_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectDetail:
    project = await _get_published(db, story_id)

    author_result = await db.execute(
        select(User.full_name, User.role).where(User.id == project.owner_id)
    )
    author = author_result.one_or_none()

    document = None
    if project.current_version_id:
        version = await db.get(ProjectVersion, project.current_version_id)
        if version is not None and version.document:
            document = ProjectDocument.model_validate(version.document)
            await _resolve_media_urls(db, document)

    detail = ProjectDetail.model_validate(project)
    detail.document = document
    detail.author_name = author[0] if author else None
    detail.author_role = str(author[1]) if author and author[1] else None
    return detail