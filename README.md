# Storyza

A school-focused creative learning platform where children create 2D animations, stories and digital projects through a simple, guided interface.

Based on the approved Year-1 SOW and SRS (see `Kids_Creative_Animation_Platform_SOW.docx` / `Kids_Creative_Animation_Platform_SRS.docx`).

## Stack

| Layer        | Technology |
|--------------|-----------|
| Frontend     | React + TypeScript + Vite |
| UI           | Tailwind CSS + shadcn/ui |
| State        | Zustand + TanStack Query |
| 2D Rendering | PixiJS |
| Backend      | Python + FastAPI + Pydantic |
| Data Access  | SQLAlchemy 2.x + asyncpg |
| Database     | PostgreSQL |
| Cache/Queue  | Redis (stubbed for dev) |
| Background   | Celery (stubbed for dev) |
| Object Store | S3-compatible (stubbed, local dir) |

## Repository layout

```
storyza/
├── backend/     # FastAPI service (modular monolith)
├── frontend/    # React + TS + Vite web app
├── docs/        # SOW/SRS documents (root)
└── README.md
```

## Local development

### Backend

```bash
cd backend
uv sync
uv run python -m storyza_backend.scripts.seed   # generates SVG assets + seeds the library
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Note: the backend package lives at `src/storyza_backend`, so run uvicorn as
`uv run uvicorn storyza_backend.main:app --reload`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server proxies `/api` to `http://localhost:8000`.

## Status

Early scaffold: backend health/auth/tenant skeleton, project JSON model, and a minimal PixiJS studio canvas. Media export (FFmpeg), AI providers and the Redis-backed job queue are designed as interfaces and stubbed for now.