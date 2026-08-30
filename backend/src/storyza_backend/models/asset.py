from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from storyza_backend.core.db import Base
from storyza_backend.models.base import TimestampMixin, UUIDMixin
from storyza_backend.models.enums import AssetKind


class Asset(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "assets"

    kind: Mapped[str] = mapped_column(
        String(16), nullable=False, default=AssetKind.CHARACTER.value, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    media_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    age_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    age_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    safety_class: Mapped[str] = mapped_column(String(32), default="safe", nullable=False)
    owner_school_id: Mapped[object | None] = mapped_column(
        ForeignKey("schools.id", ondelete="SET NULL"), nullable=True
    )
    source: Mapped[str] = mapped_column(String(16), default="platform", nullable=False)
    version: Mapped[int] = mapped_column(default=1, nullable=False)
    is_published: Mapped[bool] = mapped_column(default=False, nullable=False)