from __future__ import annotations

import math
from abc import ABC, abstractmethod
from decimal import ROUND_FLOOR, ROUND_HALF_UP, Decimal

from pydantic import Field, model_validator

from app.common.enums import InvestmentHorizon, MarketRegimeCode, RiskAppetite
from app.core.config import Settings
from app.core.exceptions import MarketDataUnavailableError
from app.core.responses import ApiModel
from app.integrations.ai_core.schemas import MarketRegimeResult
from app.integrations.market_data.base import MarketSecuritySnapshot, MarketSnapshot

WEIGHT_QUANTUM = Decimal("0.0000000001")
MONEY_QUANTUM = Decimal("0.01")
QUANTITY_QUANTUM = Decimal("0.0001")


class InvestmentProfileInput(ApiModel):
    capital: Decimal
    risk_appetite: RiskAppetite
    investment_horizon: InvestmentHorizon
    expected_return: Decimal
    maximum_drawdown: Decimal


class PortfolioRecommendationAllocationResult(ApiModel):
    symbol: str
    company_name: str
    exchange: str
    sector: str | None = None
    weight: Decimal
    amount: Decimal
    reference_price: Decimal
    quantity_estimated: Decimal
    reason: str
    rank: int


class PortfolioRecommendationResult(ApiModel):
    engine_version: str
    total_weight: Decimal
    cash_weight: Decimal
    cash_amount: Decimal
    explanation: str
    allocations: list[PortfolioRecommendationAllocationResult]
    metadata: dict[str, object] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_complete_weights(self) -> PortfolioRecommendationResult:
        total = self.cash_weight + sum(
            (allocation.weight for allocation in self.allocations), Decimal("0")
        )
        if not Decimal("0.9999") <= total <= Decimal("1.0001"):
            raise ValueError("Recommendation allocations and cash must sum to one")
        if self.total_weight != total:
            raise ValueError("total_weight does not match allocations and cash")
        return self


class PortfolioRecommendationEngine(ABC):
    @abstractmethod
    async def generate(
        self,
        *,
        user_profile: InvestmentProfileInput,
        regime: MarketRegimeResult,
        market_snapshot: MarketSnapshot,
    ) -> PortfolioRecommendationResult:
        raise NotImplementedError


class RuleBasedPortfolioRecommendationEngine(PortfolioRecommendationEngine):
    """Transparent MVP allocator; this is deliberately not presented as PPO."""

    version = "rule-based-mvp-v1"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def generate(
        self,
        *,
        user_profile: InvestmentProfileInput,
        regime: MarketRegimeResult,
        market_snapshot: MarketSnapshot,
    ) -> PortfolioRecommendationResult:
        regime_code = MarketRegimeCode(regime.regime)
        risk_appetite = RiskAppetite(user_profile.risk_appetite)
        investment_horizon = InvestmentHorizon(user_profile.investment_horizon)
        candidates = [
            security
            for security in market_snapshot.securities
            if security.reference_price.is_finite()
            and security.reference_price > 0
            and security.volatility_20d.is_finite()
            and security.volatility_20d >= 0
            and security.momentum_20d.is_finite()
            and security.momentum_5d.is_finite()
            and security.sharpe_ratio.is_finite()
            and security.symbol.strip()
        ]
        if not candidates:
            raise MarketDataUnavailableError(
                "Market snapshot has no securities eligible for recommendation"
            )

        cash_weight = self._cash_weight(regime_code)
        maximum_weight = self._maximum_weight(risk_appetite)
        equity_weight = Decimal("1") - cash_weight
        required_for_cap = math.ceil(equity_weight / maximum_weight)
        selection_size = max(self.settings.recommendation_min_diversification, required_for_cap)
        if len(candidates) < selection_size:
            raise MarketDataUnavailableError(
                "Market snapshot cannot satisfy configured diversification and "
                "maximum weight rules",
                details={
                    "eligibleSecurities": len(candidates),
                    "requiredSecurities": selection_size,
                },
            )

        ordered = sorted(
            candidates,
            key=lambda item: self._sort_key(
                item,
                regime=regime_code,
                horizon=investment_horizon,
            ),
        )
        selected = ordered[:selection_size]
        weights = self._equal_weights(
            total=equity_weight,
            count=selection_size,
            maximum=maximum_weight,
        )
        allocations = [
            self._allocation(
                security=security,
                weight=weights[index],
                capital=user_profile.capital,
                rank=index + 1,
                regime=regime_code,
                horizon=investment_horizon,
            )
            for index, security in enumerate(selected)
        ]
        cash_amount = (user_profile.capital * cash_weight).quantize(
            MONEY_QUANTUM, rounding=ROUND_HALF_UP
        )
        allocated_amount = sum((allocation.amount for allocation in allocations), Decimal("0"))
        amount_residual = user_profile.capital - cash_amount - allocated_amount
        if allocations and amount_residual:
            last = allocations[-1]
            last.amount += amount_residual
            last.quantity_estimated = (last.amount / last.reference_price).quantize(
                QUANTITY_QUANTUM, rounding=ROUND_FLOOR
            )
        total_weight = cash_weight + sum(
            (allocation.weight for allocation in allocations), Decimal("0")
        )
        return PortfolioRecommendationResult(
            engine_version=self.version,
            total_weight=total_weight,
            cash_weight=cash_weight,
            cash_amount=cash_amount,
            explanation=self._explanation(
                regime=regime_code,
                risk=risk_appetite,
                horizon=investment_horizon,
                cash_weight=cash_weight,
                count=selection_size,
            ),
            allocations=allocations,
            metadata={
                "strategy": "RULE_BASED",
                "marketDataDate": market_snapshot.data_date.isoformat(),
                "marketDataSource": market_snapshot.source,
                "maximumStockWeight": str(maximum_weight),
                "minimumDiversification": self.settings.recommendation_min_diversification,
                "disclaimer": "Estimated allocation for simulation and decision support only.",
            },
        )

    def _cash_weight(self, regime: MarketRegimeCode) -> Decimal:
        configured = {
            MarketRegimeCode.BULL: self.settings.recommendation_bull_cash_weight,
            MarketRegimeCode.SIDEWAY: self.settings.recommendation_sideway_cash_weight,
            MarketRegimeCode.BEAR: self.settings.recommendation_bear_cash_weight,
        }
        if regime not in configured:
            raise MarketDataUnavailableError(
                "Cannot generate a recommendation for an unknown market regime"
            )
        return Decimal(str(configured[regime])).quantize(WEIGHT_QUANTUM)

    def _maximum_weight(self, risk: RiskAppetite) -> Decimal:
        configured = {
            RiskAppetite.LOW: self.settings.recommendation_low_risk_max_weight,
            RiskAppetite.MEDIUM: self.settings.recommendation_medium_risk_max_weight,
            RiskAppetite.HIGH: self.settings.recommendation_high_risk_max_weight,
        }
        return Decimal(str(configured[risk])).quantize(WEIGHT_QUANTUM)

    @staticmethod
    def _sort_key(
        security: MarketSecuritySnapshot,
        *,
        regime: MarketRegimeCode,
        horizon: InvestmentHorizon,
    ) -> tuple[Decimal, Decimal, Decimal, str]:
        momentum = (
            security.momentum_5d
            if horizon == InvestmentHorizon.SHORT_TERM
            else security.momentum_20d
        )
        if regime == MarketRegimeCode.BEAR:
            return (
                security.volatility_20d,
                -security.sharpe_ratio,
                -momentum,
                security.symbol,
            )
        if regime == MarketRegimeCode.SIDEWAY:
            return (
                -security.sharpe_ratio,
                security.volatility_20d,
                -momentum,
                security.symbol,
            )
        return (
            -momentum,
            -security.sharpe_ratio,
            security.volatility_20d,
            security.symbol,
        )

    @staticmethod
    def _equal_weights(*, total: Decimal, count: int, maximum: Decimal) -> list[Decimal]:
        base = (total / count).quantize(WEIGHT_QUANTUM, rounding=ROUND_FLOOR)
        weights = [base for _ in range(count)]
        weights[-1] += total - sum(weights, Decimal("0"))
        if any(weight > maximum for weight in weights):
            raise MarketDataUnavailableError(
                "Unable to allocate portfolio within configured maximum stock weight"
            )
        return weights

    @staticmethod
    def _allocation(
        *,
        security: MarketSecuritySnapshot,
        weight: Decimal,
        capital: Decimal,
        rank: int,
        regime: MarketRegimeCode,
        horizon: InvestmentHorizon,
    ) -> PortfolioRecommendationAllocationResult:
        amount = (capital * weight).quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)
        quantity = (amount / security.reference_price).quantize(
            QUANTITY_QUANTUM, rounding=ROUND_FLOOR
        )
        focus = {
            MarketRegimeCode.BULL: "positive momentum",
            MarketRegimeCode.BEAR: "lower observed volatility",
            MarketRegimeCode.SIDEWAY: "risk-adjusted return",
        }[regime]
        horizon_label = horizon.value.lower().replace("_", " ")
        return PortfolioRecommendationAllocationResult(
            symbol=security.symbol,
            company_name=security.company_name,
            exchange=security.exchange,
            sector=security.sector,
            weight=weight,
            amount=amount,
            reference_price=security.reference_price,
            quantity_estimated=quantity,
            reason=f"Selected for {focus} under a {horizon_label} horizon.",
            rank=rank,
        )

    @staticmethod
    def _explanation(
        *,
        regime: MarketRegimeCode,
        risk: RiskAppetite,
        horizon: InvestmentHorizon,
        cash_weight: Decimal,
        count: int,
    ) -> str:
        return (
            f"Rule-based MVP allocation for regime {regime.value}, risk {risk.value}, "
            f"and horizon {horizon.value}: {count} estimated stock allocations and "
            f"{(cash_weight * 100).normalize()}% simulated cash. No trade is executed."
        )
