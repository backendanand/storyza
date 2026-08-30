from __future__ import annotations

import abc
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import select

from storyza_backend.core.db import async_session_factory
from storyza_backend.models.enums import ExportJobStatus
from storyza_backend.models.gamification import ExportJob
from storyza_backend.models.project import Project, ProjectVersion

if TYPE_CHECKING:
    from storyza_backend.schemas.service import ExportRequest


class ExportService(abc.ABC):
    """Interface for asynchronous project export.

    Real implementation will render scenes to frames (PixiJS server-side or headless
    renderer) and encode via FFmpeg. The current implementation records the job and
    simulates completion so the workflow is testable end-to-end without media tooling.
    """

    @abc.abstractmethod
    async def create_job(self, request: ExportRequest, user_id: str) -> ExportJob:
        raise NotImplementedError

    @abc.abstractmethod
    async def process_job(self, job_id: uuid.UUID) -> None:
        raise NotImplementedError


class LocalStubExportService(ExportService):
    async def create_job(self, request: ExportRequest, user_id: str) -> ExportJob:
        async with async_session_factory() as session:
            job = ExportJob(
                project_id=request.project_id,
                user_id=user_id,
                export_format=request.export_format.value,
                status=ExportJobStatus.QUEUED.value,
                resolution=request.resolution,
            )
            session.add(job)
            await session.commit()
            await session.refresh(job)
            return job

    async def process_job(self, job_id: uuid.UUID) -> None:
        async with async_session_factory() as session:
            result = await session.execute(select(ExportJob).where(ExportJob.id == job_id))
            job = result.scalar_one_or_none()
            if job is None:
                return
            job.status = ExportJobStatus.PROCESSING.value
            job.started_at = datetime.now(UTC)
            await session.flush()

            project = await session.get(Project, job.project_id)
            if project is not None:
                version_result = await session.execute(
                    select(ProjectVersion)
                    .where(ProjectVersion.project_id == project.id)
                    .order_by(ProjectVersion.version.desc())
                    .limit(1)
                )
                latest = version_result.scalar_one_or_none()
                if latest is None:
                    job.status = ExportJobStatus.FAILED.value
                    job.error = "Project has no saved version to export"
                    await session.commit()
                    return

            job.status = ExportJobStatus.COMPLETED.value
            job.result_url = (
                f"media/exports/{job.id}.{job.export_format}  # stubbed, pending FFmpeg"
            )
            job.completed_at = datetime.now(UTC)
            await session.commit()


export_service: ExportService = LocalStubExportService()