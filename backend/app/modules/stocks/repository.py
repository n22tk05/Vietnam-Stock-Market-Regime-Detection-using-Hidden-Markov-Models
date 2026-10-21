from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.market_data.base import MarketSnapshot
from app.modules.stocks.models import Stock, StockFeature

_STOCK_SYNC_ADVISORY_LOCK = 4_283_771_002


class StockRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def acquire_sync_lock(self) -> None:
        bind = self.session.get_bind()
        if bind.dialect.name == "postgresql":
            await self.session.execute(
                select(func.pg_advisory_xact_lock(_STOCK_SYNC_ADVISORY_LOCK))
            )

    async def count(
        self,
        *,
        search: str | None = None,
        exchange: str | None = None,
        sector: str | None = None,
        active_only: bool = True,
    ) -> int:
        statement = select(func.count()).select_from(Stock)
        statement = self._apply_filters(
            statement,
            search=search,
            exchange=exchange,
            sector=sector,
            active_only=active_only,
        )
        return int(await self.session.scalar(statement) or 0)

    async def list_stocks(
        self,
        *,
        offset: int,
        limit: int,
        search: str | None = None,
        exchange: str | None = None,
        sector: str | None = None,
        active_only: bool = True,
    ) -> Sequence[Stock]:
        statement = self._apply_filters(
            select(Stock),
            search=search,
            exchange=exchange,
            sector=sector,
            active_only=active_only,
        )
        statement = statement.order_by(Stock.symbol).offset(offset).limit(limit)
        return (await self.session.scalars(statement)).all()

    async def get_by_symbol(self, symbol: str) -> Stock | None:
        statement = select(Stock).where(Stock.symbol == symbol)
        return (await self.session.scalars(statement)).first()

    async def latest_features(
        self, stock_ids: Sequence[uuid.UUID]
    ) -> dict[uuid.UUID, StockFeature]:
        if not stock_ids:
            return {}
        ranked = (
            select(
                StockFeature.id.label("feature_id"),
                func.row_number()
                .over(
                    partition_by=StockFeature.stock_id,
                    order_by=(StockFeature.feature_date.desc(), StockFeature.created_at.desc()),
                )
                .label("row_number"),
            )
            .where(StockFeature.stock_id.in_(stock_ids))
            .subquery()
        )
        statement = (
            select(StockFeature)
            .join(ranked, ranked.c.feature_id == StockFeature.id)
            .where(ranked.c.row_number == 1)
        )
        rows = (await self.session.scalars(statement)).all()
        return {row.stock_id: row for row in rows}

    async def upsert_snapshot(self, snapshot: MarketSnapshot) -> int:
        await self.acquire_sync_lock()
        symbols = [security.symbol for security in snapshot.securities]
        stocks = (await self.session.scalars(select(Stock).where(Stock.symbol.in_(symbols)))).all()
        by_symbol = {stock.symbol: stock for stock in stocks}
        changed = 0

        for security in snapshot.securities:
            stock = by_symbol.get(security.symbol)
            # The source has ticker and industry, but no legal name or
            # exchange.  Do not present DTO defaults as verified facts.
            company_name = (
                stock.company_name
                if stock is not None and stock.company_name != stock.symbol
                else security.symbol
            )
            exchange = stock.exchange if stock is not None else "UNKNOWN"
            if stock is None:
                stock = Stock(
                    symbol=security.symbol,
                    company_name=company_name,
                    exchange=exchange,
                    sector=security.sector,
                    industry=security.sector,
                    is_active=True,
                )
                self.session.add(stock)
                by_symbol[security.symbol] = stock
                changed += 1
            else:
                changed += self._update_stock(
                    stock,
                    company_name,
                    exchange,
                    security.sector,
                )

        await self.session.flush()
        stock_ids = [by_symbol[symbol].id for symbol in symbols]
        existing_features = (
            await self.session.scalars(
                select(StockFeature).where(
                    StockFeature.stock_id.in_(stock_ids),
                    StockFeature.feature_date == snapshot.data_date,
                )
            )
        ).all()
        feature_by_stock_id = {feature.stock_id: feature for feature in existing_features}

        for security in snapshot.securities:
            stock = by_symbol[security.symbol]
            values: dict[str, object] = {
                "log_return": security.daily_return,
                "return_5d": security.momentum_5d,
                "return_20d": security.momentum_20d,
                "volume_ratio": security.volume_ratio,
                "daily_return": security.daily_return,
                "volatility_20d": security.volatility_20d,
                "momentum_20d": security.momentum_20d,
                "sharpe_ratio": security.sharpe_ratio,
                "feature_data": {
                    "referencePrice": str(security.reference_price),
                    "source": snapshot.source,
                    "providerMetadata": security.metadata,
                },
            }
            feature = feature_by_stock_id.get(stock.id)
            if feature is None:
                self.session.add(
                    StockFeature(
                        stock_id=stock.id,
                        feature_date=snapshot.data_date,
                        **values,
                    )
                )
                changed += 1
                continue
            if self._update_feature(feature, values):
                changed += 1

        await self.session.flush()
        return changed

    @staticmethod
    def _update_stock(stock: Stock, company_name: str, exchange: str, sector: str | None) -> int:
        changed = False
        values: dict[str, str | None | bool] = {
            "company_name": company_name,
            "exchange": exchange,
            "sector": sector,
            "industry": sector,
            "is_active": True,
        }
        for attribute, value in values.items():
            if getattr(stock, attribute) != value:
                setattr(stock, attribute, value)
                changed = True
        return int(changed)

    @staticmethod
    def _update_feature(feature: StockFeature, values: dict[str, object]) -> bool:
        changed = False
        for attribute, value in values.items():
            if getattr(feature, attribute) != value:
                setattr(feature, attribute, value)
                changed = True
        return changed

    @staticmethod
    def _apply_filters(
        statement: Select[Any],
        *,
        search: str | None,
        exchange: str | None,
        sector: str | None,
        active_only: bool,
    ) -> Select[Any]:
        if active_only:
            statement = statement.where(Stock.is_active.is_(True))
        if search:
            pattern = f"%{search.strip()}%"
            statement = statement.where(
                or_(Stock.symbol.ilike(pattern), Stock.company_name.ilike(pattern))
            )
        if exchange:
            statement = statement.where(Stock.exchange == exchange.upper())
        if sector:
            statement = statement.where(Stock.sector == sector)
        return statement
