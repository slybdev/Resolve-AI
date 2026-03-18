# SQLAlchemy models — one file per domain.
# Engineers: export your models here for cross-domain imports.

# Engineer A models (Milestone 1)
from app.models.invite import Invite  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.workspace import Workspace, WorkspaceMember  # noqa: F401

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
