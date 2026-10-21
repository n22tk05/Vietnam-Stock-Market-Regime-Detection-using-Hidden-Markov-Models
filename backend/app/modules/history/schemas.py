from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from app.common.enums import RecommendationStatus, RecommendationType
from app.core.responses import ApiModel
from app.modules.recommendations.schemas import RecommendationResponse


class HistoryItemResponse(ApiModel):
    id: uuid.UUID
    record_type: Literal["RECOMMENDATION"] = "RECOMMENDATION"
    recommendation_type: RecommendationType
    status: RecommendationStatus
    regime: str
    capital: Decimal
    generated_at: datetime
    confirmed_at: datetime | None = None


class HistoryListResponse(ApiModel):
    history_scope: Literal["RECOMMENDATION_HISTORY"] = "RECOMMENDATION_HISTORY"
    items: list[HistoryItemResponse]
    total: int
    page: int
    page_size: int


class HistoryDetailResponse(ApiModel):
    history_scope: Literal["RECOMMENDATION_HISTORY"] = "RECOMMENDATION_HISTORY"
    recommendation: RecommendationResponse
