from __future__ import annotations

import hashlib
import re
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, overload

MONEY_QUANTUM = Decimal("0.01")
WEIGHT_QUANTUM = Decimal("0.00000001")


def utc_now() -> datetime:
    return datetime.now(UTC)


@overload
def as_utc(value: datetime) -> datetime: ...


@overload
def as_utc(value: None) -> None: ...


def as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


def quantize_weight(value: Decimal) -> Decimal:
    return value.quantize(WEIGHT_QUANTUM, rounding=ROUND_HALF_UP)


def to_jsonable(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json", by_alias=True)
    return value


def normalize_symbol(value: str) -> str:
    symbol = re.sub(r"[^A-Za-z0-9._-]", "", value).upper()
    if not symbol:
        raise ValueError("Stock symbol cannot be empty")
    return symbol
