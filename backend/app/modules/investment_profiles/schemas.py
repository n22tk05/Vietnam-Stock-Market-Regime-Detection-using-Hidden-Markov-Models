from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import Field, model_validator

from app.common.enums import InvestmentHorizon, RiskAppetite
from app.core.responses import ApiModel

Capital = Annotated[
    Decimal,
    Field(ge=Decimal("1000000"), max_digits=20, decimal_places=2),
]
Rate = Annotated[
    Decimal,
    Field(ge=Decimal("0"), le=Decimal("1"), max_digits=8, decimal_places=6),
]


class InvestmentProfileCreate(ApiModel):
    capital: Capital
    risk_appetite: RiskAppetite
    investment_horizon: InvestmentHorizon
    expected_return: Rate
    maximum_drawdown: Rate


class InvestmentProfileUpdate(ApiModel):
    capital: Capital | None = None
    risk_appetite: RiskAppetite | None = None
    investment_horizon: InvestmentHorizon | None = None
    expected_return: Rate | None = None
    maximum_drawdown: Rate | None = None

    @model_validator(mode="after")
    def require_change(self) -> InvestmentProfileUpdate:
        if not self.model_fields_set:
            raise ValueError("At least one profile field must be supplied")
        if any(getattr(self, field_name) is None for field_name in self.model_fields_set):
            raise ValueError("Investment profile fields cannot be null")
        return self


class InvestmentProfileRead(ApiModel):
    id: uuid.UUID
    user_id: uuid.UUID
    capital: Decimal
    risk_appetite: RiskAppetite
    investment_horizon: InvestmentHorizon
    expected_return: Decimal
    maximum_drawdown: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime
