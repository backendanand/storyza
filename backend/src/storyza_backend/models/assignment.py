from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from storyza_backend.core.db import Base
from storyza_backend.models.base import TimestampMixin, UUIDMixin
from storyza_backend.models.enums import AssignmentStatus, SubmissionStatus

if TYPE_CHECKING:
    from storyza_backend.models.curriculum import Activity


class Assignment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "assignments"

    activity_id: Mapped[object] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    classroom_id: Mapped[object] = mapped_column(
        ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=AssignmentStatus.DRAFT.value
    )
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    activity: Mapped["Activity"] = relationship(back_populates="assignments")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="assignment")


class Submission(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "submissions"

    assignment_id: Mapped[object] = mapped_column(
        ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[object] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_id: Mapped[object | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(24), nullable=False, default=SubmissionStatus.DRAFT.value
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    assessment: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    assignment: Mapped["Assignment"] = relationship(back_populates="submissions")