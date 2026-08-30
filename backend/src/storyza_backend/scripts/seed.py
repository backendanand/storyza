"""Idempotent seed of the starter asset library.

Generates SVG files into the local media directory and upserts matching rows in
the `assets` table. Safe to run repeatedly.

Usage:
    uv run python -m storyza_backend.scripts.seed
"""

import asyncio
from pathlib import Path

from sqlalchemy import select

from storyza_backend.core.config import settings
from storyza_backend.core.db import async_session_factory
from storyza_backend.data.seed_assets import ALL
from storyza_backend.models.asset import Asset
from storyza_backend.scripts.svg_lib import is_background, render

ASSET_DIR = Path(settings.storage_local_dir) / "assets"


def _size_for(key: str) -> tuple[int, int]:
    return (900, 520) if is_background(key) else (200, 200)


def generate_files() -> list[Path]:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for asset in ALL:
        svg = render(asset["render_key"])
        width, height = _size_for(asset["render_key"])
        svg = svg.replace(
            'width="200" height="200"', f'width="{width}" height="{height}"'
        ).replace(
            'width="900" height="520"', f'width="{width}" height="{height}"'
        )
        path = ASSET_DIR / f"{asset['slug']}.svg"
        path.write_text(svg, encoding="utf-8")
        written.append(path)
    return written


async def upsert_assets() -> int:
    count = 0
    async with async_session_factory() as session:
        for asset in ALL:
            existing = (
                await session.execute(select(Asset).where(Asset.slug == asset["slug"]))
            ).scalar_one_or_none()
            media_url = f"/media/assets/{asset['slug']}.svg"
            values = {
                "name": asset["name"],
                "description": asset["description"],
                "kind": asset["kind"],
                "tags": asset["tags"],
                "media_url": media_url,
                "thumbnail_url": media_url,
                "meta": {"render_key": asset["render_key"]},
                "age_min": asset["age_min"],
                "age_max": asset["age_max"],
                "safety_class": "safe",
                "source": "platform",
                "is_published": True,
            }
            if existing is None:
                session.add(Asset(slug=asset["slug"], **values))
            else:
                for key, value in values.items():
                    setattr(existing, key, value)
            count += 1
        await session.commit()
    return count


def main() -> None:
    files = generate_files()
    count = asyncio.run(upsert_assets())
    print(f"Seeded {count} assets, wrote {len(files)} SVG files to {ASSET_DIR}")


if __name__ == "__main__":
    main()