from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from storyza_backend.core.db import Base
from storyza_backend.models.base import TimestampMixin, UUIDMixin
from storyza_backend.models.enums import ActivityStatus

if TYPE_CHECKING:
    from storyza_backend.models.assignment import Assignment


class Grade(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "grades"

    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)


class Subject(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "subjects"

    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)


class Topic(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "topics"

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    subject_id: Mapped[object] = mapped_column(
        ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True
    )


class Activity(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "activities"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ActivityStatus] = mapped_column(
        String(16), nullable=False, default=ActivityStatus.DRAFT.value
    )
    grade_id: Mapped[object | None] = mapped_column(
        ForeignKey("grades.id", ondelete="SET NULL"), nullable=True
    )
    subject_id: Mapped[object | None] = mapped_column(
        ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    difficulty: Mapped[str | None] = mapped_column(String(16), nullable=True)
    estimated_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    learning_objective: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_id: Mapped[object | None] = mapped_column(
        ForeignKey("assets.id", ondelete="SET NULL"), nullable=True
    )
    rubric: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    assignments: Mapped[list["Assignment"]] = relationship(back_populates="activity")