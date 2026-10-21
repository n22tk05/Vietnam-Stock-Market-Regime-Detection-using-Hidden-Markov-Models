from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import RecommendationStatus
from app.modules.market_regimes.models import MarketRegime
from app.modules.recommendations.models import Recommendation, RecommendationAllocation
from app.modules.stocks.models import Stock


@dataclass(frozen=True, slots=True)
class RecommendationAllocationRecord:
    allocation: RecommendationAllocation
    stock: Stock


@dataclass(frozen=True, slots=True)
class RecommendationRecord:
    recommendation: Recommendation
    regime: MarketRegime
    allocations: tuple[RecommendationAllocationRecord, ...]


class RecommendationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_for_user(
        self, recommendation_id: uuid.UUID, user_id: uuid.UUID, *, for_update: bool = False
    ) -> RecommendationRecord | None:
        statement = (
            select(Recommendation, MarketRegime)
            .join(MarketRegime, MarketRegime.id == Recommendation.regime_id)
            .where(Recommendation.id == recommendation_id, Recommendation.user_id == user_id)
        )
        if for_update:
            statement = statement.with_for_update(of=Recommendation)
        row = (await self.session.execute(statement)).one_or_none()
        if row is None:
            return None
        recommendation, regime = row
        allocation_rows = (
            await self.session.execute(
                select(RecommendationAllocation, Stock)
                .join(Stock, Stock.id == RecommendationAllocation.stock_id)
                .where(RecommendationAllocation.recommendation_id == recommendation.id)
                .order_by(RecommendationAllocation.rank)
            )
        ).all()
        return RecommendationRecord(
            recommendation=recommendation,
            regime=regime,
            allocations=tuple(
                RecommendationAllocationRecord(allocation=allocation, stock=stock)
                for allocation, stock in allocation_rows
            ),
        )

    async def list_for_user(
        self, user_id: uuid.UUID, *, offset: int, limit: int
    ) -> tuple[Sequence[tuple[Recommendation, MarketRegime]], int]:
        filters = (Recommendation.user_id == user_id,)
        result_rows = (
            await self.session.execute(
                select(Recommendation, MarketRegime)
                .join(MarketRegime, MarketRegime.id == Recommendation.regime_id)
                .where(*filters)
                .order_by(Recommendation.generated_at.desc(), Recommendation.id.desc())
                .offset(offset)
                .limit(limit)
            )
        ).all()
        rows = [(row[0], row[1]) for row in result_rows]
        total = await self.session.scalar(
            select(func.count()).select_from(Recommendation).where(*filters)
        )
        return rows, int(total or 0)

    async def add(self, recommendation: Recommendation) -> Recommendation:
        self.session.add(recommendation)
        await self.session.flush()
        return recommendation

    async def add_allocations(self, allocations: list[RecommendationAllocation]) -> None:
        self.session.add_all(allocations)
        await self.session.flush()

    async def expire_generated(self, now: datetime) -> int:
        result = await self.session.execute(
            update(Recommendation)
            .where(
                Recommendation.status == RecommendationStatus.GENERATED,
                Recommendation.expires_at <= now,
            )
            .values(status=RecommendationStatus.EXPIRED)
        )
        return int(result.rowcount or 0)  # type: ignore[attr-defined]


class StockRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create(
        self,
        *,
        symbol: str,
        company_name: str,
        exchange: str,
        sector: str | None,
    ) -> Stock:
        stock = await self.session.scalar(select(Stock).where(Stock.symbol == symbol))
        if stock is not None:
            if stock.company_name == stock.symbol and company_name != symbol:
                stock.company_name = company_name
            if stock.sector is None and sector:
                stock.sector = sector
            stock.is_active = True
            return stock
        stock = Stock(
            symbol=symbol,
            company_name=company_name,
            exchange=exchange,
            sector=sector,
            industry=sector,
            is_active=True,
        )
        self.session.add(stock)
        await self.session.flush()
        return stock
