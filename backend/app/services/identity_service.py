import uuid
import logging
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import select, update, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact
from app.models.conversation import Conversation
from app.core.pubsub import pubsub_manager
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.visitor_session import VisitorSession
from app.services.ticket_service import TicketService
from app.schemas.ticket import TicketCreate

logger = logging.getLogger(__name__)

class ComplianceLayer:
    """Handles GDPR-compliant metadata processing."""
    
    @staticmethod
    def anonymize_ip(ip: str) -> str:
        """Strip last octet: 192.168.1.100 -> 192.168.1.0"""
        if not ip:
            return ""
        if ":" in ip: # IPv6
            parts = ip.split(":")
            parts[-1] = "0"
            return ":".join(parts)
        else: # IPv4
            parts = ip.split(".")
            if len(parts) == 4:
                parts[-1] = "0"
                return ".".join(parts)
        return ip

    @staticmethod
    def filter_metadata(metadata: Dict[str, Any], consent_given: bool = False) -> Dict[str, Any]:
        """Filters metadata based on user consent."""
        essential_fields = {"referrer", "page", "session_start"}
        analytics_fields = {"ip_address", "user_agent", "fingerprint", "utm_source", "utm_medium", "utm_campaign"}
        
        filtered = {k: v for k, v in metadata.items() if k in essential_fields}
        
        if consent_given:
            for field in analytics_fields:
                if field in metadata:
                    filtered[field] = metadata[field]
        else:
            # Anonymize IP if present but no consent
            if "ip_address" in metadata:
                filtered["ip_address"] = ComplianceLayer.anonymize_ip(metadata["ip_address"])
                
        return filtered

class IdentityService:
    """Handles contact identification, merging, and session promotion."""

    # Names the LLM fabricates when the customer didn't provide one
    GARBAGE_NAMES = {"user", "unknown", "visitor", "customer", "anonymous", "guest", "n/a", "none", "na", "null"}

    @staticmethod
    def _clean_name(name: Optional[str], email: str) -> str:
        """Returns a real name or falls back to the email prefix."""
        if not name or name.strip().lower() in IdentityService.GARBAGE_NAMES:
            return email.split('@')[0]
        return name.strip()

    def __init__(self, db: AsyncSession):
        self.db = db

    async def identify_contact(
        self,
        conversation_id: uuid.UUID,
        email: str,
        name: Optional[str] = None,
        workspace_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for identifying a visitor.
        Attempts to link the current conversation to an existing contact or create a new one.
        """
        email = email.lower().strip()
        
        # 0. Load Conversation
        conv_res = await self.db.execute(select(Conversation).where(Conversation.id == conversation_id))
        conversation = conv_res.scalar_one_or_none()
        if not conversation:
            return {"status": "error", "message": "Conversation not found"}
        
        w_id = workspace_id or conversation.workspace_id
        
        # 1. Check for existing contact by email
        contact_res = await self.db.execute(
            select(Contact).where(
                Contact.workspace_id == w_id,
                Contact.email == email
            )
        )
        existing_contact = contact_res.scalar_one_or_none()
        
        if existing_contact:
            return await self._merge_or_promote(conversation, existing_contact, name)
        else:
            return await self._create_known_contact(conversation, email, name)

    async def _merge_or_promote(
        self,
        conversation: Conversation,
        existing_contact: Contact,
        name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Case: User identifies as someone we already know."""
        logger.info(f"Merging conversation {conversation.id} with existing contact {existing_contact.id}")
        
        old_contact_id = conversation.contact_id
        visitor_id = conversation.visitor_id
        
        # 1. Update Contact info if name provided or if we can infer from email
        resolved_name = self._clean_name(name, existing_contact.email)
        if not existing_contact.name or existing_contact.name.lower() in self.GARBAGE_NAMES or existing_contact.name == "Visitor":
            existing_contact.name = resolved_name
            
        # 2. Link persistent visitor_id to the known contact if not already linked
        if visitor_id and existing_contact.visitor_id != visitor_id:
            existing_contact.visitor_id = visitor_id
        
        existing_contact.last_seen_at = datetime.now(timezone.utc)
        
        # 3. Promote current conversation
        conversation.contact_id = existing_contact.id
        conversation.identified = True
        conversation.identified_at = datetime.now(timezone.utc)
        
        # 4. RECURSIVE MERGE: Find ALL past anonymous conversations from this same visitor_id
        if visitor_id:
            await self.db.execute(
                update(Conversation)
                .where(
                    and_(
                        Conversation.visitor_id == visitor_id,
                        Conversation.contact_id != existing_contact.id,
                        Conversation.identified == False
                    )
                )
                .values(
                    contact_id=existing_contact.id,
                    identified=True,
                    identified_at=datetime.now(timezone.utc)
                )
            )
            
            # Update sessions too
            await self.db.execute(
                update(VisitorSession)
                .where(and_(VisitorSession.visitor_id == visitor_id, VisitorSession.contact_id == None))
                .values(contact_id=existing_contact.id, identified_at=datetime.now(timezone.utc))
            )

        await self.db.commit()
        
        # 5. Broadcast update to Dashboard (Ironclad Sidebar Sync)
        await pubsub_manager.publish(f"ws:{conversation.workspace_id}", {
            "type": "conversation.updated",
            "conversation_id": str(conversation.id),
            "identified": True,
            "customerName": resolved_name,
            "customerEmail": existing_contact.email,
            "contact_id": str(existing_contact.id),
            "refresh_sidebar": True # Force sidebar list refresh
        })

        # 6. Check for pending escalations
        await self._handle_pending_escalations(conversation)

        return {"status": "merged", "contact_id": str(existing_contact.id), "is_new": False}

    async def _create_known_contact(
        self,
        conversation: Conversation,
        email: str,
        name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Case: User provides email but they are new to our system."""
        logger.info(f"Promoting visitor to known contact: {email}")
        
        # We can either create a new contact OR promote the existing anonymous contact
        # Best approach: If conv already has a contact, just update it.
        contact_id = conversation.contact_id
        if contact_id:
             cont_res = await self.db.execute(select(Contact).where(Contact.id == contact_id))
             contact = cont_res.scalar_one_or_none()
             if contact:
                 contact.email = email
                 if not contact.name or contact.name.lower() in self.GARBAGE_NAMES or contact.name == "Visitor":
                      contact.name = self._clean_name(name, email)
                 contact.identified_at = datetime.now(timezone.utc)
                 
                 conversation.identified = True
                 conversation.identified_at = datetime.now(timezone.utc)
                 
                 await self.db.commit()
                 
                 # Broadcast update to Dashboard (Ironclad Sidebar Sync)
                 await pubsub_manager.publish(f"ws:{conversation.workspace_id}", {
                     "type": "conversation.updated",
                     "conversation_id": str(conversation.id),
                     "identified": True,
                     "customerName": contact.name,
                     "customerEmail": email,
                     "contact_id": str(contact.id),
                     "refresh_sidebar": True # Force sidebar list refresh
                 })
                 
                 # Check for pending escalations
                 await self._handle_pending_escalations(conversation)
                 
                 return {"status": "identified", "contact_id": str(contact.id), "is_new": False}

        # Fallback: Create new contact
        fallback_name = self._clean_name(name, email)
        new_contact = Contact(
            workspace_id=conversation.workspace_id,
            email=email,
            name=fallback_name,
            visitor_id=conversation.visitor_id,
            first_seen_at=datetime.now(timezone.utc),
            last_seen_at=datetime.now(timezone.utc)
        )
        self.db.add(new_contact)
        await self.db.flush()
        
        conversation.contact_id = new_contact.id
        conversation.identified = True
        conversation.identified_at = datetime.now(timezone.utc)
        
        await self.db.commit()
        
        # Broadcast update to Dashboard
        await pubsub_manager.publish(f"ws:{conversation.workspace_id}", {
            "type": "conversation.updated",
            "conversation_id": str(conversation.id),
            "identified": True,
            "customerName": fallback_name,
            "customerEmail": email,
            "contact_id": str(new_contact.id),
            "refresh_sidebar": True # Ironclad Pulse
        })

        # Check for pending escalations
        await self._handle_pending_escalations(conversation)

        return {"status": "created", "contact_id": str(new_contact.id), "is_new": True}
        
    async def track_session_activity(
        self,
        workspace_id: uuid.UUID,
        visitor_id: str,
        session_id: str,
        metadata: Dict[str, Any],
        contact_id: Optional[uuid.UUID] = None
    ):
        """Updates or creates a visitor session record."""
        stmt = select(VisitorSession).where(
            and_(
                VisitorSession.workspace_id == workspace_id,
                VisitorSession.visitor_id == visitor_id,
                VisitorSession.session_id == session_id
            )
        )
        res = await self.db.execute(stmt)
        session = res.scalar_one_or_none()
        
        if session:
            session.last_seen_at = datetime.now(timezone.utc)
            session.page_views += 1
            if contact_id: session.contact_id = contact_id
        else:
            session = VisitorSession(
                workspace_id=workspace_id,
                visitor_id=visitor_id,
                session_id=session_id,
                contact_id=contact_id,
                fingerprint=metadata.get("fingerprint"),
                ip_address=metadata.get("ip_address"),
                user_agent=metadata.get("user_agent"),
                referrer=metadata.get("referrer"),
                landing_page=metadata.get("page"),
                utm_source=metadata.get("utm_source"),
                utm_medium=metadata.get("utm_medium"),
                utm_campaign=metadata.get("utm_campaign"),
                first_seen_at=datetime.now(timezone.utc),
                last_seen_at=datetime.now(timezone.utc)
            )
            self.db.add(session)
            
        await self.db.commit()
    async def _handle_pending_escalations(self, conversation: Conversation):
        """Checks for and executes any gated ticket creations with ironclad commit logic."""
        if not conversation.pending_ticket_data:
            return

        from app.services.ticket_service import TicketService
        from app.schemas.ticket import TicketCreate
        
        # 1. IRONCLAD DUPLICATE CHECK: Don't create if one already exists
        ex_ticket = await TicketService.get_ticket_by_conversation(self.db, conversation.id)
        if ex_ticket:
            logger.info(f"IdentityService: Ticket already exists for conv {conversation.id}. Skipping duplication.")
            conversation.pending_ticket_data = None
            self.db.add(conversation)
            await self.db.commit()
            return

        try:
            data = conversation.pending_ticket_data
            logger.info(f"IdentityService: RESUMING PENDING ESCALATION for conv {conversation.id}")
            
            # RE-RUN TRIAGE with the FULL conversation history (not stale data)
            # The original triage ran when the user first requested escalation,
            # before they explained their actual issue. Now we have the full context.
            from app.services.ai_service import AIService
            fresh_triage = await AIService.analyze_ticket_triage(
                self.db, conversation.workspace_id, conversation.id
            )
            logger.info(f"IdentityService: Fresh triage result: {fresh_triage}")
            
            # Use fresh triage data, falling back to pending data
            team_id = fresh_triage.get("suggested_team_id") or data.get("assigned_team_id")
            title = fresh_triage.get("suggested_title") or data.get("title", f"Support Request from {conversation.id}")
            summary = fresh_triage.get("summary") or data.get("summary", "AI Escalated Handoff")
            priority = fresh_triage.get("suggested_priority") or data.get("priority", "high")
            
            # Resolve team_id
            if team_id and str(team_id) != "None":
                try:
                    team_id = uuid.UUID(str(team_id))
                except Exception as e:
                    logger.warning(f"IdentityService: Invalid team UUID '{team_id}': {e}")
                    team_id = None
            else:
                team_id = None

            # Priority Sanitization
            raw_priority = str(priority).lower()
            valid_priorities = ["low", "medium", "high", "urgent"]
            priority = raw_priority if raw_priority in valid_priorities else "high"

            ticket_req = TicketCreate(
                conversation_id=conversation.id,
                workspace_id=conversation.workspace_id,
                title=title,
                summary=summary,
                priority=priority,
                status="open",
                assigned_team_id=team_id,
                created_by_ai=data.get("created_by_ai", True)
            )
            
            logger.info(f"IdentityService: Creating ticket via TicketService...")
            ticket = await TicketService.create_ticket(self.db, obj_in=ticket_req, trigger_ai=False)
            
            # Broadcast NEW TICKET to Dashboard
            from app.schemas.ticket import TicketResponse
            broadcast_payload = {
                "type": "ticket.new",
                "workspace_id": str(conversation.workspace_id),
                "ticket": TicketResponse.model_validate(ticket).model_dump()
            }
            await pubsub_manager.publish(f"ws:{conversation.workspace_id}", broadcast_payload)
            
            # Clear the pending data and commit immediately
            conversation.pending_ticket_data = None
            self.db.add(conversation)
            await self.db.commit()

            logger.info(f"IdentityService: SUCCESS. Finalized ticket {ticket.id} for conv {conversation.id}")
            
        except Exception as e:
            logger.error(f"IdentityService: CRITICAL FAILURE in pending ticket creation: {e}", exc_info=True)
            # We don't re-raise as it's a background hook, but we MUST log it.
