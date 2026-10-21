from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Enum, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.common.enums import JobStatus
from app.common.utils import utc_now
from app.core.database import Base, UUIDPrimaryKeyMixin


def enum_values(enum_type: type[JobStatus]) -> list[str]:
    return [item.value for item in enum_type]


class BackgroundJob(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "background_jobs"
    __table_args__ = (Index("ix_background_jobs_type_status", "job_type", "status"),)

    job_type: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, native_enum=False, values_callable=enum_values, length=20), nullable=False
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    input_data: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    output_data: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
