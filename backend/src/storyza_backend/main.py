from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

    app.include_router(api_router)
    return app


app = create_app()