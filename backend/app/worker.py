"""
arq worker configuration and job definitions.
Run this via: arq app.worker.WorkerSettings
"""

import asyncio
import logging
from uuid import UUID
from arq.connections import RedisSettings
from app.core.config import get_settings
from app.db.session import async_session_factory, engine
from app.services.ingestion_service import IngestionService
from app.services.knowledge_service import KnowledgeService
from app.services.browser_service import browser_service

# Setup logging for the worker
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

async def process_document_job(ctx, document_id: str):
    """
    Background job to process a document (chunking, embedding, vectorizing).
    """
    logger.info(f"┌─────────────────────────────────────────────────────┐")
    logger.info(f"│ PROCESSING JOB STARTED                              │")
    logger.info(f"│ Document ID: {document_id:<32} │")
    logger.info(f"└─────────────────────────────────────────────────────┘")
    async with async_session_factory() as db:
        try:
            await IngestionService.process_document(db, document_id)
            logger.info(f"┌─────────────────────────────────────────────────────┐")
            logger.info(f"│ ✓ PROCESSING COMPLETE                               │")
            logger.info(f"│ Document: {document_id:<36} │")
            logger.info(f"│ Status: ready                                       │")
            logger.info(f"└─────────────────────────────────────────────────────┘")
        except Exception as e:
            logger.error(f"✗ JOB FAILED FOR {document_id}: {e}", exc_info=True)
            raise

async def scrape_document_job(ctx, document_id: str, url: str, folder_id: str | None = None):
    """
    Background job to scrape a website URL and update a document.
    """
    logger.info(f"┌─────────────────────────────────────────────────────┐")
    logger.info(f"│ SCRAPE JOB STARTED                                  │")
    logger.info(f"│ Document ID: {document_id:<32} │")
    logger.info(f"│ URL: {url[:40]:<40} │")
    if folder_id:
        logger.info(f"│ Folder ID: {folder_id:<34} │")
    logger.info(f"└─────────────────────────────────────────────────────┘")
    async with async_session_factory() as db:
        try:
            await KnowledgeService.scrape_document(
                db, 
                UUID(document_id), 
                url, 
                UUID(folder_id) if folder_id else None
            )
            logger.info(f"┌─────────────────────────────────────────────────────┐")
            logger.info(f"│ ✓ SCRAPE COMPLETE                                   │")
            logger.info(f"│ Document: {document_id:<36} │")
            logger.info(f"└─────────────────────────────────────────────────────┘")
        except Exception as e:
            logger.error(f"✗ SCRAPE JOB FAILED FOR {document_id}: {e}", exc_info=True)
            raise

async def run_campaign_job(ctx, campaign_id: str):
    """
    Background job to run a campaign.
    """
    from app.services.outbound_service import outbound_service
    logger.info(f"┌─────────────────────────────────────────────────────┐")
    logger.info(f"│ CAMPAIGN JOB STARTED                                │")
    logger.info(f"│ Campaign ID: {campaign_id:<34} │")
    logger.info(f"└─────────────────────────────────────────────────────┘")
    async with async_session_factory() as db:
        try:
            await outbound_service.run_campaign(db, UUID(campaign_id))
            logger.info(f"│ ✓ CAMPAIGN COMPLETE                                 │")
        except Exception as e:
            logger.error(f"✗ CAMPAIGN JOB FAILED FOR {campaign_id}: {e}", exc_info=True)
            raise

async def on_startup(ctx):
    """Worker startup hook."""
    logger.info("Worker: Starting up...")
    await browser_service.start()

async def on_shutdown(ctx):
    """Worker shutdown hook."""
    logger.info("Worker: Shutting down...")
    await browser_service.stop()
    await engine.dispose()

class WorkerSettings:
    """arq worker settings."""
    functions = [process_document_job, scrape_document_job, run_campaign_job]
    on_startup = on_startup
    on_shutdown = on_shutdown
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    # Control concurrency (default is 10)
    job_timeout = 600  # 10 minutes
    max_jobs = 5      # Process up to 5 jobs concurrently
