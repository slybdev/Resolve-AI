"""
Shared dependency injection — database sessions and auth.

These are used across all route files via FastAPI's `Depends()`.
"""

from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_async_session

# Reusable security scheme
bearer_scheme = HTTPBearer()


async def get_db(
    session: AsyncSession = Depends(get_async_session),
) -> AsyncSession:  # type: ignore[misc]
    """Provide an async database session to route handlers."""
    yield session  # type: ignore[misc]


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Extract and validate the current user from the JWT bearer token.

    Returns:
        The decoded token payload (contains at minimum {"sub": user_id}).

    Raises:
        HTTPException 401: if the token is missing, invalid, or expired.
    """
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload
