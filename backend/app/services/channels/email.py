"""
Email channel service — handles SMTP send and placeholder for IMAP receive.
"""

import logging
import uuid
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from app.models.channel import Channel, ChannelType
from app.core.config import get_settings
from app.services.routing_service import routing_service

logger = logging.getLogger(__name__)

class EmailService:
    async def _get_credentials(self, db: AsyncSession, channel: Channel) -> Optional[Credentials]:
        """Helper to create Google OAuth2 credentials from config and refresh if needed."""
        config = channel.config or {}
        refresh_token = config.get("google_refresh_token")
        if not refresh_token:
            return None
            
        settings = get_settings()
        creds = Credentials(
            token=config.get("google_access_token"),
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=[
                "https://www.googleapis.com/auth/gmail.readonly",
                "https://www.googleapis.com/auth/gmail.send"
            ]
        )
        
        # Refresh if expired
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # Save new token back to DB
            new_config = dict(channel.config)
            new_config["google_access_token"] = creds.token
            channel.config = new_config
            await db.commit()
            
        return creds

    async def send_email(self, db: AsyncSession, channel_id: uuid.UUID, to_email: str, subject: str, body: str):
        """
        Sends an email via Gmail API using OAuth tokens.
        """
        result = await db.execute(select(Channel).where(Channel.id == channel_id))
        channel = result.scalar_one_or_none()
        if not channel or not channel.is_active:
            raise ValueError("Channel not found or inactive")

        creds = await self._get_credentials(db, channel)
        if not creds:
            raise ValueError("Gmail OAuth not configured for this channel")

        try:
            service = build('gmail', 'v1', credentials=creds)
            
            message = MIMEMultipart()
            message['to'] = to_email
            message['from'] = channel.config.get("from_email", "me")
            message['subject'] = subject
            message.attach(MIMEText(body, 'plain'))
            
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            return True
        except Exception as e:
            logger.error(f"Failed to send Gmail: {str(e)}")
            return False

    async def handle_incoming_email(self, db: AsyncSession, channel_id: uuid.UUID, from_email: str, from_name: str, subject: str, body: str, message_id: str):
        """Processes an incoming email into the routing system."""
        await routing_service.route_incoming_message(
            db=db,
            channel_id=channel_id,
            external_contact_id=from_email,
            contact_name=from_name or from_email,
            message_text=f"Subject: {subject}\n\n{body}",
            external_message_id=message_id
        )
        await db.commit()
        return True

    async def verify_connection(self, db: AsyncSession, channel: Channel) -> Optional[dict]:
        """
        Verifies Gmail API connection by fetching the user profile.
        """
        creds = await self._get_credentials(db, channel)
        if not creds:
            return None

        try:
            service = build('gmail', 'v1', credentials=creds)
            profile = service.users().getProfile(userId='me').execute()
            return {
                "detail": f"Connected as {profile.get('emailAddress')}",
                "email": profile.get('emailAddress')
            }
        except Exception as e:
            logger.error(f"Gmail verification failed: {e}")
            return None

    async def sync_messages(self, db: AsyncSession, channel: Channel):
        """
        Pulls recent messages via Gmail API.
        """
        creds = await self._get_credentials(db, channel)
        if not creds:
            return 0
            
        count = 0
        try:
            service = build('gmail', 'v1', credentials=creds)
            # List messages (max 10 for sync)
            results = service.users().messages().list(userId='me', q='is:unread', maxResults=10).execute()
            messages = results.get('messages', [])
            
            for msg_summary in messages:
                msg = service.users().messages().get(userId='me', id=msg_summary['id']).execute()
                payload = msg.get('payload', {})
                headers = payload.get('headers', [])
                
                subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), "No Subject")
                from_header = next((h['value'] for h in headers if h['name'].lower() == 'from'), "Unknown")
                
                # Simple body extraction
                body = ""
                if 'parts' in payload:
                    for part in payload['parts']:
                        if part['mimeType'] == 'text/plain':
                            data = part['body'].get('data')
                            if data:
                                body = base64.urlsafe_b64decode(data).decode('utf-8')
                            break
                else:
                    data = payload.get('body', {}).get('data')
                    if data:
                        body = base64.urlsafe_b64decode(data).decode('utf-8')

                await self.handle_incoming_email(
                    db, channel.id, from_header, from_header, subject, body, msg['id']
                )
                
                # Mark as read (remove UNREAD label)
                service.users().messages().batchModify(
                    userId='me',
                    body={
                        'ids': [msg['id']],
                        'removeLabelIds': ['UNREAD']
                    }
                ).execute()
                
                count += 1
        except Exception as e:
            logger.error(f"Error syncing Gmail messages: {e}")
            
        return count

email_service = EmailService()
