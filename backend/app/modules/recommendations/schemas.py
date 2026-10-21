from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import Field

from app.common.enums import (
    InvestmentHorizon,
    RecommendationStatus,
    RecommendationType,
    RiskAppetite,
)
from app.core.responses import ApiModel


class RecommendationCreateRequest(ApiModel):
    type: RecommendationType = RecommendationType.INITIAL


class RecommendationAllocationResponse(ApiModel):
    id: uuid.UUID
    stock_id: uuid.UUID
    symbol: str
    company_name: str
    exchange: str
    sector: str | None = None
    weight: Decimal
    amount: Decimal
    reference_price: Decimal
    quantity_estimated: Decimal
    reason: str
    rank: int


class RecommendationResponse(ApiModel):
    id: uuid.UUID
    investment_profile_id: uuid.UUID
    regime_id: uuid.UUID
    regime: str
    type: RecommendationType
    status: RecommendationStatus
    capital: Decimal
    risk_appetite: RiskAppetite
    investment_horizon: InvestmentHorizon
    hmm_model_version: str | None = None
    portfolio_model_version: str
    total_weight: Decimal
    cash_weight: Decimal
    cash_amount: Decimal
    explanation: str
    expires_at: datetime
    generated_at: datetime
    confirmed_at: datetime | None = None
    allocations: list[RecommendationAllocationResponse] = Field(default_factory=list)
    disclaimer: str = "Estimated allocation for simulation and decision support only."


class RecommendationSummaryResponse(ApiModel):
    id: uuid.UUID
    regime: str
    type: RecommendationType
    status: RecommendationStatus
    capital: Decimal
    cash_weight: Decimal
    generated_at: datetime
    expires_at: datetime
    confirmed_at: datetime | None = None


class RecommendationListResponse(ApiModel):
    items: list[RecommendationSummaryResponse]
    total: int
    page: int
    page_size: int
