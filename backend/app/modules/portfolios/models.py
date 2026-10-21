from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.common.enums import PortfolioChangeType, PortfolioStatus
from app.common.utils import utc_now
from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


def enum_values(enum_type: type[object]) -> list[str]:
    return [item.value for item in enum_type]  # type: ignore[attr-defined]


class Portfolio(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "portfolios"
    __table_args__ = (
        CheckConstraint("current_version >= 1", name="current_version_positive"),
        CheckConstraint("initial_capital >= 1000000", name="initial_capital_minimum"),
        Index("ix_portfolios_user_status", "user_id", "status"),
        Index(
            "uq_portfolios_one_active_user",
            "user_id",
            unique=True,
            postgresql_where=text("status = 'ACTIVE'"),
            sqlite_where=text("status = 'ACTIVE'"),
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[PortfolioStatus] = mapped_column(
        Enum(PortfolioStatus, native_enum=False, values_callable=enum_values, length=20),
        nullable=False,
    )
    current_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    initial_capital: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    current_value: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    confirmed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class PortfolioVersion(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "portfolio_versions"
    __table_args__ = (
        UniqueConstraint("portfolio_id", "version_number", name="portfolio_version_number"),
        CheckConstraint("version_number >= 1", name="version_number_positive"),
        Index("ix_portfolio_versions_effective", "portfolio_id", "effective_at"),
        CheckConstraint("cash_weight >= 0 AND cash_weight <= 1", name="cash_weight_range"),
        CheckConstraint("cash_amount >= 0", name="cash_amount_nonnegative"),
    )

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False
    )
    recommendation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("recommendations.id", ondelete="SET NULL")
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    change_type: Mapped[PortfolioChangeType] = mapped_column(
        Enum(PortfolioChangeType, native_enum=False, values_callable=enum_values, length=40),
        nullable=False,
    )
    regime_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("market_regimes.id", ondelete="RESTRICT"), nullable=False
    )
    total_value: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    cash_weight: Mapped[Decimal] = mapped_column(Numeric(12, 10), nullable=False)
    cash_amount: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    effective_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class PortfolioAllocation(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "portfolio_allocations"
    __table_args__ = (
        UniqueConstraint("portfolio_version_id", "stock_id", name="portfolio_version_stock"),
        CheckConstraint("weight >= 0 AND weight <= 1", name="weight_range"),
    )

    portfolio_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("portfolio_versions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stock_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stocks.id", ondelete="RESTRICT"), nullable=False
    )
    weight: Mapped[Decimal] = mapped_column(Numeric(12, 10), nullable=False)
    invested_amount: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    entry_price: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False)
    estimated_quantity: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class PortfolioSnapshot(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "portfolio_snapshots"
    __table_args__ = (
        UniqueConstraint("portfolio_id", "snapshot_date", name="portfolio_snapshot_date"),
        Index("ix_portfolio_snapshots_date", "snapshot_date"),
    )

    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False
    )
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_value: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    profit_loss: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    pnl_percent: Mapped[Decimal] = mapped_column(Numeric(14, 8), nullable=False)
    regime_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("market_regimes.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
