"""
Auth service — business logic for registration, login, OAuth, and token refresh.
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User

settings = get_settings()


class AuthError(Exception):
    """Raised when an auth operation fails."""

    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code


def _build_tokens(user_id: str) -> dict[str, str]:
    """Create access + refresh token pair for a user."""
    return {
        "access_token": create_access_token({"sub": user_id}),
        "refresh_token": create_refresh_token({"sub": user_id}),
    }


async def register(
    db: AsyncSession,
    email: str,
    password: str,
    full_name: str,
) -> tuple[User, dict[str, str]]:
    """Register a new user with email and password."""
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise AuthError("Email already registered", status_code=409)

    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
    )
    db.add(user)
    await db.flush()

    tokens = _build_tokens(str(user.id))
    return user, tokens


async def login(
    db: AsyncSession,
    email: str,
    password: str,
) -> tuple[User, dict[str, str]]:
    """Authenticate a user with email and password."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise AuthError("Invalid email or password", status_code=401)

    if not verify_password(password, user.hashed_password):
        raise AuthError("Invalid email or password", status_code=401)

    if not user.is_active:
        raise AuthError("Account is disabled", status_code=403)

    tokens = _build_tokens(str(user.id))
    return user, tokens


async def oauth_login(
    db: AsyncSession,
    provider: str,
    oauth_id: str,
    email: str,
    full_name: str,
    avatar_url: str | None = None,
) -> tuple[User, dict[str, str]]:
    """Login or register a user via OAuth provider."""
    # Try to find existing OAuth user
    result = await db.execute(
        select(User).where(User.oauth_provider == provider, User.oauth_id == oauth_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        # Check if email already exists (link accounts)
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            # Link OAuth to existing account
            user.oauth_provider = provider
            user.oauth_id = oauth_id
            if avatar_url:
                user.avatar_url = avatar_url
        else:
            # Create new user
            user = User(
                email=email,
                full_name=full_name,
                oauth_provider=provider,
                oauth_id=oauth_id,
                avatar_url=avatar_url,
            )
            db.add(user)

    await db.flush()
    tokens = _build_tokens(str(user.id))
    return user, tokens


async def refresh(
    db: AsyncSession,
    refresh_token_str: str,
) -> dict[str, str]:
    """Validate a refresh token and issue new token pair."""
    payload = decode_access_token(refresh_token_str)
    if payload is None or payload.get("type") != "refresh":
        raise AuthError("Invalid refresh token", status_code=401)

    user_id = payload.get("sub")
    if not user_id:
        raise AuthError("Invalid refresh token", status_code=401)

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise AuthError("User not found or disabled", status_code=401)

    return _build_tokens(str(user.id))
