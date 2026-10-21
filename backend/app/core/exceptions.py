from __future__ import annotations

from typing import Any


class AppError(Exception):
    status_code = 400
    code = "APPLICATION_ERROR"

    def __init__(self, message: str, *, details: Any = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class AuthenticationError(AppError):
    status_code = 401
    code = "AUTHENTICATION_REQUIRED"


class PermissionDeniedError(AppError):
    status_code = 403
    code = "PERMISSION_DENIED"


class ResourceNotFoundError(AppError):
    status_code = 404
    code = "RESOURCE_NOT_FOUND"


class ConflictError(AppError):
    status_code = 409
    code = "RESOURCE_CONFLICT"


class RateLimitExceededError(AppError):
    status_code = 429
    code = "RATE_LIMIT_EXCEEDED"


class AICoreUnavailableError(AppError):
    status_code = 503
    code = "AI_CORE_UNAVAILABLE"


class AICoreTimeoutError(AppError):
    status_code = 504
    code = "AI_CORE_TIMEOUT"


class InvalidAIOutputError(AppError):
    status_code = 502
    code = "INVALID_AI_OUTPUT"


class MarketDataUnavailableError(AppError):
    status_code = 503
    code = "MARKET_DATA_UNAVAILABLE"


class InvalidStateTransitionError(ConflictError):
    code = "INVALID_STATE_TRANSITION"
