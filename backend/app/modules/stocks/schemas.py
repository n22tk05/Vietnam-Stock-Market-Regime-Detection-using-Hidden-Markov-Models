from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import Any, Literal

from pydantic import Field

from app.core.responses import ApiModel

HistoryRange = Literal["1m", "3m", "6m", "1y", "3y", "5y", "max"]
HistoryInterval = Literal["1d", "1wk", "1mo"]


class StockFeatureView(ApiModel):
    feature_date: date
    log_return: Decimal | None = None
    return_5d: Decimal | None = None
    return_20d: Decimal | None = None
    volume_ratio: Decimal | None = None
    volatility_20d: Decimal | None = None
    sharpe_ratio: Decimal | None = None
    reference_price: Decimal | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class StockView(ApiModel):
    id: uuid.UUID
    symbol: str
    company_name: str
    exchange: str
    sector: str | None = None
    industry: str | None = None
    is_active: bool
    latest_features: StockFeatureView | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class StockPricePoint(ApiModel):
    trade_date: date
    open_price: Decimal
    high_price: Decimal
    low_price: Decimal
    close_price: Decimal
    volume: int = Field(ge=0)


class StockHistoryView(ApiModel):
    symbol: str
    interval: HistoryInterval
    start_date: date | None
    end_date: date | None
    source: str
    prices: list[StockPricePoint]


class StockCatalogSyncResult(ApiModel):
    data_date: date
    securities_seen: int
    records_changed: int
