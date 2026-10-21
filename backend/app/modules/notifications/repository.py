from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import cast

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import NotificationStatus
from app.modules.notifications.models import Notification


class NotificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_for_user(
        self, notification_id: uuid.UUID, user_id: uuid.UUID, *, for_update: bool = False
    ) -> Notification | None:
        statement = select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user_id
        )
        if for_update:
            statement = statement.with_for_update(of=Notification)
        return cast(Notification | None, await self.session.scalar(statement))

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        status: NotificationStatus | None,
        offset: int,
        limit: int,
    ) -> tuple[Sequence[Notification], int]:
        filters = [
            Notification.user_id == user_id,
            Notification.in_app_visible.is_(True),
        ]
        if status is not None:
            filters.append(Notification.status == status)
        items = (
            await self.session.scalars(
                select(Notification)
                .where(*filters)
                .order_by(Notification.created_at.desc(), Notification.id.desc())
                .offset(offset)
                .limit(limit)
            )
        ).all()
        total = await self.session.scalar(
            select(func.count()).select_from(Notification).where(*filters)
        )
        return items, int(total or 0)

    async def add(self, notification: Notification) -> Notification:
        self.session.add(notification)
        await self.session.flush()
        return notification
