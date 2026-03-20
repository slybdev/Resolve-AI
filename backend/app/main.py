"""
FastAPI application factory.

Usage:
    from app.main import app
    # or: uvicorn app.main:app --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    """Application lifespan — startup & shutdown hooks."""
    # ── Startup ──
    # Database and Redis connections are lazily initialized via their
    # respective modules, so no explicit startup action is needed here.
    yield
    # ── Shutdown ──
    # Dispose the engine connection pool on shutdown.
    from app.db.session import engine

    await engine.dispose()


def create_app() -> FastAPI:
    """Build and return a configured FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        description="AI-powered customer support platform",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS ──
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Health check ──
    @app.get("/health", tags=["health"])
    async def health_check():
        return {"status": "healthy"}

    # ── Register routers ──
    # Engineer A routers:
    from app.api.auth import router as auth_router
    from app.api.onboarding import router as onboarding_router
    from app.api.workspaces import router as workspaces_router

    app.include_router(auth_router)
    app.include_router(workspaces_router)
    app.include_router(onboarding_router)
    # Engineer B routers:
    from app.api.companies import router as companies_router
    from app.api.contacts import router as contacts_router
    from app.api.tags import router as tags_router
    from app.api.team import router as team_router
    from app.api.settings import router as settings_router
    from app.api.api_keys import router as api_keys_router
    from app.api.channels import router as channels_router

    app.include_router(contacts_router)
    app.include_router(companies_router)
    app.include_router(tags_router)
    app.include_router(team_router)
    app.include_router(settings_router)
    app.include_router(api_keys_router)
    app.include_router(channels_router)
    from app.api.webhooks import router as webhooks_router
    app.include_router(webhooks_router)
    from app.api.widget import router as widget_router
    app.include_router(widget_router)
    from app.api.conversations import router as conversations_router
    app.include_router(conversations_router)
    from app.api.websocket import router as websocket_router
    app.include_router(websocket_router)

    return app


# Module-level instance used by uvicorn
app = create_app()
