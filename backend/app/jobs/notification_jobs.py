from __future__ import annotations

import smtplib
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import NotificationStatus, UserStatus
from app.common.utils import utc_now
from app.core.config import get_settings
from app.integrations.email.provider import SMTPEmailProvider
from app.jobs.base import run_background_job
from app.jobs.celery_app import celery_app
from app.modules.notifications.models import Notification
from app.modules.users.models import User, UserPreference


async def _send(session: AsyncSession) -> dict[str, Any]:
    settings = get_settings()
    if not settings.email_enabled:
        return {"sent": 0, "skipped": "email_disabled"}
    provider = SMTPEmailProvider(settings)
    rows = (
        await session.execute(
            select(Notification, User.email)
            .join(User, User.id == Notification.user_id)
            .join(UserPreference, UserPreference.user_id == User.id)
            .where(
                Notification.email_sent_at.is_(None),
                Notification.status.in_([NotificationStatus.UNREAD, NotificationStatus.READ]),
                User.status == UserStatus.ACTIVE,
                UserPreference.email_notifications.is_(True),
            )
            .order_by(Notification.created_at)
            .limit(100)
        )
    ).all()
    sent = 0
    failures = 0
    for notification, email in rows:
        try:
            accepted = await provider.send(
                recipient=email,
                subject=notification.title,
                text_body=(
                    f"{notification.summary}\n\n"
                    "Astera provides simulated allocations and decision support; "
                    "no trade was executed."
                ),
            )
        except (OSError, RuntimeError, TimeoutError, smtplib.SMTPException):
            failures += 1
            continue
        if accepted:
            notification.email_sent_at = utc_now()
            sent += 1
    await session.commit()
    return {"sent": sent, "failed": failures, "eligible": len(rows)}


@celery_app.task(name="astera.send_pending_notifications")
def send_pending_notifications() -> dict[str, Any]:
    return run_background_job(job_type="send_pending_notifications", input_data=None, handler=_send)
