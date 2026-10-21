from __future__ import annotations

import asyncio
import uuid
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

import app.modules as app_modules  # noqa: F401 -- register mappings before create_all
from app.api.dependencies import (
    enforce_auth_rate_limit,
    get_db,
    get_market_data_provider,
    get_recommendation_engine,
    get_regime_detector,
    settings_dependency,
)
from app.common.enums import MarketRegimeCode
from app.core.config import Settings, get_settings
from app.core.database import Base
from app.integrations.ai_core.schemas import MarketRegimeResult
from app.integrations.market_data.base import MarketSecuritySnapshot, MarketSnapshot
from app.main import app
from app.modules.recommendations.engine import RuleBasedPortfolioRecommendationEngine
from tests.fakes.ai_core import FakeMarketRegimeDetector
from tests.fakes.market_data import FakeMarketDataProvider


def pytest_configure(config: pytest.Config) -> None:
    # pytest-asyncio 0.25 still calls get_event_loop_policy(). Python 3.14
    # deprecates that helper, while the application supports 3.11 through 3.14
    # and the repository deliberately promotes all other warnings to errors.
    config.addinivalue_line(
        "filterwarnings",
        "ignore:'asyncio\\..*' is deprecated.*:DeprecationWarning:pytest_asyncio.plugin",
    )


@dataclass(frozen=True, slots=True)
class IntegrationHarness:
    client: AsyncClient
    session_factory: async_sessionmaker[AsyncSession]
    settings: Settings


@pytest.fixture
def test_settings() -> Settings:
    # Keep test artifacts inside the writable backend runtime directory. The
    # managed Windows environment may deny access to pytest's global temp root.
    database_path = (
        Path.cwd() / "runtime" / f"astera-integration-{uuid.uuid4().hex}.sqlite3"
    ).resolve()
    database_path.parent.mkdir(parents=True, exist_ok=True)
    return Settings(
        app_env="testing",
        database_url=f"sqlite+aiosqlite:///{database_path.as_posix()}",
        redis_url="redis://127.0.0.1:1/15",
        jwt_secret_key="integration-test-secret-key-with-at-least-32-characters",  # noqa: S106
        recommendation_expire_hours=24,
        recommendation_min_diversification=5,
    )


@pytest_asyncio.fixture
async def test_database(
    test_settings: Settings,
) -> AsyncIterator[tuple[AsyncEngine, async_sessionmaker[AsyncSession]]]:
    engine = create_async_engine(test_settings.database_url, pool_pre_ping=True)

    @event.listens_for(engine.sync_engine, "connect")
    def enable_sqlite_foreign_keys(dbapi_connection: object, _: object) -> None:
        cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        yield engine, factory
    finally:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
        await engine.dispose()
        database_path = Path(test_settings.database_url.removeprefix("sqlite+aiosqlite:///"))
        await asyncio.to_thread(database_path.unlink, missing_ok=True)


@pytest_asyncio.fixture
async def api(
    test_database: tuple[AsyncEngine, async_sessionmaker[AsyncSession]],
    test_settings: Settings,
) -> AsyncIterator[IntegrationHarness]:
    _, session_factory = test_database
    detector = FakeMarketRegimeDetector(
        MarketRegimeResult(
            regime=MarketRegimeCode.BULL,
            confidence=0.91,
            state_id=0,
            detected_at=datetime(2026, 7, 21, 9, 30, tzinfo=UTC),
            data_date=date(2026, 7, 21),
            model_version="test-artifact-sha256",
            probabilities={"BULL": 0.91, "BEAR": 0.03, "SIDEWAY": 0.06},
            features={"rollingVol5": 0.012},
            metadata={"source": "TEST_FAKE", "liveInferencePerformed": False},
        )
    )
    market_data = FakeMarketDataProvider(
        MarketSnapshot(
            data_date=date(2026, 7, 21),
            source="integration-test-fixture",
            securities=[
                MarketSecuritySnapshot(
                    symbol=f"T{index:02d}",
                    company_name=f"Test Company {index:02d}",
                    exchange="HOSE",
                    sector="Test Sector",
                    reference_price=Decimal(20_000 + index * 1_000),
                    daily_return=Decimal("0.001") * index,
                    volatility_20d=Decimal("0.010") + Decimal("0.001") * index,
                    momentum_20d=Decimal("0.020") + Decimal("0.002") * index,
                    momentum_5d=Decimal("0.010") + Decimal("0.001") * index,
                    volume_ratio=Decimal("1.10") + Decimal("0.01") * index,
                    sharpe_ratio=Decimal("0.50") + Decimal("0.05") * index,
                )
                for index in range(1, 9)
            ],
        )
    )
    recommendation_engine = RuleBasedPortfolioRecommendationEngine(test_settings)

    async def override_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            try:
                yield session
            except BaseException:
                await session.rollback()
                raise

    async def bypass_rate_limit() -> None:
        return None

    dependency_overrides: dict[Callable[..., object], Callable[..., object]] = {
        get_db: override_db,
        get_settings: lambda: test_settings,
        settings_dependency: lambda: test_settings,
        get_regime_detector: lambda: detector,
        get_market_data_provider: lambda: market_data,
        get_recommendation_engine: lambda: recommendation_engine,
        enforce_auth_rate_limit: bypass_rate_limit,
    }
    app.dependency_overrides.update(dependency_overrides)
    transport = ASGITransport(app=app, raise_app_exceptions=True)
    try:
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            yield IntegrationHarness(
                client=client,
                session_factory=session_factory,
                settings=test_settings,
            )
    finally:
        for dependency in dependency_overrides:
            app.dependency_overrides.pop(dependency, None)


@pytest.fixture
def register_payload() -> dict[str, str]:
    return {
        "email": "investor@example.com",
        "password": "StrongPass123",
        "fullName": "Astera Investor",
    }
