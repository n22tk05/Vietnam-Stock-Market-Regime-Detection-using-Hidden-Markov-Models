from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.common.enums import MarketRegimeCode, ModelStatus
from app.common.utils import utc_now
from app.core.database import Base, UUIDPrimaryKeyMixin


def enum_values(enum_type: type[MarketRegimeCode] | type[ModelStatus]) -> list[str]:
    return [item.value for item in enum_type]


class MarketRegime(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "market_regimes"
    __table_args__ = (
        CheckConstraint(
            "probability IS NULL OR (probability >= 0 AND probability <= 1)",
            name="probability_range",
        ),
        Index("ix_market_regimes_current", "is_current"),
        Index("ix_market_regimes_data_date", "data_date"),
        Index(
            "uq_market_regimes_one_current",
            "is_current",
            unique=True,
            postgresql_where=text("is_current = true"),
            sqlite_where=text("is_current = 1"),
        ),
        UniqueConstraint(
            "code",
            "data_date",
            "model_version",
            name="market_regime_artifact_result",
        ),
    )

    code: Mapped[MarketRegimeCode] = mapped_column(
        Enum(MarketRegimeCode, native_enum=False, values_callable=enum_values, length=20),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    probability: Mapped[Decimal | None] = mapped_column(Numeric(12, 10))
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    data_date: Mapped[date | None] = mapped_column(Date)
    model_version: Mapped[str | None] = mapped_column(String(160))
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    regime_metadata: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class ModelVersion(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "model_versions"
    __table_args__ = (Index("ix_model_versions_type_status", "model_type", "status"),)

    model_type: Mapped[str] = mapped_column(String(50), nullable=False)
    version: Mapped[str] = mapped_column(String(160), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[ModelStatus] = mapped_column(
        Enum(ModelStatus, native_enum=False, values_callable=enum_values, length=20),
        nullable=False,
    )
    metrics: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    trained_from: Mapped[date | None] = mapped_column(Date)
    trained_to: Mapped[date | None] = mapped_column(Date)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
