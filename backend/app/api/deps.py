"""
Route-level dependencies.

Place dependencies that are specific to API routes here
(e.g., pagination params, filtering, sorting).
Shared dependencies (get_db, get_current_user) live in core/dependencies.py.
"""

from fastapi import Query


def pagination_params(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> dict:
    """Common pagination query parameters."""
    return {"page": page, "size": size, "offset": (page - 1) * size}
