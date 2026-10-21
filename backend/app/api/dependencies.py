from __future__ import annotations

import hashlib
import logging
import time
import uuid
from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from redis.exceptions import RedisError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import UserRole, UserStatus
from app.core.config import Settings, get_settings
from app.core.database import get_db_session
from app.core.exceptions import (
    AuthenticationError,
    PermissionDeniedError,
    RateLimitExceededError,
)
from app.core.security import decode_token
from app.integrations.ai_core.base import MarketRegimeDetector
from app.integrations.ai_core.hmm_adapter import HMMArtifactAdapter
from app.integrations.email.base import EmailProvider
from app.integrations.email.provider import SMTPEmailProvider
from app.integrations.market_data.base import MarketDataProvider
from app.integrations.market_data.provider import AICoreArtifactMarketDataProvider
from app.modules.recommendations.engine import (
    PortfolioRecommendationEngine,
    RuleBasedPortfolioRecommendationEngine,
)
from app.modules.users.models import User

bearer_scheme = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


async def get_db() -> AsyncIterator[AsyncSession]:
    async for session in get_db_session():
        yield session


def settings_dependency() -> Settings:
    return get_settings()


@lru_cache
def _regime_detector() -> MarketRegimeDetector:
    return HMMArtifactAdapter(get_settings())


def get_regime_detector() -> MarketRegimeDetector:
    return _regime_detector()


@lru_cache
def _market_data_provider() -> MarketDataProvider:
    return AICoreArtifactMarketDataProvider(get_settings())


def get_market_data_provider() -> MarketDataProvider:
    return _market_data_provider()


@lru_cache
def _email_provider() -> EmailProvider:
    return SMTPEmailProvider(get_settings())


def get_email_provider() -> EmailProvider:
    return _email_provider()


async def enforce_auth_rate_limit(
    request: Request,
    settings: Annotated[Settings, Depends(settings_dependency)],
) -> None:
    """Redis fixed-window limit for login and password-reset initiation.

    Availability is preferred over lockout when Redis is unavailable; that
    condition is logged without request bodies or credentials.
    """

    if request.url.path.endswith("/forgot-password"):
        limit, window_seconds = 5, 15 * 60
    else:
        limit, window_seconds = 10, 60
    client_host = request.client.host if request.client else "unknown"
    subject = hashlib.sha256(client_host.encode("utf-8")).hexdigest()[:24]
    bucket = int(time.time()) // window_seconds
    key = f"astera:rate:{request.url.path}:{subject}:{bucket}"
    redis = None
    try:
        redis = Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=1.0,
            socket_timeout=1.0,
        )
        async with redis.pipeline(transaction=True) as pipeline:
            pipeline.incr(key)
            pipeline.expire(key, window_seconds + 5)
            count, _ = await pipeline.execute()
        if int(count) > limit:
            raise RateLimitExceededError(
                "Too many authentication attempts; retry after the rate-limit window"
            )
    except RateLimitExceededError:
        raise
    except (RedisError, OSError, TimeoutError, Exception) as exc:
        logger.warning(
            "rate_limit_backend_unavailable",
            extra={
                "operation": "auth.rate_limit",
                "status": "degraded",
                "error_code": type(exc).__name__,
            },
        )
    finally:
        if redis is not None:
            try:
                await redis.aclose()
            except Exception:
                pass


@lru_cache
def _recommendation_engine() -> PortfolioRecommendationEngine:
    return RuleBasedPortfolioRecommendationEngine(get_settings())


def get_recommendation_engine() -> PortfolioRecommendationEngine:
    return _recommendation_engine()


async def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(settings_dependency)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AuthenticationError("A valid bearer access token is required")
    payload = decode_token(credentials.credentials, settings, expected_type="access")
    try:
        user_id = uuid.UUID(str(payload["sub"]))
    except (ValueError, TypeError, KeyError) as exc:
        raise AuthenticationError("Access token subject is invalid") from exc
    user = await db.scalar(select(User).where(User.id == user_id))
    if user is None or user.status != UserStatus.ACTIVE:
        raise AuthenticationError("User account is unavailable")
    request.state.user_id = str(user.id)
    return user


async def require_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if user.role != UserRole.ADMIN:
        raise PermissionDeniedError("Administrator access is required")
    return user


DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
SettingsDependency = Annotated[Settings, Depends(settings_dependency)]
RegimeDetectorDependency = Annotated[MarketRegimeDetector, Depends(get_regime_detector)]
MarketDataProviderDependency = Annotated[MarketDataProvider, Depends(get_market_data_provider)]
EmailProviderDependency = Annotated[EmailProvider, Depends(get_email_provider)]
RecommendationEngineDependency = Annotated[
    PortfolioRecommendationEngine, Depends(get_recommendation_engine)
]
