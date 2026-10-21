from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import Field, field_validator

from app.common.enums import MarketRegimeCode
from app.core.responses import ApiModel


class MarketRegimeResult(ApiModel):
    regime: MarketRegimeCode
    confidence: float | None = None
    state_id: int | str | None = None
    detected_at: datetime
    data_date: date | None = None
    model_version: str | None = None
    probabilities: dict[str, float] | None = None
    features: dict[str, float] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, value: float | None) -> float | None:
        if value is not None and not 0 <= value <= 1:
            raise ValueError("confidence must be in [0, 1]")
        return value


class AICoreHealth(ApiModel):
    status: Literal["healthy", "degraded", "unavailable"]
    integration_mode: str
    repository_exists: bool
    artifact_exists: bool
    live_inference_available: bool
    latest_data_date: date | None = None
    model_version: str | None = None
    required_files: dict[str, bool] = Field(default_factory=dict)
    dependencies: dict[str, bool] = Field(default_factory=dict)
    details: list[str] = Field(default_factory=list)
