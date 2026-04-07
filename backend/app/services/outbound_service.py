import logging
import uuid
import asyncio
from typing import Any, Dict, List
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.contact import Contact
from app.models.campaign import Campaign
from datetime import datetime
from app.models.channel import Channel, ChannelType

logger = logging.getLogger(__name__)

class OutboundService:
    async def run_campaign(self, db: AsyncSession, campaign_id: uuid.UUID):
        """
        Executes a campaign: fetches audience and sends messages in batches.
        """
        result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        campaign = result.scalar_one_or_none()
        
        if not campaign:
            logger.error(f"Campaign {campaign_id} not found.")
            return

        if campaign.status not in ["scheduled", "paused"]:
            logger.warning(f"Campaign {campaign_id} is in status '{campaign.status}', cannot start.")
            return

        campaign.status = "running"
        await db.commit()

        # 1. Fetch audience based on filters
        contacts = await self.get_target_audience(db, campaign.workspace_id, campaign.audience_filters)
        total_contacts = len(contacts)
        logger.info(f"Starting campaign '{campaign.name}' for {total_contacts} contacts.")

        # 2. Send messages in batches (Gate 5 in user vision: Batching is critical)
        batch_size = 100
        for i in range(0, total_contacts, batch_size):
            # Check for pause/stop status between batches
            await db.refresh(campaign)
            if campaign.status == "paused":
                logger.info(f"Campaign {campaign_id} paused at batch {i//batch_size}.")
                return

            batch = contacts[i:i + batch_size]
            logger.info(f"Sending batch {i//batch_size + 1} ({len(batch)} contacts)...")
            
            # Send batch
            results = await asyncio.gather(*[self.send_campaign_message(db, campaign, contact) for contact in batch], return_exceptions=True)
            
            # Update analytics
            successes = sum(1 for r in results if r is True)
            campaign.sent_count += successes
            await db.commit()

            # Rate limiting between batches (avoid saturating channel APIs)
            await asyncio.sleep(1.0) 
        
        campaign.status = "completed"
        await db.commit()
        logger.info(f"Campaign {campaign_id} completed. Total sent: {campaign.sent_count}")

    async def get_target_audience(self, db: AsyncSession, workspace_id: uuid.UUID, filters: Dict[str, Any]) -> List[Contact]:
        """
        Query contacts based on audience filters.
        """
        query = select(Contact).where(Contact.workspace_id == workspace_id)
        # TODO: Implement complex filter logic (segmentation) based on JSON filters
        result = await db.execute(query)
        return result.scalars().all()

    async def send_campaign_message(self, db: AsyncSession, campaign: Campaign, contact: Contact) -> bool:
        """
        Logic to send a message via the preferred channel (WhatsApp, Email, etc.)
        """
        try:
            # 1. Resolve channel service based on campaign.channel
            # We look for the first active channel of the specified type in this workspace
            result = await db.execute(
                select(Channel).where(
                    Channel.workspace_id == campaign.workspace_id,
                    Channel.type == campaign.channel,
                    Channel.is_active == True
                )
            )
            channel = result.scalar_one_or_none()
            
            if not channel:
                logger.error(f"No active {campaign.channel} channel found for workspace {campaign.workspace_id}")
                return False

            if campaign.channel == "whatsapp":
                from app.services.channels.whatsapp import whatsapp_service
                to_number = contact.phone or contact.external_id
                if not to_number:
                    logger.warning(f"Contact {contact.id} has no phone number for WhatsApp campaign")
                    return False
                
                return await whatsapp_service.send_message(
                    db=db, 
                    channel_id=channel.id, 
                    to=to_number, 
                    text=campaign.content
                )
                
            elif campaign.channel == "email":
                from app.services.channels.email import email_service
                if not contact.email:
                    logger.warning(f"Contact {contact.id} has no email address for Email campaign")
                    return False
                
                return await email_service.send_email(
                    db=db,
                    channel_id=channel.id,
                    to_email=contact.email,
                    subject=campaign.name, # Using campaign name as default subject
                    body=campaign.content
                )
            
            return False
        except Exception as e:
            logger.error(f"Error sending campaign message to {contact.id}: {e}")
            return False

outbound_service = OutboundService()
