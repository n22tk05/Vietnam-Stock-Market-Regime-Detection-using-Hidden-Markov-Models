from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import (
    MarketRegimeCode,
    PortfolioChangeType,
    PortfolioStatus,
    UserRole,
    UserStatus,
)
from app.common.utils import utc_now
from app.modules.market_regimes.models import MarketRegime
from app.modules.portfolios.models import Portfolio, PortfolioAllocation, PortfolioVersion
from app.modules.stocks.models import Stock
from app.modules.users.models import User

INERT_HASH_VALUE = "not-used-in-this-test"


async def test_new_allocation_creates_version_without_overwriting_history(
    sqlite_session: AsyncSession,
) -> None:
    now = utc_now()
    user = User(
        id=uuid.uuid4(),
        email="versions@example.com",
        password_hash=INERT_HASH_VALUE,
        full_name="Version Test",
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    regime = MarketRegime(
        id=uuid.uuid4(),
        code=MarketRegimeCode.BULL,
        name="Bull",
        probability=Decimal("0.8"),
        detected_at=now,
        data_date=date(2024, 1, 31),
        model_version="test",
        is_current=True,
    )
    stock = Stock(
        id=uuid.uuid4(),
        symbol="AAA",
        company_name="AAA Corp",
        exchange="HOSE",
        is_active=True,
    )
    portfolio = Portfolio(
        id=uuid.uuid4(),
        user_id=user.id,
        name="Simulated portfolio",
        status=PortfolioStatus.ACTIVE,
        current_version=1,
        initial_capital=Decimal("1000000"),
        current_value=Decimal("1000000"),
        confirmed_at=now,
    )
    version_one = PortfolioVersion(
        id=uuid.uuid4(),
        portfolio_id=portfolio.id,
        version_number=1,
        change_type=PortfolioChangeType.INITIAL,
        regime_id=regime.id,
        total_value=Decimal("1000000"),
        cash_weight=Decimal("0.20"),
        cash_amount=Decimal("200000"),
        effective_at=now,
    )
    allocation_one = PortfolioAllocation(
        portfolio_version_id=version_one.id,
        stock_id=stock.id,
        weight=Decimal("0.80"),
        invested_amount=Decimal("800000"),
        entry_price=Decimal("20000"),
        estimated_quantity=Decimal("40"),
    )
    sqlite_session.add_all([user, regime, stock, portfolio, version_one, allocation_one])
    await sqlite_session.commit()

    portfolio.current_version = 2
    version_two = PortfolioVersion(
        id=uuid.uuid4(),
        portfolio_id=portfolio.id,
        version_number=2,
        change_type=PortfolioChangeType.REBALANCE,
        regime_id=regime.id,
        total_value=Decimal("1050000"),
        cash_weight=Decimal("0.30"),
        cash_amount=Decimal("315000"),
        effective_at=utc_now(),
    )
    allocation_two = PortfolioAllocation(
        portfolio_version_id=version_two.id,
        stock_id=stock.id,
        weight=Decimal("0.70"),
        invested_amount=Decimal("735000"),
        entry_price=Decimal("21000"),
        estimated_quantity=Decimal("35"),
    )
    sqlite_session.add_all([version_two, allocation_two])
    await sqlite_session.commit()

    versions = (
        await sqlite_session.scalars(
            select(PortfolioVersion)
            .where(PortfolioVersion.portfolio_id == portfolio.id)
            .order_by(PortfolioVersion.version_number)
        )
    ).all()
    allocations = (
        await sqlite_session.scalars(
            select(PortfolioAllocation).where(
                PortfolioAllocation.portfolio_version_id.in_([version_one.id, version_two.id])
            )
        )
    ).all()

    assert [item.version_number for item in versions] == [1, 2]
    assert versions[0].cash_weight == Decimal("0.2000000000")
    assert versions[1].cash_weight == Decimal("0.3000000000")
    assert {item.portfolio_version_id for item in allocations} == {
        version_one.id,
        version_two.id,
    }
    assert portfolio.current_version == 2
