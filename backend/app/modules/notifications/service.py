from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import NotificationStatus, RecommendationStatus
from app.common.utils import as_utc, utc_now
from app.core.config import Settings
from app.core.exceptions import ConflictError, ResourceNotFoundError
from app.modules.notifications.models import Notification
from app.modules.notifications.repository import NotificationRepository
from app.modules.notifications.schemas import (
    NotificationActionResponse,
    NotificationListResponse,
    NotificationResponse,
)
from app.modules.portfolios.service import PortfolioService
from app.modules.recommendations.repository import RecommendationRepository


class NotificationService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.repository = NotificationRepository(session)
        self.recommendation_repository = RecommendationRepository(session)

    async def list(
        self,
        *,
        user_id: uuid.UUID,
        status: NotificationStatus | None,
        page: int,
        page_size: int,
    ) -> NotificationListResponse:
        items, total = await self.repository.list_for_user(
            user_id,
            status=status,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        return NotificationListResponse(
            items=[self.to_response(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get(self, *, notification_id: uuid.UUID, user_id: uuid.UUID) -> NotificationResponse:
        notification = await self.repository.get_for_user(notification_id, user_id)
        if notification is None:
            raise ResourceNotFoundError("Notification not found")
        return self.to_response(notification)

    async def mark_read(
        self, *, notification_id: uuid.UUID, user_id: uuid.UUID
    ) -> NotificationResponse:
        notification = await self.repository.get_for_user(notification_id, user_id, for_update=True)
        if notification is None:
            raise ResourceNotFoundError("Notification not found")
        if notification.status == NotificationStatus.UNREAD:
            notification.status = NotificationStatus.READ
            notification.read_at = utc_now()
            await self.session.commit()
        return self.to_response(notification)

    async def apply(
        self, *, notification_id: uuid.UUID, user_id: uuid.UUID
    ) -> NotificationActionResponse:
        notification = await self.repository.get_for_user(notification_id, user_id, for_update=True)
        if notification is None:
            raise ResourceNotFoundError("Notification not found")
        portfolio_service = PortfolioService(self.session, self.settings)
        if notification.status == NotificationStatus.APPLIED:
            portfolio = await portfolio_service.get_current(user_id=user_id)
            return NotificationActionResponse(
                notification=self.to_response(notification), portfolio=portfolio
            )
        if notification.status == NotificationStatus.DISMISSED:
            raise ConflictError("A dismissed notification cannot be applied")
        if notification.recommendation_id is None:
            raise ConflictError("Notification has no recommendation to apply")

        now = utc_now()
        try:
            portfolio = await portfolio_service.apply_recommendation(
                recommendation_id=notification.recommendation_id,
                user_id=user_id,
                status_after=RecommendationStatus.APPLIED,
                commit=False,
            )
            notification.status = NotificationStatus.APPLIED
            notification.read_at = notification.read_at or now
            notification.actioned_at = now
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise
        return NotificationActionResponse(
            notification=self.to_response(notification), portfolio=portfolio
        )

    async def dismiss(
        self, *, notification_id: uuid.UUID, user_id: uuid.UUID
    ) -> NotificationResponse:
        notification = await self.repository.get_for_user(notification_id, user_id, for_update=True)
        if notification is None:
            raise ResourceNotFoundError("Notification not found")
        if notification.status == NotificationStatus.DISMISSED:
            return self.to_response(notification)
        if notification.status == NotificationStatus.APPLIED:
            raise ConflictError("An applied notification cannot be dismissed")
        now = utc_now()
        try:
            if notification.recommendation_id is not None:
                recommendation = await self.recommendation_repository.get_for_user(
                    notification.recommendation_id, user_id, for_update=True
                )
                if (
                    recommendation is not None
                    and recommendation.recommendation.status == RecommendationStatus.GENERATED
                ):
                    recommendation.recommendation.status = RecommendationStatus.DISMISSED
            notification.status = NotificationStatus.DISMISSED
            notification.read_at = notification.read_at or now
            notification.actioned_at = now
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise
        return self.to_response(notification)

    async def create(
        self,
        *,
        user_id: uuid.UUID,
        notification_type: str,
        title: str,
        summary: str,
        recommendation_id: uuid.UUID | None,
        portfolio_id: uuid.UUID | None,
        in_app_visible: bool = True,
        commit: bool = True,
    ) -> NotificationResponse:
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            summary=summary,
            recommendation_id=recommendation_id,
            portfolio_id=portfolio_id,
            status=NotificationStatus.UNREAD,
            in_app_visible=in_app_visible,
            created_at=utc_now(),
        )
        await self.repository.add(notification)
        if commit:
            await self.session.commit()
        return self.to_response(notification)

    @staticmethod
    def to_response(notification: Notification) -> NotificationResponse:
        return NotificationResponse(
            id=notification.id,
            type=notification.type,
            title=notification.title,
            summary=notification.summary,
            recommendation_id=notification.recommendation_id,
            portfolio_id=notification.portfolio_id,
            status=notification.status,
            read_at=as_utc(notification.read_at),
            actioned_at=as_utc(notification.actioned_at),
            email_sent_at=as_utc(notification.email_sent_at),
            created_at=as_utc(notification.created_at),
        )
