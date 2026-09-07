from fastapi import APIRouter

from storyza_backend.api import (
    ai,
    assets,
    auth,
    community,
    exports,
    health,
    me,
    projects,
    tenants,
)

api_router = APIRouter()
api_router.include_router(health.router, prefix="/api/v1")
api_router.include_router(auth.router, prefix="/api/v1")
api_router.include_router(me.router, prefix="/api/v1")
api_router.include_router(tenants.router, prefix="/api/v1")
api_router.include_router(projects.router, prefix="/api/v1")
api_router.include_router(community.router, prefix="/api/v1")
api_router.include_router(assets.router, prefix="/api/v1")
api_router.include_router(exports.router, prefix="/api/v1")
api_router.include_router(ai.router, prefix="/api/v1")