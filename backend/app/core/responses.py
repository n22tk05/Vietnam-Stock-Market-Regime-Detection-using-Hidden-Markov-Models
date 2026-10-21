from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import Request
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        use_enum_values=True,
    )


def response_meta(request: Request) -> dict[str, str]:
    return {
        "requestId": str(getattr(request.state, "request_id", "unknown")),
        "timestamp": datetime.now(UTC).isoformat(),
    }


def success_response(
    request: Request, data: Any, *, pagination: dict[str, Any] | None = None
) -> dict[str, Any]:
    if hasattr(data, "model_dump"):
        data = data.model_dump(mode="json", by_alias=True)
    elif isinstance(data, list):
        data = [
            item.model_dump(mode="json", by_alias=True) if hasattr(item, "model_dump") else item
            for item in data
        ]
    meta: dict[str, Any] = response_meta(request)
    if pagination is not None:
        meta["pagination"] = pagination
    return {"success": True, "data": data, "meta": meta}


def error_response(
    request: Request, code: str, message: str, details: Any = None
) -> dict[str, Any]:
    return {
        "success": False,
        "error": {"code": code, "message": message, "details": details},
        "meta": response_meta(request),
    }
