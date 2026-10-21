from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal

from app.common.enums import (
    InvestmentHorizon,
    RecommendationStatus,
    RecommendationType,
    RiskAppetite,
)
from app.common.utils import utc_now
from app.modules.recommendations.models import Recommendation
from app.modules.recommendations.service import RecommendationService


def _recommendation(*, expires_delta: timedelta) -> Recommendation:
    now = utc_now()
    return Recommendation(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        investment_profile_id=uuid.uuid4(),
        regime_id=uuid.uuid4(),
        type=RecommendationType.INITIAL,
        status=RecommendationStatus.GENERATED,
        capital=Decimal("1000000"),
        risk_appetite=RiskAppetite.MEDIUM,
        investment_horizon=InvestmentHorizon.MEDIUM_TERM,
        hmm_model_version="hmm-test",
        portfolio_model_version="rules-test",
        total_weight=Decimal("1"),
        cash_weight=Decimal("0.20"),
        cash_amount=Decimal("200000"),
        explanation="test",
        expires_at=now + expires_delta,
        generated_at=now,
        created_at=now,
    )


async def test_generated_recommendation_expires_after_deadline() -> None:
    recommendation = _recommendation(expires_delta=timedelta(seconds=-1))
    service = object.__new__(RecommendationService)

    changed = await service._expire_if_needed(recommendation)

    assert changed is True
    assert recommendation.status == RecommendationStatus.EXPIRED


async def test_unexpired_and_non_generated_recommendations_do_not_transition() -> None:
    recommendation = _recommendation(expires_delta=timedelta(hours=24))
    service = object.__new__(RecommendationService)

    assert await service._expire_if_needed(recommendation) is False
    assert recommendation.status == RecommendationStatus.GENERATED

    recommendation.status = RecommendationStatus.CONFIRMED
    recommendation.expires_at = utc_now() - timedelta(days=1)
    assert await service._expire_if_needed(recommendation) is False
    assert recommendation.status == RecommendationStatus.CONFIRMED
