from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import (
    InvestmentHorizon,
    MarketRegimeCode,
    NotificationStatus,
    PortfolioStatus,
    RecommendationStatus,
    RecommendationType,
    RiskAppetite,
    UserRole,
    UserStatus,
)
from app.jobs import regime_jobs
from app.modules.investment_profiles.models import InvestmentProfile
from app.modules.market_regimes.models import MarketRegime
from app.modules.notifications.models import Notification
from app.modules.notifications.repository import NotificationRepository
from app.modules.portfolios.models import Portfolio
from app.modules.recommendations.models import Recommendation
from app.modules.users.models import User, UserPreference

INERT_HASH_VALUE = "not-used-in-this-test"


async def _active_portfolio_with_preference(
    session: AsyncSession,
    *,
    email_notifications: bool,
    in_app_notifications: bool,
    language: str,
) -> tuple[uuid.UUID, MarketRegime]:
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email=f"{user_id.hex}@example.com",
        password_hash=INERT_HASH_VALUE,
        full_name="Regime Fanout Test",
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    preference = UserPreference(
        user_id=user_id,
        email_notifications=email_notifications,
        in_app_notifications=in_app_notifications,
        language=language,
    )
    portfolio = Portfolio(
        user_id=user_id,
        name="Active portfolio",
        status=PortfolioStatus.ACTIVE,
        current_version=1,
        initial_capital=Decimal("1000000"),
        current_value=Decimal("1000000"),
        confirmed_at=datetime(2026, 7, 29, tzinfo=UTC),
    )
    regime = MarketRegime(
        code=MarketRegimeCode.BEAR,
        name="Bear market",
        detected_at=datetime(2026, 7, 29, tzinfo=UTC),
        is_current=True,
    )
    session.add_all([user, preference, portfolio, regime])
    await session.commit()
    return user_id, regime


@pytest.mark.parametrize(
    ("email_notifications", "in_app_notifications", "language", "creates_notification"),
    [
        (True, True, "vi-VN", True),
        (False, True, "vi", True),
        (True, False, "en-US", True),
        (False, False, "fr-FR", False),
    ],
)
async def test_regime_fanout_honors_every_notification_channel_combination(
    sqlite_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    *,
    email_notifications: bool,
    in_app_notifications: bool,
    language: str,
    creates_notification: bool,
) -> None:
    user_id, regime = await _active_portfolio_with_preference(
        sqlite_session,
        email_notifications=email_notifications,
        in_app_notifications=in_app_notifications,
        language=language,
    )
    recommendation_id = uuid.uuid4()
    notification_id = uuid.uuid4()
    recommendation_calls: list[dict[str, Any]] = []
    notification_calls: list[dict[str, Any]] = []

    class StubRecommendationService:
        def __init__(self, *_: object, **__: object) -> None:
            pass

        async def generate(self, **kwargs: Any) -> SimpleNamespace:
            recommendation_calls.append(kwargs)
            return SimpleNamespace(id=recommendation_id)

    class StubNotificationService:
        def __init__(self, *_: object, **__: object) -> None:
            pass

        async def create(self, **kwargs: Any) -> SimpleNamespace:
            notification_calls.append(kwargs)
            return SimpleNamespace(id=notification_id)

    monkeypatch.setattr(regime_jobs, "RecommendationService", StubRecommendationService)
    monkeypatch.setattr(regime_jobs, "NotificationService", StubNotificationService)

    result = await regime_jobs._generate_for_active_portfolios(sqlite_session, regime)

    assert recommendation_calls == [
        {"user_id": user_id, "recommendation_type": RecommendationType.REBALANCE}
    ]
    assert result["generatedRecommendationIds"] == [str(recommendation_id)]
    assert result["createdNotificationIds"] == (
        [str(notification_id)] if creates_notification else []
    )
    assert result["notificationOptOutUserIds"] == ([] if creates_notification else [str(user_id)])

    if not creates_notification:
        assert notification_calls == []
        return

    expected_title, expected_summary = regime_jobs._notification_content(language, regime.code)
    assert len(notification_calls) == 1
    call = notification_calls[0]
    assert call["user_id"] == user_id
    assert call["notification_type"] == "MARKET_REGIME_REBALANCE"
    assert call["title"] == expected_title
    assert call["summary"] == expected_summary
    assert call["recommendation_id"] == recommendation_id
    assert call["in_app_visible"] is in_app_notifications


def test_notification_content_uses_vietnamese_for_vi_languages_and_english_fallback() -> None:
    vi_title, vi_summary = regime_jobs._notification_content("vi-VN", MarketRegimeCode.BULL)
    en_title, en_summary = regime_jobs._notification_content("en", MarketRegimeCode.BULL)

    assert regime_jobs._notification_content("vi", MarketRegimeCode.BULL) == (
        vi_title,
        vi_summary,
    )
    assert regime_jobs._notification_content("fr-FR", MarketRegimeCode.BULL) == (
        en_title,
        en_summary,
    )
    assert "thị trường" in vi_title.lower()
    assert "BULL" in vi_summary
    assert "market" in en_title.lower()
    assert "BULL" in en_summary
    assert (vi_title, vi_summary) != (en_title, en_summary)


async def test_regime_fanout_skips_existing_rebalance_for_same_regime(
    sqlite_session: AsyncSession,
) -> None:
    user_id, regime = await _active_portfolio_with_preference(
        sqlite_session,
        email_notifications=True,
        in_app_notifications=True,
        language="vi",
    )
    profile = InvestmentProfile(
        user_id=user_id,
        capital=Decimal("1000000"),
        risk_appetite=RiskAppetite.MEDIUM,
        investment_horizon=InvestmentHorizon.MEDIUM_TERM,
        expected_return=Decimal("0.10"),
        maximum_drawdown=Decimal("0.20"),
        is_active=True,
    )
    sqlite_session.add(profile)
    await sqlite_session.flush()
    now = datetime(2026, 7, 29, tzinfo=UTC)
    existing = Recommendation(
        user_id=user_id,
        investment_profile_id=profile.id,
        regime_id=regime.id,
        type=RecommendationType.REBALANCE,
        status=RecommendationStatus.GENERATED,
        capital=Decimal("1000000"),
        risk_appetite=RiskAppetite.MEDIUM,
        investment_horizon=InvestmentHorizon.MEDIUM_TERM,
        hmm_model_version="test-hmm",
        portfolio_model_version="test-engine",
        total_weight=Decimal("1"),
        cash_weight=Decimal("1"),
        cash_amount=Decimal("1000000"),
        explanation="Existing rebalance recommendation.",
        expires_at=datetime(2026, 7, 30, tzinfo=UTC),
        generated_at=now,
        created_at=now,
    )
    sqlite_session.add(existing)
    await sqlite_session.commit()

    result = await regime_jobs._generate_for_active_portfolios(sqlite_session, regime)

    assert result["generatedRecommendationIds"] == []
    assert result["createdNotificationIds"] == []
    assert result["notificationOptOutUserIds"] == []
    assert result["skipped"] == [{"userId": str(user_id), "reason": "already_generated"}]


async def test_notification_repository_list_excludes_email_only_notifications(
    sqlite_session: AsyncSession,
) -> None:
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email=f"{user_id.hex}@example.com",
        password_hash=INERT_HASH_VALUE,
        full_name="Notification Visibility Test",
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    visible = Notification(
        id=uuid.uuid4(),
        user_id=user_id,
        type="MARKET_REGIME_REBALANCE",
        title="Visible notification",
        summary="Visible in the notification center.",
        status=NotificationStatus.UNREAD,
        in_app_visible=True,
    )
    email_only = Notification(
        id=uuid.uuid4(),
        user_id=user_id,
        type="MARKET_REGIME_REBALANCE",
        title="Email-only notification",
        summary="Must not appear in the notification center.",
        status=NotificationStatus.UNREAD,
        in_app_visible=False,
    )
    sqlite_session.add_all([user, visible, email_only])
    await sqlite_session.commit()

    items, total = await NotificationRepository(sqlite_session).list_for_user(
        user_id,
        status=None,
        offset=0,
        limit=20,
    )

    assert [item.id for item in items] == [visible.id]
    assert total == 1
