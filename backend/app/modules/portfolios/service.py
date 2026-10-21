from __future__ import annotations

import uuid
from datetime import UTC
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import (
    PortfolioChangeType,
    PortfolioStatus,
    RecommendationStatus,
    RecommendationType,
)
from app.common.utils import utc_now
from app.core.config import Settings
from app.core.exceptions import ConflictError, ResourceNotFoundError
from app.integrations.market_data.base import MarketDataProvider
from app.modules.portfolios.models import (
    Portfolio,
    PortfolioAllocation,
    PortfolioSnapshot,
    PortfolioVersion,
)
from app.modules.portfolios.repository import PortfolioRecord, PortfolioRepository
from app.modules.portfolios.schemas import (
    PortfolioAllocationResponse,
    PortfolioPerformanceResponse,
    PortfolioPositionPerformance,
    PortfolioResponse,
    PortfolioVersionResponse,
    PortfolioVersionsResponse,
    PortfolioVersionSummaryResponse,
)
from app.modules.recommendations.engine import PortfolioRecommendationEngine
from app.modules.recommendations.repository import RecommendationRepository
from app.modules.recommendations.schemas import RecommendationResponse
from app.modules.recommendations.service import RecommendationService

MONEY_QUANTUM = Decimal("0.01")
PERCENT_QUANTUM = Decimal("0.00000001")


class PortfolioService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.repository = PortfolioRepository(session)
        self.recommendation_repository = RecommendationRepository(session)

    async def confirm_recommendation(
        self, *, recommendation_id: uuid.UUID, user_id: uuid.UUID
    ) -> PortfolioResponse:
        return await self.apply_recommendation(
            recommendation_id=recommendation_id,
            user_id=user_id,
            status_after=RecommendationStatus.CONFIRMED,
            commit=True,
        )

    async def apply_recommendation(
        self,
        *,
        recommendation_id: uuid.UUID,
        user_id: uuid.UUID,
        status_after: RecommendationStatus,
        commit: bool,
    ) -> PortfolioResponse:
        if status_after not in {
            RecommendationStatus.CONFIRMED,
            RecommendationStatus.APPLIED,
        }:
            raise ValueError("status_after must be CONFIRMED or APPLIED")

        existing = await self.repository.get_record_for_recommendation(recommendation_id, user_id)
        if existing is not None:
            if status_after == RecommendationStatus.APPLIED:
                existing_recommendation = await self.recommendation_repository.get_for_user(
                    recommendation_id, user_id, for_update=True
                )
                if (
                    existing_recommendation is not None
                    and existing_recommendation.recommendation.status
                    == RecommendationStatus.CONFIRMED
                ):
                    existing_recommendation.recommendation.status = RecommendationStatus.APPLIED
                    if commit:
                        await self.session.commit()
            return self.to_response(existing)

        record = await self.recommendation_repository.get_for_user(
            recommendation_id, user_id, for_update=True
        )
        if record is None:
            raise ResourceNotFoundError("Recommendation not found")
        recommendation = record.recommendation
        expires_at = recommendation.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at <= utc_now():
            recommendation.status = RecommendationStatus.EXPIRED
            if commit:
                await self.session.commit()
            raise ConflictError("Recommendation has expired")
        if recommendation.status != RecommendationStatus.GENERATED:
            existing = await self.repository.get_record_for_recommendation(
                recommendation_id, user_id
            )
            if existing is not None:
                return self.to_response(existing)
            raise ConflictError(
                f"Recommendation in status {recommendation.status.value} cannot be applied"
            )
        if not record.allocations:
            raise ConflictError("Recommendation contains no stock allocations")

        portfolio = await self.repository.get_active_for_user(user_id, for_update=True)
        now = utc_now()
        if portfolio is None:
            if recommendation.type != RecommendationType.INITIAL:
                raise ConflictError(
                    "A recalculation or rebalance requires an active simulated portfolio"
                )
            portfolio = Portfolio(
                user_id=user_id,
                name="Astera simulated portfolio",
                status=PortfolioStatus.ACTIVE,
                current_version=1,
                initial_capital=recommendation.capital,
                current_value=recommendation.capital,
                confirmed_at=now,
            )
            await self.repository.add_portfolio(portfolio)
            version_number = 1
            change_type = PortfolioChangeType.INITIAL
        else:
            if recommendation.type == RecommendationType.INITIAL:
                raise ConflictError("An active simulated portfolio already exists for this user")
            version_number = portfolio.current_version + 1
            change_type = (
                PortfolioChangeType.REBALANCE
                if recommendation.type == RecommendationType.REBALANCE
                else PortfolioChangeType.MANUAL_RECALCULATION
            )
            portfolio.current_version = version_number
            portfolio.current_value = recommendation.capital

        version = PortfolioVersion(
            portfolio_id=portfolio.id,
            recommendation_id=recommendation.id,
            version_number=version_number,
            change_type=change_type,
            regime_id=recommendation.regime_id,
            total_value=recommendation.capital,
            cash_weight=recommendation.cash_weight,
            cash_amount=recommendation.cash_amount,
            effective_at=now,
            created_at=now,
        )
        await self.repository.add_version(version)
        await self.repository.add_allocations(
            [
                PortfolioAllocation(
                    portfolio_version_id=version.id,
                    stock_id=row.stock.id,
                    weight=row.allocation.weight,
                    invested_amount=row.allocation.amount,
                    entry_price=row.allocation.reference_price,
                    estimated_quantity=row.allocation.quantity_estimated,
                    created_at=now,
                )
                for row in record.allocations
            ]
        )
        recommendation.status = status_after
        recommendation.confirmed_at = recommendation.confirmed_at or now
        if commit:
            try:
                await self.session.commit()
            except Exception:
                await self.session.rollback()
                raise
        await self.session.flush()
        applied = await self.repository.get_record_for_recommendation(recommendation_id, user_id)
        if applied is None:
            raise ResourceNotFoundError("Applied portfolio version could not be loaded")
        return self.to_response(applied)

    async def get_current(self, *, user_id: uuid.UUID) -> PortfolioResponse:
        record = await self.repository.get_current_record(user_id)
        if record is None:
            raise ResourceNotFoundError("No active simulated portfolio found")
        return self.to_response(record)

    async def get_versions(self, *, user_id: uuid.UUID) -> PortfolioVersionsResponse:
        portfolio = await self.repository.get_active_for_user(user_id)
        if portfolio is None:
            raise ResourceNotFoundError("No active simulated portfolio found")
        rows = await self.repository.list_versions(portfolio.id)
        return PortfolioVersionsResponse(
            items=[
                PortfolioVersionSummaryResponse(
                    id=version.id,
                    recommendation_id=version.recommendation_id,
                    version_number=version.version_number,
                    change_type=version.change_type,
                    regime=regime.code.value,
                    total_value=version.total_value,
                    cash_weight=version.cash_weight,
                    effective_at=version.effective_at,
                )
                for version, regime in rows
            ]
        )

    async def performance(
        self, *, user_id: uuid.UUID, market_data: MarketDataProvider
    ) -> PortfolioPerformanceResponse:
        record = await self.repository.get_current_record(user_id)
        if record is None:
            raise ResourceNotFoundError("No active simulated portfolio found")
        snapshot = await market_data.latest_snapshot()
        by_symbol = {security.symbol: security for security in snapshot.securities}
        estimated_total = record.version.cash_amount
        missing_symbols: list[str] = []
        positions: list[PortfolioPositionPerformance] = []
        for row in record.allocations:
            security = by_symbol.get(row.stock.symbol)
            if security is None:
                missing_symbols.append(row.stock.symbol)
                estimated_total += row.allocation.invested_amount
                positions.append(
                    PortfolioPositionPerformance(
                        symbol=row.stock.symbol,
                        estimated_quantity=row.allocation.estimated_quantity,
                        entry_price=row.allocation.entry_price,
                        invested_amount=row.allocation.invested_amount,
                        estimated_value=row.allocation.invested_amount,
                        profit_loss=Decimal("0"),
                        pnl_percent=Decimal("0"),
                    )
                )
                continue
            value = (row.allocation.estimated_quantity * security.reference_price).quantize(
                MONEY_QUANTUM, rounding=ROUND_HALF_UP
            )
            profit_loss = (value - row.allocation.invested_amount).quantize(
                MONEY_QUANTUM, rounding=ROUND_HALF_UP
            )
            pnl_percent = (
                profit_loss / row.allocation.invested_amount
                if row.allocation.invested_amount
                else Decimal("0")
            ).quantize(PERCENT_QUANTUM, rounding=ROUND_HALF_UP)
            estimated_total += value
            positions.append(
                PortfolioPositionPerformance(
                    symbol=row.stock.symbol,
                    estimated_quantity=row.allocation.estimated_quantity,
                    entry_price=row.allocation.entry_price,
                    current_reference_price=security.reference_price,
                    invested_amount=row.allocation.invested_amount,
                    estimated_value=value,
                    profit_loss=profit_loss,
                    pnl_percent=pnl_percent,
                )
            )
        estimated_total = estimated_total.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)
        profit_loss = (estimated_total - record.portfolio.initial_capital).quantize(
            MONEY_QUANTUM, rounding=ROUND_HALF_UP
        )
        pnl_percent = (
            profit_loss / record.portfolio.initial_capital
            if record.portfolio.initial_capital
            else Decimal("0")
        ).quantize(PERCENT_QUANTUM, rounding=ROUND_HALF_UP)
        return PortfolioPerformanceResponse(
            portfolio_id=record.portfolio.id,
            as_of_date=snapshot.data_date,
            initial_capital=record.portfolio.initial_capital,
            estimated_total_value=estimated_total,
            cash_amount=record.version.cash_amount,
            profit_loss=profit_loss,
            pnl_percent=pnl_percent,
            positions=positions,
            missing_symbols=missing_symbols,
            data_source=snapshot.source,
        )

    async def create_recommendation(
        self,
        *,
        user_id: uuid.UUID,
        recommendation_type: RecommendationType,
        engine: PortfolioRecommendationEngine,
        market_data: MarketDataProvider,
    ) -> RecommendationResponse:
        if recommendation_type == RecommendationType.INITIAL:
            raise ValueError(
                "Portfolio recalculation endpoints cannot create INITIAL recommendations"
            )
        return await RecommendationService(
            self.session, self.settings, engine, market_data
        ).generate(user_id=user_id, recommendation_type=recommendation_type)

    async def persist_snapshot(
        self, *, user_id: uuid.UUID, market_data: MarketDataProvider
    ) -> PortfolioSnapshot:
        performance = await self.performance(user_id=user_id, market_data=market_data)
        record = await self.repository.get_current_record(user_id)
        if record is None:
            raise ResourceNotFoundError("No active simulated portfolio found")
        snapshot = PortfolioSnapshot(
            portfolio_id=record.portfolio.id,
            snapshot_date=performance.as_of_date,
            total_value=performance.estimated_total_value,
            profit_loss=performance.profit_loss,
            pnl_percent=performance.pnl_percent,
            regime_id=record.version.regime_id,
            created_at=utc_now(),
        )
        existing = await self.session.scalar(
            select(PortfolioSnapshot).where(
                PortfolioSnapshot.portfolio_id == record.portfolio.id,
                PortfolioSnapshot.snapshot_date == performance.as_of_date,
            )
        )
        if existing is None:
            self.session.add(snapshot)
        else:
            existing.total_value = snapshot.total_value
            existing.profit_loss = snapshot.profit_loss
            existing.pnl_percent = snapshot.pnl_percent
            existing.regime_id = snapshot.regime_id
            snapshot = existing
        record.portfolio.current_value = performance.estimated_total_value
        await self.session.commit()
        return snapshot

    @staticmethod
    def to_response(record: PortfolioRecord) -> PortfolioResponse:
        version = record.version
        return PortfolioResponse(
            id=record.portfolio.id,
            name=record.portfolio.name,
            status=record.portfolio.status,
            current_version=record.portfolio.current_version,
            initial_capital=record.portfolio.initial_capital,
            current_value=record.portfolio.current_value,
            confirmed_at=record.portfolio.confirmed_at,
            created_at=record.portfolio.created_at,
            updated_at=record.portfolio.updated_at,
            version=PortfolioVersionResponse(
                id=version.id,
                recommendation_id=version.recommendation_id,
                version_number=version.version_number,
                change_type=version.change_type,
                regime_id=version.regime_id,
                regime=record.regime.code.value,
                total_value=version.total_value,
                cash_weight=version.cash_weight,
                cash_amount=version.cash_amount,
                effective_at=version.effective_at,
                allocations=[
                    PortfolioAllocationResponse(
                        id=row.allocation.id,
                        stock_id=row.stock.id,
                        symbol=row.stock.symbol,
                        company_name=row.stock.company_name,
                        weight=row.allocation.weight,
                        invested_amount=row.allocation.invested_amount,
                        entry_price=row.allocation.entry_price,
                        estimated_quantity=row.allocation.estimated_quantity,
                    )
                    for row in record.allocations
                ],
            ),
        )
