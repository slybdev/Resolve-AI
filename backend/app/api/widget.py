"""
Widget API — configuration for the embedded chat widget.
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.models.channel import Channel, ChannelType

router = APIRouter(prefix="/api/v1/widget", tags=["Widget"])

@router.get("/{workspace_id}/config")
async def get_widget_config(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the widget configuration for a specific workspace.
    This is a public-ish endpoint used by the embedded script.
    """
    result = await db.execute(
        select(Channel).where(
            Channel.workspace_id == workspace_id,
            Channel.type == ChannelType.WIDGET,
            Channel.is_active == True
        )
    )
    channel = result.scalar_one_or_none()
    
    if not channel:
        return {
            "workspace_id": str(workspace_id),
            "channel_id": None,
            "settings": {
                "title": "XentralDesk Support",
                "welcome_message": "Hello! How can we help you today?"
            },
            "theme": "dark",
            "primary_color": "#3b82f6"
        }
        
    return {
        "workspace_id": str(workspace_id),
        "channel_id": str(channel.id),
        "settings": channel.config.get("settings", {}),
        "theme": channel.config.get("theme", "light"),
        "primary_color": channel.config.get("primary_color", "#3b82f6")
    }

@router.post("/{workspace_id}/config")
async def save_widget_config(
    workspace_id: uuid.UUID,
    config: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Saves/Updates widget configuration.
    """
    result = await db.execute(
        select(Channel).where(
            Channel.workspace_id == workspace_id,
            Channel.type == ChannelType.WIDGET
        )
    )
    channel = result.scalar_one_or_none()
    
    if not channel:
        # Create a new widget channel if it doesn't exist
        channel = Channel(
            workspace_id=workspace_id,
            name="Website Chat",
            type=ChannelType.WIDGET,
            is_active=True,
            config=config
        )
        db.add(channel)
    else:
        # Update existing config
        # Use a copy to ensure SQLAlchemy detects the change in the JSON field
        new_config = dict(channel.config) if channel.config else {}
        new_config.update(config)
        channel.config = new_config
        
    await db.commit()
    return {"status": "saved"}
