from __future__ import annotations

import logging
import smtplib
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, Request, status

from app.api.dependencies import (
    CurrentUser,
    DbSession,
    EmailProviderDependency,
    SettingsDependency,
    enforce_auth_rate_limit,
)
from app.core.responses import success_response
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    MessageRead,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
)
from app.modules.auth.service import AuthService
from app.modules.users.schemas import UserRead

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    request: Request,
    db: DbSession,
    settings: SettingsDependency,
) -> dict[str, Any]:
    result = await AuthService(db, settings).register(payload)
    return success_response(request, result)


@router.post("/login", dependencies=[Depends(enforce_auth_rate_limit)])
async def login(
    payload: LoginRequest,
    request: Request,
    db: DbSession,
    settings: SettingsDependency,
) -> dict[str, Any]:
    result = await AuthService(db, settings).login(payload)
    return success_response(request, result)


@router.post("/refresh")
async def refresh(
    payload: RefreshRequest,
    request: Request,
    db: DbSession,
    settings: SettingsDependency,
) -> dict[str, Any]:
    result = await AuthService(db, settings).refresh(payload.refresh_token)
    return success_response(request, result)


@router.post("/logout")
async def logout(
    payload: LogoutRequest,
    request: Request,
    db: DbSession,
    settings: SettingsDependency,
) -> dict[str, Any]:
    await AuthService(db, settings).logout(payload.refresh_token)
    return success_response(request, MessageRead(message="Logged out successfully"))


@router.post("/forgot-password", dependencies=[Depends(enforce_auth_rate_limit)])
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: DbSession,
    settings: SettingsDependency,
    email_provider: EmailProviderDependency,
) -> dict[str, Any]:
    issue = await AuthService(db, settings).request_password_reset(str(payload.email))
    if issue is not None:
        reset_url = (
            f"{settings.frontend_url.rstrip('/')}/reset-password"
            f"?token={quote(issue.token, safe='')}"
        )
        body = (
            "A password reset was requested for your Astera account.\n\n"
            f"Open this link before {issue.expires_at.isoformat()}:\n{reset_url}\n\n"
            "If you did not request this, you can ignore this message."
        )
        try:
            await email_provider.send(
                recipient=issue.email,
                subject="Reset your Astera password",
                text_body=body,
            )
        except (OSError, RuntimeError, TimeoutError, smtplib.SMTPException) as exc:
            logger.error(
                "password_reset_delivery_failed",
                extra={
                    "operation": "auth.forgot_password",
                    "status": "failed",
                    "error_code": "EMAIL_DELIVERY_FAILED",
                    "error_type": type(exc).__name__,
                },
            )
    message = "If the account exists, password reset instructions will be sent"
    return success_response(request, MessageRead(message=message))


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: DbSession,
    settings: SettingsDependency,
) -> dict[str, Any]:
    await AuthService(db, settings).reset_password(
        raw_token=payload.token,
        new_password=payload.new_password,
    )
    return success_response(request, MessageRead(message="Password reset successfully"))


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    db: DbSession,
    settings: SettingsDependency,
    current_user: CurrentUser,
) -> dict[str, Any]:
    await AuthService(db, settings).change_password(user=current_user, payload=payload)
    message = "Password changed; all refresh sessions have been revoked"
    return success_response(request, MessageRead(message=message))


@router.get("/me")
async def auth_me(current_user: CurrentUser, request: Request) -> dict[str, Any]:
    return success_response(request, UserRead.model_validate(current_user))
