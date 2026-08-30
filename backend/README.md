# storyza-backend

FastAPI service for Storyza, the school-focused kids creative animation platform.

## Stack

- Python 3.12 + FastAPI + Pydantic v2
- SQLAlchemy 2.x (async) + asyncpg, PostgreSQL
- Alembic migrations
- Celery (workers stubbed for dev; memory broker)
- JWT auth (access/refresh) + RBAC

## Run locally

```bash
uv sync
uv run python -m storyza_backend.scripts.seed   # generate SVG assets + seed the library
uv run alembic upgrade head
uv run uvicorn storyza_backend.main:app --reload
```

API docs: http://localhost:8000/docs (OpenAPI).

## Layout

```
src/storyza_backend/
├── api/        # routers: health, auth, tenants, projects, exports, ai
├── core/       # config, db, security, logging
├── models/     # SQLAlchemy entities (20 tables)
├── schemas/    # Pydantic request/response models incl. versioned project JSON
├── services/   # business logic + export & AI provider abstractions
└── workers/    # Celery app + tasks
alembic/        # migrations
tests/          # pytest suite
```

## Checks

```bash
uv run pytest -q
uv run ruff check src tests
uv run mypy src
```