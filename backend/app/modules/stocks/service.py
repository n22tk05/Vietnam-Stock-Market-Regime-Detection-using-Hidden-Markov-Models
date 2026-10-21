from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.utils import normalize_symbol
from app.core.exceptions import AppError, ConflictError, ResourceNotFoundError
from app.integrations.market_data.base import MarketDataProvider
from app.modules.stocks.models import Stock, StockFeature
from app.modules.stocks.repository import StockRepository
from app.modules.stocks.schemas import (
    HistoryInterval,
    HistoryRange,
    StockCatalogSyncResult,
    StockFeatureView,
    StockHistoryView,
    StockPricePoint,
    StockView,
)


class InvalidStockHistoryRangeError(AppError):
    status_code = 422
    code = "INVALID_STOCK_HISTORY_RANGE"


class StockService:
    def __init__(self, session: AsyncSession, provider: MarketDataProvider) -> None:
        self.session = session
        self.provider = provider
        self.repository = StockRepository(session)

    async def list_stocks(
        self,
        *,
        offset: int,
        limit: int,
        search: str | None,
        exchange: str | None,
        sector: str | None,
    ) -> tuple[list[StockView], int]:
        await self.ensure_catalog()
        rows: Sequence[Stock] = await self.repository.list_stocks(
            offset=offset,
            limit=limit,
            search=search,
            exchange=exchange,
            sector=sector,
        )
        features = await self.repository.latest_features([row.id for row in rows])
        total = await self.repository.count(search=search, exchange=exchange, sector=sector)
        return [self._to_view(row, features.get(row.id)) for row in rows], total

    async def get_stock(self, symbol: str) -> StockView:
        normalized = self._normalize_symbol(symbol)
        await self.ensure_catalog()
        stock = await self.repository.get_by_symbol(normalized)
        if stock is None:
            # The artifact may have changed since the initial catalog import.
            await self.synchronize_catalog()
            stock = await self.repository.get_by_symbol(normalized)
        if stock is None:
            raise ResourceNotFoundError(f"Stock {normalized} was not found")
        feature = (await self.repository.latest_features([stock.id])).get(stock.id)
        return self._to_view(stock, feature)

    async def get_history(
        self,
        symbol: str,
        *,
        range_value: HistoryRange,
        interval: HistoryInterval,
        start_date: date | None,
        end_date: date | None,
    ) -> StockHistoryView:
        normalized = self._normalize_symbol(symbol)
        await self.get_stock(normalized)
        if start_date is not None and end_date is not None and start_date > end_date:
            raise InvalidStockHistoryRangeError("start_date must not be after end_date")

        effective_end = end_date or datetime.now(UTC).date()
        effective_start = start_date
        if effective_start is None and range_value != "max":
            effective_start = self._range_start(effective_end, range_value)

        raw_rows = await self.provider.stock_history(
            normalized, start_date=effective_start, end_date=effective_end
        )
        points = [self._parse_price(row) for row in raw_rows]
        if interval != "1d":
            points = self._aggregate(points, interval)
        return StockHistoryView(
            symbol=normalized,
            interval=interval,
            start_date=effective_start,
            end_date=effective_end,
            source="ai_core/output/hmm_model/master_ticker_hmm_results.csv",
            prices=points,
        )

    async def ensure_catalog(self) -> None:
        if await self.repository.count(active_only=False) == 0:
            await self.synchronize_catalog()

    async def synchronize_catalog(self) -> StockCatalogSyncResult:
        snapshot = await self.provider.latest_snapshot()
        try:
            changed = await self.repository.upsert_snapshot(snapshot)
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            if await self.repository.count(active_only=False) == 0:
                raise ConflictError("Stock catalog synchronization conflicted") from exc
            changed = 0
        return StockCatalogSyncResult(
            data_date=snapshot.data_date,
            securities_seen=len(snapshot.securities),
            records_changed=changed,
        )

    @staticmethod
    def _normalize_symbol(symbol: str) -> str:
        try:
            return normalize_symbol(symbol)
        except ValueError as exc:
            raise ResourceNotFoundError("Stock symbol is invalid") from exc

    @staticmethod
    def _to_view(stock: Stock, feature: StockFeature | None) -> StockView:
        feature_view: StockFeatureView | None = None
        if feature is not None:
            feature_data = feature.feature_data or {}
            reference_raw = feature_data.get("referencePrice")
            reference_price = Decimal(str(reference_raw)) if reference_raw is not None else None
            feature_view = StockFeatureView(
                feature_date=feature.feature_date,
                log_return=feature.log_return,
                return_5d=feature.return_5d,
                return_20d=feature.return_20d,
                volume_ratio=feature.volume_ratio,
                volatility_20d=feature.volatility_20d,
                sharpe_ratio=feature.sharpe_ratio,
                reference_price=reference_price,
                metadata={
                    key: value for key, value in feature_data.items() if key != "referencePrice"
                },
            )
        return StockView(
            id=stock.id,
            symbol=stock.symbol,
            company_name=stock.company_name,
            exchange=stock.exchange,
            sector=stock.sector,
            industry=stock.industry,
            is_active=stock.is_active,
            latest_features=feature_view,
            metadata={
                "companyNameSource": (
                    "ticker_symbol_placeholder"
                    if stock.company_name == stock.symbol
                    else "database"
                ),
                "exchangeSource": (
                    "unavailable_in_ai_artifact" if stock.exchange == "UNKNOWN" else "database"
                ),
            },
        )

    @staticmethod
    def _parse_price(row: dict[str, object]) -> StockPricePoint:
        return StockPricePoint(
            trade_date=date.fromisoformat(str(row["tradeDate"])),
            open_price=Decimal(str(row["openPrice"])),
            high_price=Decimal(str(row["highPrice"])),
            low_price=Decimal(str(row["lowPrice"])),
            close_price=Decimal(str(row["closePrice"])),
            volume=int(str(row["volume"])),
        )

    @classmethod
    def _aggregate(
        cls, points: list[StockPricePoint], interval: HistoryInterval
    ) -> list[StockPricePoint]:
        groups: dict[tuple[int, int], list[StockPricePoint]] = {}
        for point in points:
            if interval == "1wk":
                calendar = point.trade_date.isocalendar()
                key = (calendar.year, calendar.week)
            else:
                key = (point.trade_date.year, point.trade_date.month)
            groups.setdefault(key, []).append(point)

        aggregated: list[StockPricePoint] = []
        for group in groups.values():
            ordered = sorted(group, key=lambda item: item.trade_date)
            aggregated.append(
                StockPricePoint(
                    trade_date=ordered[-1].trade_date,
                    open_price=ordered[0].open_price,
                    high_price=max(item.high_price for item in ordered),
                    low_price=min(item.low_price for item in ordered),
                    close_price=ordered[-1].close_price,
                    volume=sum(item.volume for item in ordered),
                )
            )
        return aggregated

    @classmethod
    def _range_start(cls, end_date: date, range_value: HistoryRange) -> date:
        months = {"1m": 1, "3m": 3, "6m": 6, "1y": 12, "3y": 36, "5y": 60}
        month_count = months[range_value]
        year = end_date.year
        month = end_date.month - month_count
        while month <= 0:
            month += 12
            year -= 1
        # Avoid an extra dependency solely for calendar-aware subtraction.
        candidate = end_date.replace(year=year, month=month, day=1)
        next_month = candidate.replace(day=28) + timedelta(days=4)
        last_day = (next_month - timedelta(days=next_month.day)).day
        return candidate.replace(day=min(end_date.day, last_day))
