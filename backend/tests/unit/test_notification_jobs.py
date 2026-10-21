from __future__ import annotations

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import NotificationStatus, UserRole, UserStatus
from app.core.config import Settings
from app.jobs import notification_jobs
from app.modules.notifications.models import Notification
from app.modules.users.models import User, UserPreference

INERT_HASH_VALUE = "not-used-in-this-test"


async def _pending_notification(
    session: AsyncSession,
    *,
    email_notifications: bool,
    in_app_visible: bool,
) -> Notification:
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email=f"{user_id.hex}@example.com",
        password_hash=INERT_HASH_VALUE,
        full_name="Notification Delivery Test",
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    preference = UserPreference(
        user_id=user_id,
        email_notifications=email_notifications,
        in_app_notifications=in_app_visible,
        language="en",
    )
    notification = Notification(
        id=uuid.uuid4(),
        user_id=user_id,
        type="MARKET_REGIME_REBALANCE",
        title="Market regime changed",
        summary="Review the proposed allocation.",
        status=NotificationStatus.UNREAD,
        in_app_visible=in_app_visible,
    )
    session.add_all([user, preference, notification])
    await session.commit()
    return notification


def _patch_email_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> list[dict[str, str]]:
    settings = Settings(email_enabled=True, smtp_host="smtp.example.com")
    sent_messages: list[dict[str, str]] = []

    class FakeSMTPEmailProvider:
        def __init__(self, configured_settings: Settings) -> None:
            assert configured_settings is settings

        async def send(self, *, recipient: str, subject: str, text_body: str) -> bool:
            sent_messages.append(
                {
                    "recipient": recipient,
                    "subject": subject,
                    "text_body": text_body,
                }
            )
            return True

    monkeypatch.setattr(notification_jobs, "get_settings", lambda: settings)
    monkeypatch.setattr(notification_jobs, "SMTPEmailProvider", FakeSMTPEmailProvider)
    return sent_messages


async def test_send_emails_hidden_notification_when_user_opted_in(
    sqlite_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    notification = await _pending_notification(
        sqlite_session,
        email_notifications=True,
        in_app_visible=False,
    )
    sent_messages = _patch_email_provider(monkeypatch)

    result = await notification_jobs._send(sqlite_session)

    assert result == {"sent": 1, "failed": 0, "eligible": 1}
    assert sent_messages == [
        {
            "recipient": f"{notification.user_id.hex}@example.com",
            "subject": notification.title,
            "text_body": (
                f"{notification.summary}\n\n"
                "Astera provides simulated allocations and decision support; "
                "no trade was executed."
            ),
        }
    ]
    await sqlite_session.refresh(notification)
    assert notification.email_sent_at is not None


async def test_send_skips_notification_when_user_opted_out_of_email(
    sqlite_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    notification = await _pending_notification(
        sqlite_session,
        email_notifications=False,
        in_app_visible=False,
    )
    sent_messages = _patch_email_provider(monkeypatch)

    result = await notification_jobs._send(sqlite_session)

    assert result == {"sent": 0, "failed": 0, "eligible": 0}
    assert sent_messages == []
    await sqlite_session.refresh(notification)
    assert notification.email_sent_at is None
