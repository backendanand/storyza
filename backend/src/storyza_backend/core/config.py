from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Storyza"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173"]

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/storyza"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 30

    celery_broker_url: str = "memory://"
    celery_result_backend: str = "memory://"

    storage_backend: str = "local"
    storage_local_dir: str = "media"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()