from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from storyza_backend.core.config import settings


class Base(DeclarativeBase):
    pass


# NullPool keeps connections from being reused across different event loops.
# TestClient spins up a fresh loop per test; pooled asyncpg connections bound to
# an older loop break on Windows. Tune pooling (e.g. AsyncAdaptedQueuePool) when
# running a long-lived production server process.
engine = create_async_engine(settings.database_url, echo=settings.debug, poolclass=NullPool)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session