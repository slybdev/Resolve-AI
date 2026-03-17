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

    return app


# Module-level instance used by uvicorn
app = create_app()
