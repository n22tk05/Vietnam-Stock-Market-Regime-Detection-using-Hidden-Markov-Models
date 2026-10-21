from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.common.enums import NotificationStatus
from app.common.pagination import PaginationParams, pagination_params
from app.core.config import Settings, get_settings
from app.core.responses import success_response
from app.modules.notifications.service import NotificationService
from app.modules.users.models import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
async def list_notifications(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends(pagination_params)],
    settings: Annotated[Settings, Depends(get_settings)],
    status: Annotated[NotificationStatus | None, Query()] = None,
) -> dict[str, object]:
    result = await NotificationService(session, settings).list(
        user_id=current_user.id,
        status=status,
        page=pagination.page,
        page_size=pagination.page_size,
    )
    return success_response(request, result)


@router.get("/{notification_id}")
async def get_notification(
    notification_id: uuid.UUID,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    result = await NotificationService(session, settings).get(
        notification_id=notification_id, user_id=current_user.id
    )
    return success_response(request, result)


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: uuid.UUID,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    result = await NotificationService(session, settings).mark_read(
        notification_id=notification_id, user_id=current_user.id
    )
    return success_response(request, result)


@router.post("/{notification_id}/apply")
async def apply_notification(
    notification_id: uuid.UUID,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    result = await NotificationService(session, settings).apply(
        notification_id=notification_id, user_id=current_user.id
    )
    return success_response(request, result)


@router.post("/{notification_id}/dismiss")
async def dismiss_notification(
    notification_id: uuid.UUID,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    result = await NotificationService(session, settings).dismiss(
        notification_id=notification_id, user_id=current_user.id
    )
    return success_response(request, result)
