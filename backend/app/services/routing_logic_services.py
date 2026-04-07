import datetime
import logging
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.business_hours import BusinessHours
from app.core.pubsub import pubsub_manager

logger = logging.getLogger(__name__)

class BusinessHoursService:
    async def is_open(self, db: AsyncSession, workspace_id: any) -> bool:
        """
        Checks if the workspace is currently within business hours.
        Returns True if open or if no hours are configured (default).
        """
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        day_of_week = now_utc.weekday() # 0 = Monday, 6 = Sunday
        
        result = await db.execute(
            select(BusinessHours).where(
                BusinessHours.workspace_id == workspace_id,
                BusinessHours.day_of_week == day_of_week
            )
        )
        bh = result.scalar_one_or_none()
        
        if not bh:
            return True # Default to open
            
        if bh.is_closed:
            return False
            
        # Current time as string "HH:MM:SS" for easy comparison
        curr_time = now_utc.strftime("%H:%M:%S")
        
        if bh.open_time and curr_time < bh.open_time:
            return False
        if bh.close_time and curr_time > bh.close_time:
            return False
            
        return True

class PresenceService:
    """
    Tracks agent online status using Redis.
    """
    async def is_online(self, user_id: any) -> bool:
        try:
            r = await pubsub_manager.get_redis()
            return await r.exists(f"presence:{user_id}") > 0
        except Exception as e:
            logger.error(f"Presence check failed: {e}")
            return False

    async def heartbeat(self, user_id: any, timeout: int = 60):
        """Refreshes the presence key for a user."""
        try:
            r = await pubsub_manager.get_redis()
            await r.setex(f"presence:{user_id}", timeout, "1")
        except Exception as e:
            logger.error(f"Presence update failed: {e}")

business_hours_service = BusinessHoursService()
presence_service = PresenceService()
