from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from storyza_backend.api.deps import CurrentUser
from storyza_backend.core.db import get_db
from storyza_backend.models.asset import Asset
from storyza_backend.models.enums import AssetKind
from storyza_backend.schemas.asset import AssetRead
from storyza_backend.schemas.common import Page

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=Page[AssetRead])
async def list_assets(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    kind: Annotated[AssetKind | None, Query()] = None,
    q: str | None = Query(default=None, max_length=64),
    tag: str | None = Query(default=None, max_length=32),
    page: int = Query(1, ge=1),
    page_size: int = Query(48, ge=1, le=100),
) -> Page[AssetRead]:
    base = select(Asset).where(Asset.is_published.is_(True))
    if kind is not None:
        base = base.where(Asset.kind == kind.value)
    if q:
        base = base.where(func.lower(Asset.name).like(f"%{q.strip().lower()}%"))
    if tag:
        base = base.where(Asset.tags.contains([tag.strip().lower()]))
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    result = await db.execute(
        base.order_by(Asset.kind, Asset.name).offset((page - 1) * page_size).limit(page_size)
    )
    return Page(
        items=list(result.scalars().all()),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{asset_id}", response_model=AssetRead)
async def get_asset(
    asset_id: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Asset:
    asset = await db.get(Asset, asset_id)
    if asset is None or not asset.is_published:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return asset