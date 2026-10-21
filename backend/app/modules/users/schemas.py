from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import EmailStr, Field, field_validator, model_validator

from app.common.enums import UserRole, UserStatus
from app.core.responses import ApiModel


def _normalise_email(value: str) -> str:
    return value.strip().lower()


class UserRead(ApiModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    status: UserStatus
    email_verified_at: datetime | None
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserUpdate(ApiModel):
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=2, max_length=160)

    @field_validator("email", mode="before")
    @classmethod
    def normalise_email(cls, value: object) -> object:
        if isinstance(value, str):
            return _normalise_email(value)
        return value

    @field_validator("full_name")
    @classmethod
    def strip_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        name = " ".join(value.split())
        if len(name) < 2:
            raise ValueError("Full name must contain at least 2 characters")
        return name

    @model_validator(mode="after")
    def require_change(self) -> UserUpdate:
        if not self.model_fields_set:
            raise ValueError("At least one field must be supplied")
        if any(getattr(self, field_name) is None for field_name in self.model_fields_set):
            raise ValueError("User fields cannot be null")
        return self


class UserPreferenceRead(ApiModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email_notifications: bool
    in_app_notifications: bool
    language: str
    created_at: datetime
    updated_at: datetime


class UserPreferenceUpdate(ApiModel):
    email_notifications: bool | None = None
    in_app_notifications: bool | None = None
    language: str | None = Field(
        default=None,
        min_length=2,
        max_length=10,
        pattern=r"^[a-z]{2}(?:-[A-Z]{2})?$",
    )

    @model_validator(mode="after")
    def require_change(self) -> UserPreferenceUpdate:
        if not self.model_fields_set:
            raise ValueError("At least one preference must be supplied")
        if any(getattr(self, field_name) is None for field_name in self.model_fields_set):
            raise ValueError("Preference fields cannot be null")
        return self
