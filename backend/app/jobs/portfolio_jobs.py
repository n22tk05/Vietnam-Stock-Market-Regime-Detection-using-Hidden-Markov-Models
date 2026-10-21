from __future__ import annotations

from datetime import timedelta
from typing import Any

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import PortfolioStatus
from app.common.utils import utc_now
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.integrations.market_data.provider import AICoreArtifactMarketDataProvider
from app.jobs.base import run_background_job
from app.jobs.celery_app import celery_app
from app.modules.portfolios.models import Portfolio
from app.modules.portfolios.service import PortfolioService
from app.modules.recommendations.service import RecommendationService
from app.modules.users.models import PasswordResetToken, RefreshToken


async def _snapshots(session: AsyncSession) -> dict[str, Any]:
    settings = get_settings()
    user_ids = list(
        await session.scalars(
            select(Portfolio.user_id).where(Portfolio.status == PortfolioStatus.ACTIVE)
        )
    )
    completed: list[str] = []
    skipped: list[dict[str, str]] = []
    for user_id in user_ids:
        try:
            snapshot = await PortfolioService(session, settings).persist_snapshot(
                user_id=user_id,
                market_data=AICoreArtifactMarketDataProvider(settings),
            )
            completed.append(str(snapshot.id))
        except AppError as exc:
            await session.rollback()
            skipped.append({"userId": str(user_id), "reason": exc.code})
    return {"snapshotIds": completed, "skipped": skipped}


@celery_app.task(name="astera.calculate_portfolio_snapshots")
def calculate_portfolio_snapshots() -> dict[str, Any]:
    return run_background_job(
        job_type="calculate_portfolio_snapshots", input_data=None, handler=_snapshots
    )


@celery_app.task(name="astera.expire_old_recommendations")
def expire_old_recommendations() -> dict[str, Any]:
    async def handler(session: AsyncSession) -> dict[str, Any]:
        count = await RecommendationService(session, get_settings()).expire_old()
        return {"expiredRecommendations": count}

    return run_background_job(
        job_type="expire_old_recommendations", input_data=None, handler=handler
    )


@celery_app.task(name="astera.cleanup_expired_tokens")
def cleanup_expired_tokens() -> dict[str, Any]:
    async def handler(session: AsyncSession) -> dict[str, Any]:
        now = utc_now()
        refresh_result = await session.execute(
            delete(RefreshToken).where(
                or_(
                    RefreshToken.expires_at <= now,
                    RefreshToken.revoked_at <= now - timedelta(days=30),
                )
            )
        )
        reset_result = await session.execute(
            delete(PasswordResetToken).where(
                or_(PasswordResetToken.expires_at <= now, PasswordResetToken.used_at.is_not(None))
            )
        )
        await session.commit()
        return {
            "deletedRefreshTokens": int(getattr(refresh_result, "rowcount", 0) or 0),
            "deletedPasswordResetTokens": int(getattr(reset_result, "rowcount", 0) or 0),
        }

    return run_background_job(job_type="cleanup_expired_tokens", input_data=None, handler=handler)
