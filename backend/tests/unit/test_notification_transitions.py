from __future__ import annotations

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import NotificationStatus, UserRole, UserStatus
from app.core.config import Settings
from app.core.exceptions import ConflictError
from app.modules.notifications.models import Notification
from app.modules.notifications.service import NotificationService
from app.modules.users.models import User

INERT_HASH_VALUE = "not-used-in-this-test"
TEST_SIGNING_MATERIAL = "unit-test-signing-material-longer-than-32-characters"


def _settings() -> Settings:
    return Settings(jwt_secret_key=TEST_SIGNING_MATERIAL)


async def _notification(
    session: AsyncSession, *, status: NotificationStatus
) -> tuple[uuid.UUID, uuid.UUID]:
    user = User(
        id=uuid.uuid4(),
        email=f"{uuid.uuid4().hex}@example.com",
        password_hash=INERT_HASH_VALUE,
        full_name="Notification Test",
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    notification = Notification(
        id=uuid.uuid4(),
        user_id=user.id,
        type="REGIME_CHANGED",
        title="Market regime changed",
        summary="Review an estimated rebalance.",
        status=status,
    )
    session.add_all([user, notification])
    await session.commit()
    return notification.id, user.id


async def test_unread_notification_can_be_read_then_dismissed_idempotently(
    sqlite_session: AsyncSession,
) -> None:
    notification_id, user_id = await _notification(sqlite_session, status=NotificationStatus.UNREAD)
    service = NotificationService(sqlite_session, _settings())

    read = await service.mark_read(notification_id=notification_id, user_id=user_id)
    dismissed = await service.dismiss(notification_id=notification_id, user_id=user_id)
    dismissed_again = await service.dismiss(notification_id=notification_id, user_id=user_id)

    assert read.status == NotificationStatus.READ
    assert read.read_at is not None
    assert dismissed.status == NotificationStatus.DISMISSED
    assert dismissed.actioned_at is not None
    assert dismissed_again.status == NotificationStatus.DISMISSED
    assert dismissed_again.actioned_at == dismissed.actioned_at


async def test_dismissed_notification_cannot_be_applied(sqlite_session: AsyncSession) -> None:
    notification_id, user_id = await _notification(
        sqlite_session, status=NotificationStatus.DISMISSED
    )
    service = NotificationService(sqlite_session, _settings())

    with pytest.raises(ConflictError, match="dismissed"):
        await service.apply(notification_id=notification_id, user_id=user_id)


async def test_applied_notification_cannot_be_dismissed(sqlite_session: AsyncSession) -> None:
    notification_id, user_id = await _notification(
        sqlite_session, status=NotificationStatus.APPLIED
    )
    service = NotificationService(sqlite_session, _settings())

    with pytest.raises(ConflictError, match="applied"):
        await service.dismiss(notification_id=notification_id, user_id=user_id)
