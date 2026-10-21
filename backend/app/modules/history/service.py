from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundError
from app.modules.history.schemas import (
    HistoryDetailResponse,
    HistoryItemResponse,
    HistoryListResponse,
)
from app.modules.recommendations.repository import RecommendationRepository
from app.modules.recommendations.service import RecommendationService


class HistoryService:
    """User-owned recommendation audit history.

    Portfolio version history has its own `/portfolios/current/versions` endpoint; this
    endpoint intentionally exposes recommendation history only.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.repository = RecommendationRepository(session)

    async def list(self, *, user_id: uuid.UUID, page: int, page_size: int) -> HistoryListResponse:
        rows, total = await self.repository.list_for_user(
            user_id, offset=(page - 1) * page_size, limit=page_size
        )
        return HistoryListResponse(
            items=[
                HistoryItemResponse(
                    id=recommendation.id,
                    recommendation_type=recommendation.type,
                    status=recommendation.status,
                    regime=regime.code.value,
                    capital=recommendation.capital,
                    generated_at=recommendation.generated_at,
                    confirmed_at=recommendation.confirmed_at,
                )
                for recommendation, regime in rows
            ],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get(self, *, history_id: uuid.UUID, user_id: uuid.UUID) -> HistoryDetailResponse:
        record = await self.repository.get_for_user(history_id, user_id)
        if record is None:
            raise ResourceNotFoundError("Recommendation history record not found")
        return HistoryDetailResponse(recommendation=RecommendationService.to_response(record))
