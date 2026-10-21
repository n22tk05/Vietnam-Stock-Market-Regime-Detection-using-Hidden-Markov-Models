from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import Field

from app.common.enums import MarketRegimeCode
from app.core.responses import ApiModel


class MarketRegimeView(ApiModel):
    id: uuid.UUID
    code: MarketRegimeCode
    name: str
    description: str | None = None
    probability: float | None = Field(default=None, ge=0, le=1)
    detected_at: datetime
    data_date: date | None = None
    model_version: str | None = None
    is_current: bool
    metadata: dict[str, Any] = Field(default_factory=dict)


class MarketRegimeDetectionRequest(ApiModel):
    as_of_date: date | None = None


class MarketRegimeSyncView(ApiModel):
    regime: MarketRegimeView
    record_created: bool
    source_operation: Literal["READ_ONLY_ARTIFACT_SYNC"] = "READ_ONLY_ARTIFACT_SYNC"
    live_inference_performed: Literal[False] = False
