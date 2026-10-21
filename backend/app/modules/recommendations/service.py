from __future__ import annotations

import uuid
from datetime import UTC, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import (
    PortfolioStatus,
    RecommendationStatus,
    RecommendationType,
)
from app.common.utils import utc_now
from app.core.config import Settings
from app.core.exceptions import ConflictError, ResourceNotFoundError
from app.integrations.ai_core.schemas import MarketRegimeResult
from app.integrations.market_data.base import MarketDataProvider
from app.modules.investment_profiles.models import InvestmentProfile
from app.modules.market_regimes.models import MarketRegime
from app.modules.portfolios.models import Portfolio
from app.modules.recommendations.engine import (
    InvestmentProfileInput,
    PortfolioRecommendationEngine,
)
from app.modules.recommendations.models import Recommendation, RecommendationAllocation
from app.modules.recommendations.repository import (
    RecommendationRecord,
    RecommendationRepository,
    StockRepository,
)
from app.modules.recommendations.schemas import (
    RecommendationAllocationResponse,
    RecommendationListResponse,
    RecommendationResponse,
    RecommendationSummaryResponse,
)


class RecommendationService:
    def __init__(
        self,
        session: AsyncSession,
        settings: Settings,
        engine: PortfolioRecommendationEngine | None = None,
        market_data: MarketDataProvider | None = None,
    ) -> None:
        self.session = session
        self.settings = settings
        self.engine = engine
        self.market_data = market_data
        self.repository = RecommendationRepository(session)
        self.stock_repository = StockRepository(session)

    async def generate(
        self, *, user_id: uuid.UUID, recommendation_type: RecommendationType
    ) -> RecommendationResponse:
        if self.engine is None or self.market_data is None:
            raise RuntimeError("Recommendation engine and market data provider are required")
        recommendation_type = RecommendationType(recommendation_type)
        profile = await self.session.scalar(
            select(InvestmentProfile).where(
                InvestmentProfile.user_id == user_id,
                InvestmentProfile.is_active.is_(True),
            )
        )
        if profile is None:
            raise ResourceNotFoundError(
                "Create an active investment profile before requesting a recommendation"
            )
        regime = await self.session.scalar(
            select(MarketRegime).where(MarketRegime.is_current.is_(True))
        )
        if regime is None:
            raise ResourceNotFoundError("No current market regime is available")

        capital = profile.capital
        if recommendation_type != RecommendationType.INITIAL:
            portfolio = await self.session.scalar(
                select(Portfolio).where(
                    Portfolio.user_id == user_id,
                    Portfolio.status == PortfolioStatus.ACTIVE,
                )
            )
            if portfolio is None:
                raise ResourceNotFoundError(
                    "An active simulated portfolio is required for recalculation or rebalance"
                )
            capital = portfolio.current_value
        elif await self.session.scalar(
            select(Portfolio.id).where(
                Portfolio.user_id == user_id,
                Portfolio.status == PortfolioStatus.ACTIVE,
            )
        ):
            raise ConflictError(
                "An active portfolio already exists; request recalculation or rebalance instead"
            )

        snapshot = await self.market_data.latest_snapshot()
        result = await self.engine.generate(
            user_profile=InvestmentProfileInput(
                capital=capital,
                risk_appetite=profile.risk_appetite,
                investment_horizon=profile.investment_horizon,
                expected_return=profile.expected_return,
                maximum_drawdown=profile.maximum_drawdown,
            ),
            regime=self._regime_result(regime),
            market_snapshot=snapshot,
        )
        now = utc_now()
        recommendation = Recommendation(
            user_id=user_id,
            investment_profile_id=profile.id,
            regime_id=regime.id,
            type=recommendation_type,
            status=RecommendationStatus.GENERATED,
            capital=capital,
            risk_appetite=profile.risk_appetite,
            investment_horizon=profile.investment_horizon,
            hmm_model_version=regime.model_version,
            portfolio_model_version=result.engine_version,
            total_weight=result.total_weight,
            cash_weight=result.cash_weight,
            cash_amount=result.cash_amount,
            explanation=result.explanation,
            expires_at=now + timedelta(hours=self.settings.recommendation_expire_hours),
            generated_at=now,
            created_at=now,
        )
        try:
            await self.repository.add(recommendation)
            allocations: list[RecommendationAllocation] = []
            for allocation in result.allocations:
                stock = await self.stock_repository.get_or_create(
                    symbol=allocation.symbol,
                    company_name=allocation.company_name,
                    exchange=allocation.exchange,
                    sector=allocation.sector,
                )
                allocations.append(
                    RecommendationAllocation(
                        recommendation_id=recommendation.id,
                        stock_id=stock.id,
                        weight=allocation.weight,
                        amount=allocation.amount,
                        reference_price=allocation.reference_price,
                        quantity_estimated=allocation.quantity_estimated,
                        reason=allocation.reason,
                        rank=allocation.rank,
                        created_at=now,
                    )
                )
            await self.repository.add_allocations(allocations)
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise
        record = await self.repository.get_for_user(recommendation.id, user_id)
        if record is None:
            raise ResourceNotFoundError("Generated recommendation could not be loaded")
        return self.to_response(record)

    async def get(
        self, *, recommendation_id: uuid.UUID, user_id: uuid.UUID
    ) -> RecommendationResponse:
        record = await self.repository.get_for_user(recommendation_id, user_id)
        if record is None:
            raise ResourceNotFoundError("Recommendation not found")
        await self._expire_if_needed(record.recommendation)
        if record.recommendation.status == RecommendationStatus.EXPIRED:
            await self.session.commit()
        return self.to_response(record)

    async def list(
        self, *, user_id: uuid.UUID, page: int, page_size: int
    ) -> RecommendationListResponse:
        rows, total = await self.repository.list_for_user(
            user_id, offset=(page - 1) * page_size, limit=page_size
        )
        changed = False
        items: list[RecommendationSummaryResponse] = []
        for recommendation, regime in rows:
            changed = await self._expire_if_needed(recommendation) or changed
            items.append(self.to_summary(recommendation, regime))
        if changed:
            await self.session.commit()
        return RecommendationListResponse(items=items, total=total, page=page, page_size=page_size)

    async def dismiss(
        self, *, recommendation_id: uuid.UUID, user_id: uuid.UUID
    ) -> RecommendationResponse:
        record = await self.repository.get_for_user(recommendation_id, user_id, for_update=True)
        if record is None:
            raise ResourceNotFoundError("Recommendation not found")
        recommendation = record.recommendation
        if recommendation.status == RecommendationStatus.DISMISSED:
            return self.to_response(record)
        if recommendation.status != RecommendationStatus.GENERATED:
            raise ConflictError(
                f"Recommendation in status {recommendation.status.value} cannot be dismissed"
            )
        recommendation.status = RecommendationStatus.DISMISSED
        await self.session.commit()
        return self.to_response(record)

    async def expire_old(self) -> int:
        count = await self.repository.expire_generated(utc_now())
        await self.session.commit()
        return count

    async def _expire_if_needed(self, recommendation: Recommendation) -> bool:
        expires_at = recommendation.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if recommendation.status == RecommendationStatus.GENERATED and expires_at <= utc_now():
            recommendation.status = RecommendationStatus.EXPIRED
            return True
        return False

    @staticmethod
    def _regime_result(regime: MarketRegime) -> MarketRegimeResult:
        metadata = regime.regime_metadata or {}
        probabilities = metadata.get("probabilities")
        features = metadata.get("features")
        return MarketRegimeResult(
            regime=regime.code,
            confidence=float(regime.probability) if regime.probability is not None else None,
            state_id=metadata.get("rawState"),
            detected_at=regime.detected_at,
            data_date=regime.data_date,
            model_version=regime.model_version,
            probabilities=probabilities if isinstance(probabilities, dict) else None,
            features=features if isinstance(features, dict) else None,
            metadata=metadata,
        )

    @staticmethod
    def to_response(record: RecommendationRecord) -> RecommendationResponse:
        recommendation = record.recommendation
        return RecommendationResponse(
            id=recommendation.id,
            investment_profile_id=recommendation.investment_profile_id,
            regime_id=recommendation.regime_id,
            regime=record.regime.code.value,
            type=recommendation.type,
            status=recommendation.status,
            capital=recommendation.capital,
            risk_appetite=recommendation.risk_appetite,
            investment_horizon=recommendation.investment_horizon,
            hmm_model_version=recommendation.hmm_model_version,
            portfolio_model_version=recommendation.portfolio_model_version,
            total_weight=recommendation.total_weight,
            cash_weight=recommendation.cash_weight,
            cash_amount=recommendation.cash_amount,
            explanation=recommendation.explanation,
            expires_at=recommendation.expires_at,
            generated_at=recommendation.generated_at,
            confirmed_at=recommendation.confirmed_at,
            allocations=[
                RecommendationAllocationResponse(
                    id=row.allocation.id,
                    stock_id=row.stock.id,
                    symbol=row.stock.symbol,
                    company_name=row.stock.company_name,
                    exchange=row.stock.exchange,
                    sector=row.stock.sector,
                    weight=row.allocation.weight,
                    amount=row.allocation.amount,
                    reference_price=row.allocation.reference_price,
                    quantity_estimated=row.allocation.quantity_estimated,
                    reason=row.allocation.reason,
                    rank=row.allocation.rank,
                )
                for row in record.allocations
            ],
        )

    @staticmethod
    def to_summary(
        recommendation: Recommendation, regime: MarketRegime
    ) -> RecommendationSummaryResponse:
        return RecommendationSummaryResponse(
            id=recommendation.id,
            regime=regime.code.value,
            type=recommendation.type,
            status=recommendation.status,
            capital=recommendation.capital,
            cash_weight=recommendation.cash_weight,
            generated_at=recommendation.generated_at,
            expires_at=recommendation.expires_at,
            confirmed_at=recommendation.confirmed_at,
        )
