"""
Shared response schemas used across all API routes.
"""

from typing import Generic, List, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ResponseBase(BaseModel):
    """Standard API response wrapper."""

    success: bool = True
    message: str = "OK"


class ErrorResponse(BaseModel):
    """Error response body."""

    detail: str


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper.

    Usage:
        PaginatedResponse[UserSchema](items=[...], total=100, page=1, size=20)
    """

    items: List[T]
    total: int
    page: int
    size: int

    @property
    def pages(self) -> int:
        """Total number of pages."""
        return (self.total + self.size - 1) // self.size if self.size else 0

    @property
    def has_next(self) -> bool:
        return self.page < self.pages

    @property
    def has_prev(self) -> bool:
        return self.page > 1
