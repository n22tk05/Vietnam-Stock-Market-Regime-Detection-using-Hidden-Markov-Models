from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from app.api.dependencies import CurrentUser, DbSession
from app.core.responses import success_response
from app.modules.users.schemas import (
    UserPreferenceRead,
    UserPreferenceUpdate,
    UserRead,
    UserUpdate,
)
from app.modules.users.service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me")
async def get_me(current_user: CurrentUser, request: Request) -> dict[str, Any]:
    return success_response(request, UserRead.model_validate(current_user))


@router.patch("/me")
async def update_me(
    payload: UserUpdate,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> dict[str, Any]:
    user = await UserService(db).update_user(user_id=current_user.id, payload=payload)
    return success_response(request, UserRead.model_validate(user))


@router.get("/me/preferences")
async def get_preferences(
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> dict[str, Any]:
    preference = await UserService(db).get_preferences(user_id=current_user.id)
    return success_response(request, UserPreferenceRead.model_validate(preference))


@router.patch("/me/preferences")
async def update_preferences(
    payload: UserPreferenceUpdate,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> dict[str, Any]:
    preference = await UserService(db).update_preferences(
        user_id=current_user.id,
        payload=payload,
    )
    return success_response(request, UserPreferenceRead.model_validate(preference))
