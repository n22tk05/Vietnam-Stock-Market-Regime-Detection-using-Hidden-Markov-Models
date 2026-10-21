from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.common.utils import utc_now
from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Stock(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "stocks"

    symbol: Mapped[str] = mapped_column(String(24), unique=True, index=True, nullable=False)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    exchange: Mapped[str] = mapped_column(String(32), nullable=False)
    sector: Mapped[str | None] = mapped_column(String(160), index=True)
    industry: Mapped[str | None] = mapped_column(String(160))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)


class StockPrice(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "stock_prices"
    __table_args__ = (
        UniqueConstraint("stock_id", "trade_date", name="stock_trade_date"),
        CheckConstraint("volume >= 0", name="volume_nonnegative"),
        Index("ix_stock_prices_trade_date", "trade_date"),
    )

    stock_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stocks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    trade_date: Mapped[date] = mapped_column(Date, nullable=False)
    open_price: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False)
    high_price: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False)
    low_price: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False)
    close_price: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False)
    adjusted_close: Mapped[Decimal | None] = mapped_column(Numeric(20, 4))
    volume: Mapped[int] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class StockFeature(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "stock_features"
    __table_args__ = (
        UniqueConstraint("stock_id", "feature_date", name="stock_feature_date"),
        Index("ix_stock_features_feature_date", "feature_date"),
    )

    stock_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stocks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    feature_date: Mapped[date] = mapped_column(Date, nullable=False)
    # These four columns mirror the feature names that are actually present in
    # the read-only HMM ticker artifact.  The broader feature set below remains
    # available for the recommendation layer and future data providers.
    log_return: Mapped[Decimal | None] = mapped_column(Numeric(14, 10))
    return_5d: Mapped[Decimal | None] = mapped_column(Numeric(14, 10))
    return_20d: Mapped[Decimal | None] = mapped_column(Numeric(14, 10))
    volume_ratio: Mapped[Decimal | None] = mapped_column(Numeric(18, 8))
    daily_return: Mapped[Decimal | None] = mapped_column(Numeric(14, 10))
    volatility_20d: Mapped[Decimal | None] = mapped_column(Numeric(14, 10))
    momentum_20d: Mapped[Decimal | None] = mapped_column(Numeric(14, 10))
    rsi_14: Mapped[Decimal | None] = mapped_column(Numeric(10, 6))
    macd: Mapped[Decimal | None] = mapped_column(Numeric(14, 8))
    moving_average_20: Mapped[Decimal | None] = mapped_column(Numeric(20, 4))
    moving_average_50: Mapped[Decimal | None] = mapped_column(Numeric(20, 4))
    maximum_drawdown: Mapped[Decimal | None] = mapped_column(Numeric(14, 10))
    beta: Mapped[Decimal | None] = mapped_column(Numeric(14, 8))
    sharpe_ratio: Mapped[Decimal | None] = mapped_column(Numeric(14, 8))
    feature_data: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
