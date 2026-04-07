"""
Email channel service — handles SMTP send and placeholder for IMAP receive.
"""

import logging
import uuid
import base64
import os
import re
import html
import email.utils
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import mimetypes
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
                "https://www.googleapis.com/auth/gmail.send",
                "https://www.googleapis.com/auth/gmail.modify"
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

    async def send_email(self, db: AsyncSession, channel_id: uuid.UUID, to_email: str, subject: str, body: str, thread_id: Optional[str] = None):
        """
        Sends an email via Gmail API using OAuth tokens.
        Handles threading headers and attachments.
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
            
            # Handle Threading Headers
            clean_thread_id = None
            if thread_id:
                if "|" in thread_id:
                    # thread_id is stored as threadId|messageId
                    parts = thread_id.split("|")
                    clean_thread_id = parts[0]
                    last_msg_id = parts[1]
                    # Set reply headers
                    if not last_msg_id.startswith("<"):
                        last_msg_id = f"<{last_msg_id}>"
                    message['In-Reply-To'] = last_msg_id
                    message['References'] = last_msg_id
                else:
                    clean_thread_id = thread_id

            # Parse body for local attachments (URLs from our system)
            settings = get_settings()
            upload_url_pattern = rf"{re.escape(settings.BASE_URL)}/uploads/([a-zA-Z0-9\-\.]+)"
            found_files = re.findall(upload_url_pattern, body)
            
            clean_body = body
            for filename in found_files:
                local_path = os.path.join("/app/uploads", filename)
                if os.path.exists(local_path):
                    ctype, encoding = mimetypes.guess_type(local_path)
                    if ctype is None or encoding is not None:
                        ctype = 'application/octet-stream'
                    maintype, subtype = ctype.split('/', 1)
                    
                    with open(local_path, 'rb') as f:
                        part = MIMEBase(maintype, subtype)
                        part.set_payload(f.read())
                        encoders.encode_base64(part)
                        part.add_header('Content-Disposition', 'attachment', filename=filename)
                        message.attach(part)
                        # Remove the URL from the body to keep the email clean
                        clean_body = clean_body.replace(f"{settings.BASE_URL}/uploads/{filename}", "").strip()

            message.attach(MIMEText(clean_body or body, 'plain'))
            
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            body_payload = {'raw': raw_message}
            if clean_thread_id:
                body_payload['threadId'] = clean_thread_id
            
            service.users().messages().send(
                userId='me',
                body=body_payload
            ).execute()
            
            return True
        except Exception as e:
            logger.error(f"Failed to send Gmail: {str(e)}")
            return False

    async def handle_incoming_email(self, db: AsyncSession, channel_id: uuid.UUID, from_email: str, from_name: str, subject: str, body: str, message_id: str, message_type: str = "text"):
        """Processes an incoming email into the routing system."""
        _, _ = await routing_service.route_incoming_message(
            db=db,
            channel_id=channel_id,
            external_contact_id=from_email,
            contact_name=from_name or from_email,
            message_text=f"Subject: {subject}\n\n{body}" if message_type == "text" else body,
            external_message_id=message_id,
            message_type=message_type
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
        Now supports attachments and robust threading.
        """
        creds = await self._get_credentials(db, channel)
        if not creds:
            return 0
            
        count = 0
        try:
            service = build('gmail', 'v1', credentials=creds)
            # List messages (unread max 10)
            results = service.users().messages().list(userId='me', q='is:unread', maxResults=10).execute()
            messages = results.get('messages', [])
            
            for msg_summary in messages:
                msg_id = msg_summary['id']
                msg = service.users().messages().get(userId='me', id=msg_id).execute()
                thread_id = msg.get('threadId')
                payload = msg.get('payload', {})
                headers = payload.get('headers', [])
                
                subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), "No Subject")
                from_header = next((h['value'] for h in headers if h['name'].lower() == 'from'), "Unknown")
                raw_message_id = next((h['value'] for h in headers if h['name'].lower() == 'message-id'), msg_id)
                
                # Combine threadId and messageId for easier reply grouping
                external_id = f"{thread_id}|{raw_message_id}"
                
                from_name, from_email = email.utils.parseaddr(from_header)
                if not from_email:
                    from_email = from_header
                
                # Robust body and attachment extraction
                text_body = ""
                html_body = ""
                attachments = [] # List of {filename, data, mimeType}
                
                async def process_parts_recursive(parts):
                    nonlocal text_body, html_body
                    for part in parts:
                        mime_type = part.get('mimeType')
                        filename = part.get('filename')
                        body_data = part.get('body', {})
                        
                        # Handle Attachment
                        if filename and body_data.get('attachmentId'):
                            att_id = body_data['attachmentId']
                            att = service.users().messages().attachments().get(
                                userId='me', messageId=msg_id, id=att_id
                            ).execute()
                            data = base64.urlsafe_b64decode(att['data'])
                            attachments.append({
                                'filename': filename,
                                'data': data,
                                'mimeType': mime_type
                            })
                        
                        # Handle Text/HTML
                        elif mime_type == 'text/plain' and not text_body:
                            data = body_data.get('data')
                            if data:
                                text_body = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                        elif mime_type == 'text/html' and not html_body:
                            data = body_data.get('data')
                            if data:
                                html_body = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                                
                        elif 'parts' in part:
                            await process_parts_recursive(part['parts'])
                
                if 'parts' in payload:
                    await process_parts_recursive(payload['parts'])
                else:
                    # Single part message
                    data = payload.get('body', {}).get('data')
                    if data:
                        decoded = base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
                        if payload.get('mimeType') == 'text/plain':
                            text_body = decoded
                        else:
                            html_body = decoded
                            
                # Process HTML to text with link conversion
                body = text_body
                if html_body:
                    clean = re.sub(r'<(style|script)[^>]*>.*?</\1>', '', html_body, flags=re.IGNORECASE | re.DOTALL)
                    clean = re.sub(r'<a\s+(?:[^>]*?\s+)?href=["\'](https?://[^"\']+)["\'][^>]*>(.*?)</a>', r'[\2](\1)', clean, flags=re.IGNORECASE)
                    clean = re.sub(r'<br\s*/?>', '\n', clean, flags=re.IGNORECASE)
                    clean = re.sub(r'</(p|div|h[1-6]|tr|li)>', '\n\n', clean, flags=re.IGNORECASE)
                    clean = re.sub(r'<[^>]+>', ' ', clean)
                    clean = html.unescape(clean)
                    clean = re.sub(r' +', ' ', clean)
                    clean = re.sub(r'\n\s*\n', '\n\n', clean).strip()
                    if clean:
                        body = clean

                if not body and not attachments:
                    body = "[Empty Message]"
                    
                # Truncate and Strip quotes
                if len(body) > 60000:
                    body = body[:60000] + "\n\n... [Message Truncated]"

                quote_patterns = [
                    r'(?mi)^On\s+.*wrote:\s*$',
                    r'(?m)^-----Original Message-----\s*$',
                    r'(?m)^_+\s*$',
                    r'(?mi)^\s*On\s+.+<\S+@\S+>\s*wrote:\s*$',
                    r'(?i)\bOn\s+[A-Z][a-z]{2},\s+[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s+(AM|PM)\s+.*wrote:'
                ]
                for pattern in quote_patterns:
                    m = re.search(pattern, body)
                    if m:
                        body = body[:m.start()].strip()
                        break
                body = re.sub(r'(?m)^>.*$\n?', '', body).strip()

                # 1. Route the text message
                if body:
                    await self.handle_incoming_email(
                        db, channel.id, from_email, from_name or "", subject, body, external_id
                    )
                
                # 2. Route attachments as individual messages
                settings = get_settings()
                upload_dir = "/app/uploads"
                os.makedirs(upload_dir, exist_ok=True)
                
                for att in attachments:
                    ext = os.path.splitext(att['filename'])[1]
                    new_filename = f"{uuid.uuid4()}{ext}"
                    local_path = os.path.join(upload_dir, new_filename)
                    
                    with open(local_path, 'wb') as f:
                        f.write(att['data'])
                        
                    url = f"{settings.BASE_URL}/uploads/{new_filename}"
                    msg_type = "image" if att['mimeType'].startswith("image/") else "file"
                    
                    await self.handle_incoming_email(
                        db, channel.id, from_email, from_name or "", subject, url, external_id, message_type=msg_type
                    )
                
                # Mark as read
                service.users().messages().batchModify(
                    userId='me',
                    body={'ids': [msg_id], 'removeLabelIds': ['UNREAD']}
                ).execute()
                
                count += 1
        except Exception as e:
            logger.error(f"Error syncing Gmail messages: {e}")
            
        return count

email_service = EmailService()
