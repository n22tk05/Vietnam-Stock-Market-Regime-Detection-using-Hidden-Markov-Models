from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import Settings
from app.integrations.email.base import EmailProvider

logger = logging.getLogger(__name__)


class SMTPEmailProvider(EmailProvider):
    """Small SMTP adapter; disabled deployments never expose reset tokens in API responses."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def send(self, *, recipient: str, subject: str, text_body: str) -> bool:
        if not self.settings.email_enabled:
            logger.info(
                "email_delivery_skipped",
                extra={"operation": "email.send", "status": "disabled"},
            )
            return False
        if not self.settings.smtp_host:
            raise RuntimeError("SMTP_HOST is required when EMAIL_ENABLED=true")
        await asyncio.to_thread(self._send_sync, recipient, subject, text_body)
        return True

    def _send_sync(self, recipient: str, subject: str, text_body: str) -> None:
        smtp_host = self.settings.smtp_host
        if smtp_host is None:
            raise RuntimeError("SMTP_HOST is required when EMAIL_ENABLED=true")
        message = EmailMessage()
        message["From"] = self.settings.email_from
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content(text_body)

        with smtplib.SMTP(smtp_host, self.settings.smtp_port, timeout=15) as client:
            client.starttls()
            if self.settings.smtp_username and self.settings.smtp_password:
                client.login(self.settings.smtp_username, self.settings.smtp_password)
            client.send_message(message)
