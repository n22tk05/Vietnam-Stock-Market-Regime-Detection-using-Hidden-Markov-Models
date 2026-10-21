from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import Field

from app.common.enums import PortfolioChangeType, PortfolioStatus
from app.core.responses import ApiModel


class PortfolioAllocationResponse(ApiModel):
    id: uuid.UUID
    stock_id: uuid.UUID
    symbol: str
    company_name: str
    weight: Decimal
    invested_amount: Decimal
    entry_price: Decimal
    estimated_quantity: Decimal


class PortfolioVersionResponse(ApiModel):
    id: uuid.UUID
    recommendation_id: uuid.UUID | None = None
    version_number: int
    change_type: PortfolioChangeType
    regime_id: uuid.UUID
    regime: str
    total_value: Decimal
    cash_weight: Decimal
    cash_amount: Decimal
    effective_at: datetime
    allocations: list[PortfolioAllocationResponse] = Field(default_factory=list)


class PortfolioResponse(ApiModel):
    id: uuid.UUID
    name: str
    status: PortfolioStatus
    current_version: int
    initial_capital: Decimal
    current_value: Decimal
    confirmed_at: datetime
    created_at: datetime
    updated_at: datetime
    version: PortfolioVersionResponse
    disclaimer: str = "Simulated portfolio; quantities and values are estimates, not real holdings."


class PortfolioVersionSummaryResponse(ApiModel):
    id: uuid.UUID
    recommendation_id: uuid.UUID | None = None
    version_number: int
    change_type: PortfolioChangeType
    regime: str
    total_value: Decimal
    cash_weight: Decimal
    effective_at: datetime


class PortfolioVersionsResponse(ApiModel):
    items: list[PortfolioVersionSummaryResponse]


class PortfolioPositionPerformance(ApiModel):
    symbol: str
    estimated_quantity: Decimal
    entry_price: Decimal
    current_reference_price: Decimal | None = None
    invested_amount: Decimal
    estimated_value: Decimal | None = None
    profit_loss: Decimal | None = None
    pnl_percent: Decimal | None = None


class PortfolioPerformanceResponse(ApiModel):
    portfolio_id: uuid.UUID
    as_of_date: date
    initial_capital: Decimal
    estimated_total_value: Decimal
    cash_amount: Decimal
    profit_loss: Decimal
    pnl_percent: Decimal
    positions: list[PortfolioPositionPerformance]
    missing_symbols: list[str]
    data_source: str
    disclaimer: str = "Reference-price simulation only; no order or trade has been executed."
