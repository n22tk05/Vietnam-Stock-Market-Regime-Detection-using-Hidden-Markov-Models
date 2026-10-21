from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import PortfolioStatus
from app.modules.market_regimes.models import MarketRegime
from app.modules.portfolios.models import Portfolio, PortfolioAllocation, PortfolioVersion
from app.modules.stocks.models import Stock


@dataclass(frozen=True, slots=True)
class PortfolioAllocationRecord:
    allocation: PortfolioAllocation
    stock: Stock


@dataclass(frozen=True, slots=True)
class PortfolioRecord:
    portfolio: Portfolio
    version: PortfolioVersion
    regime: MarketRegime
    allocations: tuple[PortfolioAllocationRecord, ...]


class PortfolioRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_active_for_user(
        self, user_id: uuid.UUID, *, for_update: bool = False
    ) -> Portfolio | None:
        statement = select(Portfolio).where(
            Portfolio.user_id == user_id, Portfolio.status == PortfolioStatus.ACTIVE
        )
        if for_update:
            statement = statement.with_for_update(of=Portfolio)
        return cast(Portfolio | None, await self.session.scalar(statement))

    async def get_current_record(self, user_id: uuid.UUID) -> PortfolioRecord | None:
        row = (
            await self.session.execute(
                select(Portfolio, PortfolioVersion, MarketRegime)
                .join(
                    PortfolioVersion,
                    (PortfolioVersion.portfolio_id == Portfolio.id)
                    & (PortfolioVersion.version_number == Portfolio.current_version),
                )
                .join(MarketRegime, MarketRegime.id == PortfolioVersion.regime_id)
                .where(
                    Portfolio.user_id == user_id,
                    Portfolio.status == PortfolioStatus.ACTIVE,
                )
            )
        ).one_or_none()
        if row is None:
            return None
        portfolio, version, regime = row
        allocations = await self._allocation_records(version.id)
        return PortfolioRecord(
            portfolio=portfolio,
            version=version,
            regime=regime,
            allocations=allocations,
        )

    async def get_record_for_recommendation(
        self, recommendation_id: uuid.UUID, user_id: uuid.UUID
    ) -> PortfolioRecord | None:
        row = (
            await self.session.execute(
                select(Portfolio, PortfolioVersion, MarketRegime)
                .join(PortfolioVersion, PortfolioVersion.portfolio_id == Portfolio.id)
                .join(MarketRegime, MarketRegime.id == PortfolioVersion.regime_id)
                .where(
                    Portfolio.user_id == user_id,
                    PortfolioVersion.recommendation_id == recommendation_id,
                )
            )
        ).one_or_none()
        if row is None:
            return None
        portfolio, version, regime = row
        return PortfolioRecord(
            portfolio=portfolio,
            version=version,
            regime=regime,
            allocations=await self._allocation_records(version.id),
        )

    async def list_versions(
        self, portfolio_id: uuid.UUID
    ) -> list[tuple[PortfolioVersion, MarketRegime]]:
        rows = (
            await self.session.execute(
                select(PortfolioVersion, MarketRegime)
                .join(MarketRegime, MarketRegime.id == PortfolioVersion.regime_id)
                .where(PortfolioVersion.portfolio_id == portfolio_id)
                .order_by(PortfolioVersion.version_number.desc())
            )
        ).all()
        return [(row[0], row[1]) for row in rows]

    async def add_portfolio(self, portfolio: Portfolio) -> Portfolio:
        self.session.add(portfolio)
        await self.session.flush()
        return portfolio

    async def add_version(self, version: PortfolioVersion) -> PortfolioVersion:
        self.session.add(version)
        await self.session.flush()
        return version

    async def add_allocations(self, allocations: list[PortfolioAllocation]) -> None:
        self.session.add_all(allocations)
        await self.session.flush()

    async def _allocation_records(
        self, version_id: uuid.UUID
    ) -> tuple[PortfolioAllocationRecord, ...]:
        rows = (
            await self.session.execute(
                select(PortfolioAllocation, Stock)
                .join(Stock, Stock.id == PortfolioAllocation.stock_id)
                .where(PortfolioAllocation.portfolio_version_id == version_id)
                .order_by(PortfolioAllocation.weight.desc(), Stock.symbol)
            )
        ).all()
        return tuple(
            PortfolioAllocationRecord(allocation=allocation, stock=stock)
            for allocation, stock in rows
        )
