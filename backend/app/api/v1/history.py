from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.common.pagination import PaginationParams, pagination_params
from app.core.responses import success_response
from app.modules.history.service import HistoryService
from app.modules.users.models import User

router = APIRouter(prefix="/history", tags=["History"])


@router.get("")
async def list_history(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends(pagination_params)],
) -> dict[str, object]:
    result = await HistoryService(session).list(
        user_id=current_user.id,
        page=pagination.page,
        page_size=pagination.page_size,
    )
    return success_response(request, result)


@router.get("/{history_id}")
async def get_history_record(
    history_id: uuid.UUID,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict[str, object]:
    result = await HistoryService(session).get(history_id=history_id, user_id=current_user.id)
    return success_response(request, result)
