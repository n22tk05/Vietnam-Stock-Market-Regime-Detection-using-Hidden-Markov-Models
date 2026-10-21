from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import (
    MarketRegimeCode,
    PortfolioStatus,
    RecommendationStatus,
    RecommendationType,
)
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.integrations.ai_core.hmm_adapter import HMMArtifactAdapter
from app.integrations.market_data.provider import AICoreArtifactMarketDataProvider
from app.jobs.base import run_background_job, uuid_or_none
from app.jobs.celery_app import celery_app
from app.modules.market_regimes.models import MarketRegime
from app.modules.market_regimes.repository import MarketRegimeRepository
from app.modules.market_regimes.service import MarketRegimeService
from app.modules.notifications.service import NotificationService
from app.modules.portfolios.models import Portfolio
from app.modules.recommendations.engine import RuleBasedPortfolioRecommendationEngine
from app.modules.recommendations.models import Recommendation
from app.modules.recommendations.service import RecommendationService
from app.modules.users.models import UserPreference

_VI_REGIME_LABELS = {
    MarketRegimeCode.BULL: "tăng giá",
    MarketRegimeCode.BEAR: "giảm giá",
    MarketRegimeCode.SIDEWAY: "đi ngang",
    MarketRegimeCode.UNKNOWN: "chưa xác định",
}


def _notification_content(language: str, regime_code: MarketRegimeCode) -> tuple[str, str]:
    primary_language = language.partition("-")[0].lower()
    if primary_language == "vi":
        regime_label = _VI_REGIME_LABELS[regime_code]
        return (
            "Trạng thái thị trường đã thay đổi",
            (
                "Đã có đề xuất tái cân bằng danh mục mô phỏng mới cho trạng thái "
                f"{regime_label} ({regime_code.value}). Hãy xem xét trước khi áp dụng; "
                "chưa có giao dịch nào được thực hiện."
            ),
        )
    return (
        "Market regime changed",
        (
            "A new simulated rebalance suggestion is available for the "
            f"{regime_code.value} regime. Review it before applying; "
            "no trade has been executed."
        ),
    )


async def _generate_for_active_portfolios(
    session: AsyncSession, regime: MarketRegime
) -> dict[str, Any]:
    settings = get_settings()
    recipients = (
        await session.execute(
            select(
                Portfolio.user_id,
                UserPreference.in_app_notifications,
                UserPreference.email_notifications,
                UserPreference.language,
            )
            .outerjoin(UserPreference, UserPreference.user_id == Portfolio.user_id)
            .where(Portfolio.status == PortfolioStatus.ACTIVE)
            .distinct()
        )
    ).all()
    generated: list[str] = []
    created_notifications: list[str] = []
    notification_opt_outs: list[str] = []
    skipped: list[dict[str, str]] = []
    for user_id, in_app_preference, email_preference, language in recipients:
        existing = await session.scalar(
            select(Recommendation.id).where(
                Recommendation.user_id == user_id,
                Recommendation.regime_id == regime.id,
                Recommendation.type == RecommendationType.REBALANCE,
                Recommendation.status.in_(
                    [RecommendationStatus.GENERATED, RecommendationStatus.APPLIED]
                ),
            )
        )
        if existing is not None:
            skipped.append({"userId": str(user_id), "reason": "already_generated"})
            continue
        try:
            recommendation = await RecommendationService(
                session,
                settings,
                RuleBasedPortfolioRecommendationEngine(settings),
                AICoreArtifactMarketDataProvider(settings),
            ).generate(user_id=user_id, recommendation_type=RecommendationType.REBALANCE)
            in_app_enabled = True if in_app_preference is None else in_app_preference
            email_enabled = True if email_preference is None else email_preference
            if in_app_enabled or email_enabled:
                title, summary = _notification_content(language or "vi", regime.code)
                notification = await NotificationService(session, settings).create(
                    user_id=user_id,
                    notification_type="MARKET_REGIME_REBALANCE",
                    title=title,
                    summary=summary,
                    recommendation_id=recommendation.id,
                    portfolio_id=None,
                    in_app_visible=in_app_enabled,
                )
                created_notifications.append(str(notification.id))
            else:
                notification_opt_outs.append(str(user_id))
            generated.append(str(recommendation.id))
        except AppError as exc:
            await session.rollback()
            skipped.append({"userId": str(user_id), "reason": exc.code})
    return {
        "regimeId": str(regime.id),
        "regime": regime.code.value,
        "generatedRecommendationIds": generated,
        "createdNotificationIds": created_notifications,
        "notificationOptOutUserIds": notification_opt_outs,
        "skipped": skipped,
    }


async def _detect(session: AsyncSession) -> dict[str, Any]:
    settings = get_settings()
    repository = MarketRegimeRepository(session)
    previous = await repository.get_current()
    entity, created = await MarketRegimeService(
        session, HMMArtifactAdapter(settings)
    ).synchronize_from_artifact()
    changed = previous is not None and previous.code != entity.code
    output: dict[str, Any] = {
        "regimeId": str(entity.id),
        "regime": entity.code.value,
        "dataDate": entity.data_date.isoformat() if entity.data_date else None,
        "recordCreated": created,
        "regimeChanged": changed,
        "previousRegime": previous.code.value if previous else None,
        "liveInferencePerformed": False,
    }
    if changed:
        output["rebalance"] = await _generate_for_active_portfolios(session, entity)
    return output


@celery_app.task(name="astera.detect_market_regime")
def detect_market_regime() -> dict[str, Any]:
    return run_background_job(
        job_type="detect_market_regime",
        input_data={"operation": "READ_ONLY_ARTIFACT_SYNC"},
        handler=_detect,
    )


@celery_app.task(name="astera.detect_regime_change")
def detect_regime_change(
    previous_regime_id: str | None = None, current_regime_id: str | None = None
) -> dict[str, Any]:
    async def handler(session: AsyncSession) -> dict[str, Any]:
        current_id = uuid_or_none(current_regime_id)
        previous_id = uuid_or_none(previous_regime_id)
        repository = MarketRegimeRepository(session)
        current = (
            await session.get(MarketRegime, current_id)
            if current_id is not None
            else await repository.get_current()
        )
        if current is None:
            return {"changed": False, "reason": "current_regime_missing"}
        previous = await session.get(MarketRegime, previous_id) if previous_id is not None else None
        changed = previous is not None and previous.code != current.code
        result: dict[str, Any] = {
            "changed": changed,
            "previousRegime": previous.code.value if previous else None,
            "currentRegime": current.code.value,
        }
        if changed:
            result["rebalance"] = await _generate_for_active_portfolios(session, current)
        return result

    return run_background_job(
        job_type="detect_regime_change",
        input_data={
            "previousRegimeId": previous_regime_id,
            "currentRegimeId": current_regime_id,
        },
        handler=handler,
    )


@celery_app.task(name="astera.generate_rebalance_recommendations")
def generate_rebalance_recommendations(regime_id: str | None = None) -> dict[str, Any]:
    async def handler(session: AsyncSession) -> dict[str, Any]:
        parsed = uuid_or_none(regime_id)
        regime = (
            await session.get(MarketRegime, parsed)
            if parsed is not None
            else await MarketRegimeRepository(session).get_current()
        )
        if regime is None:
            return {"generatedRecommendationIds": [], "reason": "regime_missing"}
        return await _generate_for_active_portfolios(session, regime)

    return run_background_job(
        job_type="generate_rebalance_recommendations",
        input_data={"regimeId": regime_id},
        handler=handler,
    )
