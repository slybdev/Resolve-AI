# SQLAlchemy models — one file per domain.
# Engineers: export your models here for cross-domain imports.

# Engineer A models (Milestone 1)
from app.models.invite import Invite  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.workspace import Workspace, WorkspaceMember  # noqa: F401
from app.models.ai_configuration import AIConfiguration  # noqa: F401

# Engineer A models (Milestone 2)
from app.models.conversation import Conversation  # noqa: F401
from app.models.message import Message  # noqa: F401

# Engineer B models (Milestone 1)
from app.models.contact import Contact  # noqa: F401
from app.models.company import Company  # noqa: F401
from app.models.tag import Tag  # noqa: F401
from app.models.business_hours import BusinessHours  # noqa: F401
from app.models.api_key import APIKey  # noqa: F401

# Engineer B models (Milestone 2)
from app.models.channel import Channel  # noqa: F401

# Knowledge & Training models
from app.models.knowledge import KnowledgeSource, KnowledgeDocument, Folder  # noqa: F401

# Engineer B - Automation & Workflows
from app.models.automation import AutomationRule  # noqa: F401
from app.models.macro import Macro  # noqa: F401
from app.models.workflow import Workflow  # noqa: F401
from app.models.campaign import Campaign  # noqa: F401
from app.models.automation_log import AutomationLog  # noqa: F401
from app.models.escalation import EscalationRule  # noqa: F401

# BlackVault Ticketing System 🎯
from app.models.team import Team, TeamMember  # noqa: F401
from app.models.ticket import Ticket  # noqa: F401
from app.models.ticket_update import TicketUpdate  # noqa: F401
from app.models.ticket_tag import TicketTag  # noqa: F401
from app.models.sla_policy import SLAPolicy, TicketSLATracking  # noqa: F401

# Ratings & Analytics
from app.models.rating import Rating  # noqa: F401

# Identity & Engagement
from app.models.visitor_session import VisitorSession  # noqa: F401
