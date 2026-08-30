from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from storyza_backend.core.db import Base
from storyza_backend.models.base import TimestampMixin, UUIDMixin
from storyza_backend.models.enums import ExportJobStatus


class ExportJob(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "export_jobs"

    project_id: Mapped[object] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[object] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    export_format: Mapped[str] = mapped_column(String(8), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=ExportJobStatus.QUEUED.value, index=True
    )
    resolution: Mapped[str | None] = mapped_column(String(32), nullable=True)
    result_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    error: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    retries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class Badge(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "badges"

    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(String(512), nullable=True)
    rule: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    icon_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)


class Achievement(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "achievements"

    user_id: Mapped[object] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    badge_id: Mapped[object] = mapped_column(
        ForeignKey("badges.id", ondelete="CASCADE"), nullable=False, index=True
    )
    awarded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Challenge(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "challenges"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    prompt: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    badge_id: Mapped[object | None] = mapped_column(
        ForeignKey("badges.id", ondelete="SET NULL"), nullable=True
    )
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=False, nullable=False)