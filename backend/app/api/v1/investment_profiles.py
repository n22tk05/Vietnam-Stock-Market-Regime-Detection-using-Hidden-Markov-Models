from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request, status

from app.api.dependencies import CurrentUser, DbSession, SettingsDependency
from app.core.responses import success_response
from app.modules.investment_profiles.schemas import (
    InvestmentProfileCreate,
    InvestmentProfileRead,
    InvestmentProfileUpdate,
)
from app.modules.investment_profiles.service import InvestmentProfileService

router = APIRouter(prefix="/investment-profile", tags=["Investment Profile"])


@router.get("")
async def get_investment_profile(
    request: Request,
    db: DbSession,
    settings: SettingsDependency,
    current_user: CurrentUser,
) -> dict[str, Any]:
    profile = await InvestmentProfileService(db, settings).get_active(user_id=current_user.id)
    return success_response(request, InvestmentProfileRead.model_validate(profile))


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_investment_profile(
    payload: InvestmentProfileCreate,
    request: Request,
    db: DbSession,
    settings: SettingsDependency,
    current_user: CurrentUser,
) -> dict[str, Any]:
    profile = await InvestmentProfileService(db, settings).create(
        user_id=current_user.id,
        payload=payload,
    )
    return success_response(request, InvestmentProfileRead.model_validate(profile))


@router.patch("")
async def update_investment_profile(
    payload: InvestmentProfileUpdate,
    request: Request,
    db: DbSession,
    settings: SettingsDependency,
    current_user: CurrentUser,
) -> dict[str, Any]:
    profile = await InvestmentProfileService(db, settings).update(
        user_id=current_user.id,
        payload=payload,
    )
    return success_response(request, InvestmentProfileRead.model_validate(profile))
