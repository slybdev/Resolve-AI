"""
Tests for auth endpoints: register, login, refresh.
"""

import pytest


@pytest.mark.asyncio
async def test_register_success(client):
    """POST /api/v1/auth/register creates a user and returns tokens."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "securepass123",
            "full_name": "New User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "newuser@example.com"
    assert data["user"]["full_name"] == "New User"
    assert "access_token" in data["tokens"]
    assert "refresh_token" in data["tokens"]
    assert data["tokens"]["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    """POST /api/v1/auth/register with existing email returns 409."""
    payload = {
        "email": "dup@example.com",
        "password": "securepass123",
        "full_name": "First User",
    }
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_invalid_password(client):
    """POST /api/v1/auth/register with short password returns 422."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "short@example.com",
            "password": "short",
            "full_name": "User",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client):
    """POST /api/v1/auth/login with valid credentials returns tokens."""
    # Register first
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "loginuser@example.com",
            "password": "securepass123",
            "full_name": "Login User",
        },
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "loginuser@example.com", "password": "securepass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == "loginuser@example.com"
    assert "access_token" in data["tokens"]


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    """POST /api/v1/auth/login with wrong password returns 401."""
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "wrongpw@example.com",
            "password": "securepass123",
            "full_name": "User",
        },
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpw@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_email(client):
    """POST /api/v1/auth/login with unknown email returns 401."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "securepass123"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client):
    """POST /api/v1/auth/refresh returns new token pair."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "refresh@example.com",
            "password": "securepass123",
            "full_name": "Refresh User",
        },
    )
    refresh_token = reg.json()["tokens"]["refresh_token"]

    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_refresh_with_invalid_token(client):
    """POST /api/v1/auth/refresh with invalid token returns 401."""
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid-token"},
    )
    assert response.status_code == 401
