import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_current_user
from app.core import security
from app.models.user import User

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])

@router.get("/ws-token")
async def get_dashboard_ws_token(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a secure, short-lived JWT for the Agent Dashboard WebSocket.
    The agent must be authenticated via their standard session token.
    """
    # Simple check: In a full multi-tenant system, we'd verify the UserWorkspace link here.
    # For now, we allow the request if the user is authenticated.
    
    token = security.create_dashboard_ws_token(
        user_id=str(current_user.id),
        workspace_id=str(workspace_id)
    )
    
    return {
        "token": token,
        "expires_in": 3600 # 60 minutes
    }
