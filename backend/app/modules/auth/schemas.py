from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field, field_validator, model_validator

from app.core.responses import ApiModel
from app.modules.users.schemas import UserRead


def _normalise_email(value: str) -> str:
    return value.strip().lower()


def _validate_password(value: str) -> str:
    if not any(character.isalpha() for character in value):
        raise ValueError("Password must include at least one letter")
    if not any(character.isdigit() for character in value):
        raise ValueError("Password must include at least one number")
    return value


class RegisterRequest(ApiModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=160)

    @field_validator("email", mode="before")
    @classmethod
    def normalise_email(cls, value: object) -> object:
        if isinstance(value, str):
            return _normalise_email(value)
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password(value)

    @field_validator("full_name")
    @classmethod
    def strip_full_name(cls, value: str) -> str:
        name = " ".join(value.split())
        if len(name) < 2:
            raise ValueError("Full name must contain at least 2 characters")
        return name


class LoginRequest(ApiModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalise_email(cls, value: object) -> object:
        if isinstance(value, str):
            return _normalise_email(value)
        return value


class RefreshRequest(ApiModel):
    refresh_token: str = Field(min_length=20, max_length=4096)


class LogoutRequest(ApiModel):
    refresh_token: str = Field(min_length=20, max_length=4096)


class ForgotPasswordRequest(ApiModel):
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalise_email(cls, value: object) -> object:
        if isinstance(value, str):
            return _normalise_email(value)
        return value


class ResetPasswordRequest(ApiModel):
    token: str = Field(min_length=20, max_length=512)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password(value)


class ChangePasswordRequest(ApiModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password(value)

    @model_validator(mode="after")
    def passwords_must_differ(self) -> ChangePasswordRequest:
        if self.current_password == self.new_password:
            raise ValueError("New password must differ from current password")
        return self


class TokenPair(ApiModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"  # noqa: S105 - OAuth token scheme
    access_token_expires_at: datetime
    refresh_token_expires_at: datetime


class AuthSessionRead(ApiModel):
    user: UserRead
    tokens: TokenPair


class MessageRead(ApiModel):
    message: str
