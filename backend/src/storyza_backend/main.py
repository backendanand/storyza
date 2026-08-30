from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from storyza_backend.api.router import api_router
from storyza_backend.core.config import settings
from storyza_backend.core.logging import setup_logging


def create_app() -> FastAPI:
    setup_logging(debug=settings.debug)

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        description="School-focused kids creative animation platform API",
        debug=settings.debug,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    media_dir = Path(settings.storage_local_dir)
    media_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=str(media_dir)), name="media")

    app.include_router(api_router)
    return app


app = create_app()