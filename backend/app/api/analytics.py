"""
Analytics API — agent performance and CSAT metrics.
"""

import uuid
from typing import Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.rating import Rating
from app.models.ticket import Ticket
from app.models.ticket_update import TicketUpdate
from app.models.team import Team, TeamMember
from app.models.message import Message

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])


@router.get("/{workspace_id}/agents")
async def get_agent_performance(
    workspace_id: uuid.UUID,
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns per-agent performance stats: resolved count, avg rating, avg response time.
    """
    since = datetime.now() - timedelta(days=days)

    # 1. Get all agents in workspace with resolved ticket counts
    agent_stats_query = (
        select(
            Ticket.assigned_user_id,
            func.count(Ticket.id).label("resolved_count"),
            func.avg(func.extract('epoch', Message.created_at - Ticket.created_at)).label("avg_frt")
        )
        .join(Message, Message.conversation_id == Ticket.conversation_id)
        .where(
            Ticket.workspace_id == workspace_id,
            Ticket.status.in_(["resolved", "closed"]),
            Ticket.resolved_at >= since,
            Ticket.assigned_user_id.isnot(None),
            Message.sender_type == "agent"
        )
        .group_by(Ticket.assigned_user_id)
    )
    # We use a subquery approach to get the FIRST agent message for each conversation to calculate FRT correctly
    first_agent_msg_sub = (
        select(
            Message.conversation_id,
            func.min(Message.created_at).label("first_msg_at")
        )
        .where(Message.sender_type == "agent")
        .group_by(Message.conversation_id)
        .subquery()
    )

    agent_stats_query = (
        select(
            Ticket.assigned_user_id,
            func.count(Ticket.id).label("resolved_count"),
            func.avg(func.extract('epoch', first_agent_msg_sub.c.first_msg_at - Ticket.created_at)).label("avg_frt")
        )
        .outerjoin(first_agent_msg_sub, first_agent_msg_sub.c.conversation_id == Ticket.conversation_id)
        .where(
            Ticket.workspace_id == workspace_id,
            Ticket.status.in_(["resolved", "closed"]),
            Ticket.resolved_at >= since,
            Ticket.assigned_user_id.isnot(None),
        )
        .group_by(Ticket.assigned_user_id)
    )

    agent_stats_result = await db.execute(agent_stats_query)
    agent_stats = {
        str(row.assigned_user_id): {
            "resolved_count": row.resolved_count,
            "avg_frt": float(row.avg_frt) if row.avg_frt else None
        } 
        for row in agent_stats_result
    }

    # 2. Get average ratings per agent
    rating_stats_query = (
        select(
            Rating.agent_id,
            func.avg(Rating.score).label("avg_score"),
            func.count(Rating.id).label("rating_count"),
        )
        .where(
            Rating.workspace_id == workspace_id,
            Rating.created_at >= since,
            Rating.rated_entity_type == "agent",
            Rating.agent_id.isnot(None),
        )
        .group_by(Rating.agent_id)
    )
    rating_result = await db.execute(rating_stats_query)
    rating_stats = {
        str(row.agent_id): {
            "avg_score": round(float(row.avg_score), 1) if row.avg_score else None,
            "rating_count": row.rating_count,
        }
        for row in rating_result
    }

    # 3. Get all agent user records in this workspace
    from app.models.workspace import WorkspaceMember
    members_result = await db.execute(
        select(User, WorkspaceMember.role)
        .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
        .where(WorkspaceMember.workspace_id == workspace_id)
    )

    agents = []
    for user, role in members_result:
        uid = str(user.id)
        stats = agent_stats.get(uid, {"resolved_count": 0, "avg_frt": None})
        ratings = rating_stats.get(uid, {"avg_score": None, "rating_count": 0})

        agents.append({
            "id": uid,
            "name": user.full_name or user.email,
            "email": user.email,
            "role": role,
            "resolved_count": stats["resolved_count"],
            "avg_frt": stats["avg_frt"],
            "avg_rating": ratings["avg_score"],
            "rating_count": ratings["rating_count"],
        })

    # Sort by resolved_count desc
    agents.sort(key=lambda a: a["resolved_count"], reverse=True)

    # 4. Summary stats
    total_resolved = sum(a["resolved_count"] for a in agents)
    all_ratings = [a["avg_rating"] for a in agents if a["avg_rating"] is not None]
    overall_avg_rating = round(sum(all_ratings) / len(all_ratings), 1) if all_ratings else None
    
    all_frts = [a["avg_frt"] for a in agents if a["avg_frt"] is not None]
    overall_avg_frt = sum(all_frts) / len(all_frts) if all_frts else None

    # Redefine active agents: Anyone who resolved OR is currently assigned to any open ticket
    active_agents_query = (
        select(func.count(func.distinct(Ticket.assigned_user_id)))
        .where(
            Ticket.workspace_id == workspace_id,
            Ticket.assigned_user_id.isnot(None),
            Ticket.updated_at >= since
        )
    )
    active_agents_res = await db.execute(active_agents_query)
    active_agents_count = active_agents_res.scalar() or 0

    return {
        "summary": {
            "total_resolved": total_resolved,
            "overall_avg_rating": overall_avg_rating,
            "overall_avg_frt": overall_avg_frt,
            "active_agents": active_agents_count,
            "period_days": days,
        },
        "agents": agents,
    }


@router.get("/{workspace_id}/csat")
async def get_csat_metrics(
    workspace_id: uuid.UUID,
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns CSAT trends and score distribution.
    """
    since = datetime.now() - timedelta(days=days)

    # 1. Overall CSAT
    overall_query = (
        select(
            func.avg(Rating.score).label("avg_score"),
            func.count(Rating.id).label("total_ratings"),
        )
        .where(
            Rating.workspace_id == workspace_id,
            Rating.created_at >= since,
        )
    )
    overall_result = await db.execute(overall_query)
    overall = overall_result.first()

    # 2. Score distribution
    dist_query = (
        select(
            Rating.score,
            func.count(Rating.id).label("count"),
        )
        .where(
            Rating.workspace_id == workspace_id,
            Rating.created_at >= since,
        )
        .group_by(Rating.score)
        .order_by(Rating.score)
    )
    dist_result = await db.execute(dist_query)
    distribution = {row.score: row.count for row in dist_result}
    # Fill in missing scores
    score_distribution = [{"score": i, "count": distribution.get(i, 0)} for i in range(1, 6)]

    # 3. Daily trend (last N days)
    daily_query = (
        select(
            func.date(Rating.created_at).label("date"),
            func.avg(Rating.score).label("avg_score"),
            func.count(Rating.id).label("count"),
        )
        .where(
            Rating.workspace_id == workspace_id,
            Rating.created_at >= since,
        )
        .group_by(func.date(Rating.created_at))
        .order_by(func.date(Rating.created_at))
    )
    daily_result = await db.execute(daily_query)
    daily_trend = [
        {
            "date": str(row.date),
            "avg_score": round(float(row.avg_score), 1) if row.avg_score else None,
            "count": row.count,
        }
        for row in daily_result
    ]

    # 4. AI vs Human comparison
    entity_query = (
        select(
            Rating.rated_entity_type,
            func.avg(Rating.score).label("avg_score"),
            func.count(Rating.id).label("count"),
        )
        .where(
            Rating.workspace_id == workspace_id,
            Rating.created_at >= since,
        )
        .group_by(Rating.rated_entity_type)
    )
    entity_result = await db.execute(entity_query)
    entity_comparison = {
        row.rated_entity_type: {
            "avg_score": round(float(row.avg_score), 1) if row.avg_score else None,
            "count": row.count,
        }
        for row in entity_result
    }

    return {
        "summary": {
            "avg_score": round(float(overall.avg_score), 1) if overall.avg_score else None,
            "total_ratings": overall.total_ratings or 0,
            "period_days": days,
        },
        "score_distribution": score_distribution,
        "daily_trend": daily_trend,
        "entity_comparison": entity_comparison,
    }
