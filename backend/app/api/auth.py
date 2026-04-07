"""
Auth API routes — /api/v1/auth
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    OAuthRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service
from app.services import invite_service

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user with email and password."""
    try:
        user, tokens = await auth_service.register(
            db, email=body.email, password=body.password, full_name=body.full_name
        )
        # If an invite_token was provided, accept it atomically after registration
        if body.invite_token:
            try:
                await invite_service.accept_invite(db, token=body.invite_token, user=user)
            except invite_service.InviteError:
                pass  # Don't fail registration if invite acceptance fails
        return AuthResponse(
            user=UserResponse.model_validate(user),
            tokens=TokenResponse(**tokens),
        )
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email and password."""
    try:
        user, tokens = await auth_service.login(
            db, email=body.email, password=body.password
        )
        return AuthResponse(
            user=UserResponse.model_validate(user),
            tokens=TokenResponse(**tokens),
        )
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post("/oauth/{provider}", response_model=AuthResponse)
async def oauth_login(
    provider: str, body: OAuthRequest, db: AsyncSession = Depends(get_db)
):
    """Login or register via OAuth provider (google, microsoft).

    The frontend sends the OAuth access_token obtained from the provider.
    In production this would verify the token with the provider's API.
    """
    # In production: validate the token with the provider and extract user info.
    # For now, we accept the token and provider info directly.
    try:
        user, tokens = await auth_service.oauth_login(
            db,
            provider=provider,
            oauth_id=body.access_token[:32],  # placeholder: use provider API in prod
            email=f"{body.access_token[:8]}@oauth.placeholder",
            full_name="OAuth User",
        )
        return AuthResponse(
            user=UserResponse.model_validate(user),
            tokens=TokenResponse(**tokens),
        )
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a refresh token for a new access + refresh token pair."""
    try:
        tokens = await auth_service.refresh(db, refresh_token_str=body.refresh_token)
        return TokenResponse(**tokens)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return current_user
