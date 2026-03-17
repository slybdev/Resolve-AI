"""
Auth schemas — request/response models for authentication endpoints.
"""

import uuid

from pydantic import BaseModel, EmailStr, Field


# ── Requests ──


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OAuthRequest(BaseModel):
    provider: str = Field(description="OAuth provider: google or microsoft")
    access_token: str = Field(description="OAuth access token from the provider")


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Responses ──


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    is_active: bool
    avatar_url: str | None = None
    oauth_provider: str | None = None

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserResponse
    tokens: TokenResponse
