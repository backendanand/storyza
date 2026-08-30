from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from storyza_backend.api.deps import CurrentUser
from storyza_backend.core.db import get_db
from storyza_backend.models.project import Project
from storyza_backend.schemas.service import ExportJobRead, ExportRequest
from storyza_backend.services.export import export_service

router = APIRouter(prefix="/exports", tags=["exports"])


@router.post("", response_model=ExportJobRead, status_code=status.HTTP_202_ACCEPTED)
async def request_export(
    payload: ExportRequest,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportJobRead:
    project = (
        await db.execute(
            select(Project).where(Project.id == payload.project_id, Project.owner_id == user.id)
        )
    ).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    job = await export_service.create_job(payload, str(user.id))
    return ExportJobRead.model_validate(job)


@router.get("/{job_id}", response_model=ExportJobRead)
async def get_export_job(
    job_id: str,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ExportJobRead:
    from storyza_backend.models.gamification import ExportJob

    result = await db.execute(
        select(ExportJob).where(ExportJob.id == job_id, ExportJob.user_id == user.id)
    )
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export job not found")
    return ExportJobRead.model_validate(job)