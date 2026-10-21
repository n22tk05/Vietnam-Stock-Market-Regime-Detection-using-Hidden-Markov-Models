from __future__ import annotations

from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.common.enums import InvestmentHorizon, RiskAppetite
from app.modules.investment_profiles.schemas import (
    InvestmentProfileCreate,
    InvestmentProfileUpdate,
)


def test_profile_accepts_camel_case_api_fields_and_decimal_money() -> None:
    profile = InvestmentProfileCreate.model_validate(
        {
            "capital": "2500000.50",
            "riskAppetite": "MEDIUM",
            "investmentHorizon": "LONG_TERM",
            "expectedReturn": "0.14",
            "maximumDrawdown": "0.22",
        }
    )

    assert profile.capital == Decimal("2500000.50")
    assert profile.risk_appetite == RiskAppetite.MEDIUM
    assert profile.investment_horizon == InvestmentHorizon.LONG_TERM
    assert profile.model_dump(by_alias=True)["maximumDrawdown"] == Decimal("0.22")


@pytest.mark.parametrize("capital", ["0", "999999.99", "-1000000"])
def test_profile_rejects_capital_below_one_million(capital: str) -> None:
    with pytest.raises(ValidationError):
        InvestmentProfileCreate(
            capital=capital,
            risk_appetite=RiskAppetite.LOW,
            investment_horizon=InvestmentHorizon.SHORT_TERM,
            expected_return=Decimal("0.05"),
            maximum_drawdown=Decimal("0.10"),
        )


@pytest.mark.parametrize(
    ("field_name", "value"),
    [("expected_return", "1.000001"), ("maximum_drawdown", "-0.000001")],
)
def test_profile_rejects_rates_outside_zero_to_one(field_name: str, value: str) -> None:
    values = {
        "capital": Decimal("1000000"),
        "risk_appetite": RiskAppetite.LOW,
        "investment_horizon": InvestmentHorizon.SHORT_TERM,
        "expected_return": Decimal("0.1"),
        "maximum_drawdown": Decimal("0.1"),
    }
    values[field_name] = Decimal(value)

    with pytest.raises(ValidationError):
        InvestmentProfileCreate.model_validate(values)


def test_profile_update_requires_a_non_null_change() -> None:
    with pytest.raises(ValidationError, match="At least one profile field"):
        InvestmentProfileUpdate()
    with pytest.raises(ValidationError, match="cannot be null"):
        InvestmentProfileUpdate(capital=None)
