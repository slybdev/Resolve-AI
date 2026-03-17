"""
Pydantic Settings — loads configuration from .env file.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── App ──
    APP_NAME: str = "ResolveAI"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # ── Database ──
<<<<<<< HEAD
    DATABASE_URL: str = "mysql+aiomysql://resolveai:resolveai_dev@localhost:3306/resolveai"
=======
    DATABASE_URL: str = "mysql+asyncmy://resolveai:resolveai_dev@localhost:3306/resolveai"
>>>>>>> 8b916b04c14f4bf91ef437b8746a745925244bf1

    # ── Redis ──
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Auth / JWT ──
    SECRET_KEY: str = "change-me-to-a-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Google Gemini AI ──
    GEMINI_API_KEY: str = ""

    # ── Stripe ──
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # ── S3 / MinIO ──
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "resolveai"

    # ── CORS ──
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
