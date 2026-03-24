"""
arq worker configuration and job definitions.
Run this via: arq app.worker.WorkerSettings
"""

import asyncio
import logging
from arq.connections import RedisSettings
from app.core.config import get_settings
from app.db.session import async_session_factory, engine
from app.services.ingestion_service import IngestionService

# Setup logging for the worker
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

async def process_document_job(ctx, document_id: str):
    """
    Background job to process a document (chunking, embedding, etc).
    """
    logger.info(f"Worker: Starting job for document {document_id}")
    async with async_session_factory() as db:
        try:
            await IngestionService.process_document(db, document_id)
            logger.info(f"Worker: Completed job for document {document_id}")
        except Exception as e:
            logger.error(f"Worker: Job failed for document {document_id}: {e}")
            raise

async def on_startup(ctx):
    """Worker startup hook."""
    logger.info("Worker: Starting up...")

async def on_shutdown(ctx):
    """Worker shutdown hook."""
    logger.info("Worker: Shutting down...")
    await engine.dispose()

class WorkerSettings:
    """arq worker settings."""
    functions = [process_document_job]
    on_startup = on_startup
    on_shutdown = on_shutdown
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    # Control concurrency (default is 10)
    job_timeout = 600  # 10 minutes
    max_jobs = 5      # Process up to 5 jobs concurrently
