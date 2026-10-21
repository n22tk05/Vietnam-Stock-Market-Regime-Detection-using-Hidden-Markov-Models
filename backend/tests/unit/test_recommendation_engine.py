from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.common.enums import InvestmentHorizon, MarketRegimeCode, RiskAppetite
from app.core.config import Settings
from app.integrations.ai_core.schemas import MarketRegimeResult
from app.integrations.market_data.base import MarketSecuritySnapshot, MarketSnapshot
from app.modules.recommendations.engine import (
    InvestmentProfileInput,
    PortfolioRecommendationAllocationResult,
    PortfolioRecommendationResult,
    RuleBasedPortfolioRecommendationEngine,
)

TEST_SIGNING_MATERIAL = "unit-test-signing-material-longer-than-32-characters"


def _settings(
    *,
    minimum_diversification: int = 4,
    high_risk_max_weight: float = 0.25,
) -> Settings:
    return Settings(
        jwt_secret_key=TEST_SIGNING_MATERIAL,
        recommendation_min_diversification=minimum_diversification,
        recommendation_high_risk_max_weight=high_risk_max_weight,
    )


def _profile(risk: RiskAppetite = RiskAppetite.MEDIUM) -> InvestmentProfileInput:
    return InvestmentProfileInput(
        capital=Decimal("10000000"),
        risk_appetite=risk,
        investment_horizon=InvestmentHorizon.LONG_TERM,
        expected_return=Decimal("0.12"),
        maximum_drawdown=Decimal("0.20"),
    )


def _regime(code: MarketRegimeCode) -> MarketRegimeResult:
    return MarketRegimeResult(
        regime=code,
        confidence=0.8,
        state_id=1,
        detected_at=datetime.now(UTC),
        data_date=date(2024, 1, 31),
        model_version="test-hmm",
    )


def _snapshot(count: int = 8) -> MarketSnapshot:
    securities = [
        MarketSecuritySnapshot(
            symbol=f"S{index:02d}",
            company_name=f"Security {index}",
            exchange="HOSE",
            sector="Test",
            reference_price=Decimal("20000") + index,
            volatility_20d=Decimal("0.01") * (index + 1),
            momentum_20d=Decimal("0.02") * (index + 1),
            momentum_5d=Decimal("0.01") * (index + 1),
            sharpe_ratio=Decimal("0.20") * (index + 1),
        )
        for index in range(count)
    ]
    return MarketSnapshot(data_date=date(2024, 1, 31), securities=securities, source="test")


async def test_rule_engine_normalizes_weights_exactly_and_respects_maximum() -> None:
    settings = _settings()
    result = await RuleBasedPortfolioRecommendationEngine(settings).generate(
        user_profile=_profile(),
        regime=_regime(MarketRegimeCode.BULL),
        market_snapshot=_snapshot(),
    )

    stock_weight = sum((item.weight for item in result.allocations), Decimal("0"))
    assert result.cash_weight == Decimal("0.0500000000")
    assert stock_weight == Decimal("0.9500000000")
    assert result.total_weight == Decimal("1.0000000000")
    assert len(result.allocations) == 6  # ceil(0.95 / 0.18)
    assert all(item.weight <= Decimal("0.1800000000") for item in result.allocations)
    assert result.allocations[0].symbol == "S07"
    allocated = sum((item.amount for item in result.allocations), Decimal("0"))
    assert allocated == Decimal("9500000.00")
    assert allocated + result.cash_amount == _profile().capital


async def test_bear_regime_raises_cash_and_prefers_lower_volatility() -> None:
    settings = _settings(
        minimum_diversification=3,
        high_risk_max_weight=0.25,
    )
    result = await RuleBasedPortfolioRecommendationEngine(settings).generate(
        user_profile=_profile(RiskAppetite.HIGH),
        regime=_regime(MarketRegimeCode.BEAR),
        market_snapshot=_snapshot(5),
    )

    assert result.cash_weight == Decimal("0.4500000000")
    assert [item.symbol for item in result.allocations] == ["S00", "S01", "S02"]
    assert result.total_weight == Decimal("1.0000000000")


def test_recommendation_result_rejects_incomplete_total_weight() -> None:
    allocation = PortfolioRecommendationAllocationResult(
        symbol="AAA",
        company_name="AAA",
        exchange="HOSE",
        weight=Decimal("0.70"),
        amount=Decimal("7000000"),
        reference_price=Decimal("20000"),
        quantity_estimated=Decimal("350"),
        reason="test",
        rank=1,
    )

    with pytest.raises(ValidationError, match="sum to one"):
        PortfolioRecommendationResult(
            engine_version="test",
            total_weight=Decimal("0.90"),
            cash_weight=Decimal("0.10"),
            cash_amount=Decimal("1000000"),
            explanation="test",
            allocations=[allocation],
        )
