from __future__ import annotations

import uuid
from datetime import datetime

from app.common.enums import NotificationStatus
from app.core.responses import ApiModel
from app.modules.portfolios.schemas import PortfolioResponse


class NotificationResponse(ApiModel):
    id: uuid.UUID
    type: str
    title: str
    summary: str
    recommendation_id: uuid.UUID | None = None
    portfolio_id: uuid.UUID | None = None
    status: NotificationStatus
    read_at: datetime | None = None
    actioned_at: datetime | None = None
    email_sent_at: datetime | None = None
    created_at: datetime


class NotificationListResponse(ApiModel):
    items: list[NotificationResponse]
    total: int
    page: int
    page_size: int


class NotificationActionResponse(ApiModel):
    notification: NotificationResponse
    portfolio: PortfolioResponse | None = None
