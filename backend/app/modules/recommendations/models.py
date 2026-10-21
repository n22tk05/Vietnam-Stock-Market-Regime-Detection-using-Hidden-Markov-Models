from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.common.enums import (
    InvestmentHorizon,
    RecommendationStatus,
    RecommendationType,
    RiskAppetite,
)
from app.common.utils import utc_now
from app.core.database import Base, UUIDPrimaryKeyMixin


def enum_values(enum_type: type[object]) -> list[str]:
    return [item.value for item in enum_type]  # type: ignore[attr-defined]


class Recommendation(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "recommendations"
    __table_args__ = (
        CheckConstraint("capital >= 1000000", name="capital_minimum"),
        CheckConstraint(
            "total_weight >= 0.9999 AND total_weight <= 1.0001", name="total_weight_complete"
        ),
        Index("ix_recommendations_user_generated", "user_id", "generated_at"),
        Index("ix_recommendations_status_expires", "status", "expires_at"),
        CheckConstraint("cash_weight >= 0 AND cash_weight <= 1", name="cash_weight_range"),
        CheckConstraint("cash_amount >= 0", name="cash_amount_nonnegative"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    investment_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("investment_profiles.id", ondelete="RESTRICT"), nullable=False
    )
    regime_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("market_regimes.id", ondelete="RESTRICT"), nullable=False
    )
    type: Mapped[RecommendationType] = mapped_column(
        Enum(RecommendationType, native_enum=False, values_callable=enum_values, length=30),
        nullable=False,
    )
    status: Mapped[RecommendationStatus] = mapped_column(
        Enum(RecommendationStatus, native_enum=False, values_callable=enum_values, length=30),
        nullable=False,
    )
    capital: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    risk_appetite: Mapped[RiskAppetite] = mapped_column(
        Enum(RiskAppetite, native_enum=False, values_callable=enum_values, length=20),
        nullable=False,
    )
    investment_horizon: Mapped[InvestmentHorizon] = mapped_column(
        Enum(InvestmentHorizon, native_enum=False, values_callable=enum_values, length=30),
        nullable=False,
    )
    hmm_model_version: Mapped[str | None] = mapped_column(String(160))
    portfolio_model_version: Mapped[str] = mapped_column(String(160), nullable=False)
    total_weight: Mapped[Decimal] = mapped_column(Numeric(12, 10), nullable=False)
    cash_weight: Mapped[Decimal] = mapped_column(Numeric(12, 10), nullable=False)
    cash_amount: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class RecommendationAllocation(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "recommendation_allocations"
    __table_args__ = (
        UniqueConstraint("recommendation_id", "stock_id", name="recommendation_stock"),
        CheckConstraint("weight >= 0 AND weight <= 1", name="weight_range"),
        CheckConstraint("amount >= 0", name="amount_nonnegative"),
        CheckConstraint("quantity_estimated >= 0", name="quantity_nonnegative"),
        Index("ix_recommendation_allocations_rank", "recommendation_id", "rank"),
    )

    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("recommendations.id", ondelete="CASCADE"), nullable=False
    )
    stock_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stocks.id", ondelete="RESTRICT"), nullable=False
    )
    weight: Mapped[Decimal] = mapped_column(Numeric(12, 10), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    reference_price: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False)
    quantity_estimated: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
