from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Enum, ForeignKey, Index, Numeric, text
from sqlalchemy.orm import Mapped, mapped_column

from app.common.enums import InvestmentHorizon, RiskAppetite
from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


def enum_values(enum_type: type[RiskAppetite] | type[InvestmentHorizon]) -> list[str]:
    return [item.value for item in enum_type]


class InvestmentProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "investment_profiles"
    __table_args__ = (
        CheckConstraint("capital >= 1000000", name="capital_minimum"),
        CheckConstraint("expected_return >= 0", name="expected_return_nonnegative"),
        CheckConstraint(
            "maximum_drawdown >= 0 AND maximum_drawdown <= 1",
            name="maximum_drawdown_range",
        ),
        Index("ix_investment_profiles_user_active", "user_id", "is_active"),
        Index(
            "uq_investment_profiles_one_active_user",
            "user_id",
            unique=True,
            postgresql_where=text("is_active = true"),
            sqlite_where=text("is_active = 1"),
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
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
    expected_return: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False)
    maximum_drawdown: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
