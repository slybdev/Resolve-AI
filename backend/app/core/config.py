from functools import lru_cache
from typing import List, Union, Any
from pydantic import AnyHttpUrl, field_validator, ValidationInfo, validator, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict
from urllib.parse import quote_plus
from cryptography.fernet import Fernet


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──
    APP_NAME: str = "XentralDesk"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    
    # ── Security ──
    ENCRYPTION_KEY: str = "change-me-to-a-valid-fernet-key-32-bytes-b64"

    @validator("ENCRYPTION_KEY")
    def validate_encryption_key(cls, v: str) -> str:
        if v == "change-me-to-a-valid-fernet-key-32-bytes-b64":
            return v # Allow default for dev if needed, or enforce strictly
        try:
            Fernet(v.encode())
        except Exception:
            raise ValueError(
                "ENCRYPTION_KEY must be a valid 32-byte base64 Fernet key. "
                "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        return v
    
    @property
    def BASE_URL(self) -> str:
        return self.BACKEND_URL

    # ── Database ──
    POSTGRES_USER: str = "xentraldesk"
    POSTGRES_PASSWORD: str = "xentraldesk_dev"
    POSTGRES_DB: str = "xentraldesk"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str | None = None

    @validator("DATABASE_URL", pre=True, always=True)
    def assemble_db_url(cls, v: str | None, values: dict[str, Any]) -> str:
        if v:
            return v
        
        user = values.get("POSTGRES_USER")
        password = quote_plus(str(values.get("POSTGRES_PASSWORD")))
        host = values.get("POSTGRES_HOST")
        port = values.get("POSTGRES_PORT")
        db = values.get("POSTGRES_DB")

        return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{db}"

    # ── Notion OAuth ──
    NOTION_CLIENT_ID: str = ""
    NOTION_CLIENT_SECRET: str = ""
    NOTION_REDIRECT_URI: str = "http://localhost:8000/api/v1/notion/callback"

    # ── Redis ──
    REDIS_URL: str = "redis://redis:6379/0"

    # ── Auth / JWT ──
    SECRET_KEY: str = "change-me-to-a-random-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Google Gemini AI ──
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # ── Google OAuth ──
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # ── Stripe ──
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # ── S3 / MinIO ──
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "xentraldesk"

    # ── WhatsApp ──
    WHATSAPP_VERIFY_TOKEN: str = "xentraldesk_verify_token"

    # ── CORS ──
    BACKEND_CORS_ORIGINS: Any = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]], info: ValidationInfo) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [i.strip() for i in v.strip("[]").replace('"', '').replace("'", '').split(",")]
        return v


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
