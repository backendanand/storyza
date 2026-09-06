from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from storyza_backend.core.db import Base
from storyza_backend.models.base import TimestampMixin, UUIDMixin
from storyza_backend.models.enums import ProjectStatus

if TYPE_CHECKING:
    from storyza_backend.models.tenant import User


class Project(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "projects"

    owner_id: Mapped[object] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=ProjectStatus.DRAFT.value
    )
    schema_version: Mapped[int] = mapped_column(default=1, nullable=False)
    current_version_id: Mapped[object | None] = mapped_column(
        ForeignKey("project_versions.id", ondelete="SET NULL"), nullable=True
    )
    source_activity_id: Mapped[object | None] = mapped_column(
        ForeignKey("activities.id", ondelete="SET NULL"), nullable=True
    )
    scene_count: Mapped[int] = mapped_column(default=0, nullable=False)

    owner: Mapped["User"] = relationship(back_populates="projects")
    versions: Mapped[list["ProjectVersion"]] = relationship(
        back_populates="project",
        foreign_keys="ProjectVersion.project_id",
        order_by="ProjectVersion.version",
    )


class ProjectVersion(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "project_versions"

    project_id: Mapped[object] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(nullable=False)
    document: Mapped[dict] = mapped_column(JSONB, nullable=False)
    renderer_version: Mapped[str] = mapped_column(String(16), default="v1", nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), nullable=True)

    project: Mapped["Project"] = relationship(
        back_populates="versions", foreign_keys=[project_id]
    )


class ChatMessage(UUIDMixin, TimestampMixin, Base):
    """A saved turn in a project's conversation with the AI assistant.

    Persisted so chats survive refreshes, the AI can read earlier context
    (FR-AI-005), and a returning child resumes exactly where they left off.
    """

    __tablename__ = "chat_messages"

    project_id: Mapped[object] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[object] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)