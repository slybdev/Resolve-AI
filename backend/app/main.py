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

# Silence noisy libraries
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("discord").setLevel(logging.WARNING)
logging.getLogger("aiomysql").setLevel(logging.WARNING)


async def lifespan(app: FastAPI):  # noqa: ARG001
    """Application lifespan — startup & shutdown hooks."""
    # ── Startup ──
    from app.services.channels.discord_manager import discord_bot_manager
    from app.db.session import async_session_factory
    
    logger.info("LIFESPAN: Starting Discord Bot Manager in background...")
    discord_bot_manager.set_db_factory(async_session_factory)
    
    async def _start_bots_task():
        try:
            async with async_session_factory() as db:
                await discord_bot_manager.start_all_bots(db)
            logger.info("LIFESPAN: Discord bots started successfully.")
        except Exception as e:
            logger.error(f"LIFESPAN: Failed to start Discord bots: {e}")

    import asyncio
    asyncio.create_task(_start_bots_task())
    
    yield
    # ── Shutdown ──
    from app.services.channels.discord_manager import discord_bot_manager
    await discord_bot_manager.stop_all()
    
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

    # ── Include Routers (Matching app/api/*.py) ──
    from app.api.auth import router as auth_router
    from app.api.onboarding import router as onboarding_router
    from app.api.workspaces import router as workspace_router
    from app.api.channels import router as channel_router
    from app.api.conversations import router as conversation_router
    from app.api.contacts import router as contact_router
    from app.api.webhooks import router as webhook_router
    from app.api.uploads import router as upload_router
    from app.api.tags import router as tags_router
    from app.api.websocket import router as websocket_router
    from app.api.widget import router as widget_router
    from app.api.companies import router as companies_router
    from app.api.team import router as team_router
    from app.api.api_keys import router as api_keys_router
    from app.api.settings import router as settings_router

    app.include_router(auth_router)
    app.include_router(onboarding_router)
    app.include_router(workspace_router)
    app.include_router(channel_router)
    app.include_router(conversation_router)
    app.include_router(contact_router)
    app.include_router(webhook_router)
    app.include_router(upload_router)
    app.include_router(tags_router)
    app.include_router(websocket_router)
    app.include_router(widget_router)
    app.include_router(companies_router)
    app.include_router(team_router)
    app.include_router(api_keys_router)
    app.include_router(settings_router)

    # ── Static Files ──
    from fastapi.staticfiles import StaticFiles
    import os
    os.makedirs("uploads", exist_ok=True)
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

    return app


app = create_app()
