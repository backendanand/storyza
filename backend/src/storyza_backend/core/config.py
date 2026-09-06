from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    app_name: str = "Storyza"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/storyza"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 30

    celery_broker_url: str = "memory://"
    celery_result_backend: str = "memory://"

    storage_backend: str = "local"
    storage_local_dir: str = "media"

    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()