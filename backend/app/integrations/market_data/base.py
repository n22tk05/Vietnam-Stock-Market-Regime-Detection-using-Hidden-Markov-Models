from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from decimal import Decimal

from pydantic import Field

from app.core.responses import ApiModel


class MarketSecuritySnapshot(ApiModel):
    symbol: str
    company_name: str
    exchange: str = "HOSE"
    sector: str | None = None
    reference_price: Decimal
    daily_return: Decimal = Decimal("0")
    volatility_20d: Decimal = Decimal("0")
    momentum_20d: Decimal = Decimal("0")
    momentum_5d: Decimal = Decimal("0")
    volume_ratio: Decimal = Decimal("0")
    sharpe_ratio: Decimal = Decimal("0")
    metadata: dict[str, object] = Field(default_factory=dict)


class MarketSnapshot(ApiModel):
    data_date: date
    securities: list[MarketSecuritySnapshot]
    source: str
    metadata: dict[str, object] = Field(default_factory=dict)


class MarketDataProvider(ABC):
    @abstractmethod
    async def latest_snapshot(self) -> MarketSnapshot:
        raise NotImplementedError

    @abstractmethod
    async def stock_history(
        self, symbol: str, *, start_date: date | None, end_date: date | None
    ) -> list[dict[str, object]]:
        raise NotImplementedError
