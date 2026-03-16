"""
Smoke test — verifies the app boots and /health responds correctly.
"""

import pytest


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """GET /health should return 200 with {"status": "healthy"}."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
