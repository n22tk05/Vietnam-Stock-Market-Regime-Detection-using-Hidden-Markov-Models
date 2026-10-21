from __future__ import annotations

from datetime import date

from app.integrations.market_data.base import MarketDataProvider, MarketSnapshot


class FakeMarketDataProvider(MarketDataProvider):
    """In-memory market-data source for service and API tests."""

    def __init__(
        self,
        snapshot: MarketSnapshot,
        histories: dict[str, list[dict[str, object]]] | None = None,
    ) -> None:
        self.snapshot = snapshot
        self.histories = histories or {}

    async def latest_snapshot(self) -> MarketSnapshot:
        return self.snapshot.model_copy(deep=True)

    async def stock_history(
        self, symbol: str, *, start_date: date | None, end_date: date | None
    ) -> list[dict[str, object]]:
        rows = self.histories.get(symbol.upper(), [])
        selected: list[dict[str, object]] = []
        for row in rows:
            trade_date = row.get("tradeDate")
            if not isinstance(trade_date, date):
                continue
            if start_date is not None and trade_date < start_date:
                continue
            if end_date is not None and trade_date > end_date:
                continue
            selected.append(dict(row))
        return selected
