from __future__ import annotations

import logging
import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app import modules as _mapped_modules  # noqa: F401  # register ORM mappings
from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.core.database import close_database
from app.core.exceptions import AppError
from app.core.logging import configure_logging
from app.core.responses import error_response, success_response

settings = get_settings()
configure_logging(logging.INFO)
logger = logging.getLogger("astera.api")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info("application_started", extra={"operation": "startup", "status": "ready"})
    try:
        yield
    finally:
        await close_database()
        logger.info("application_stopped", extra={"operation": "shutdown", "status": "complete"})


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "Astera simulated investment-advisor API. Suggestions are decision support, "
        "not executed trades or financial advice."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

@app.middleware("http")
async def request_context(request: Request, call_next):  # type: ignore[no-untyped-def]
    request_id_header = request.headers.get("X-Request-ID", "")
    try:
        request_id = str(uuid.UUID(request_id_header)) if request_id_header else str(uuid.uuid4())
    except ValueError:
        request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    started = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - started) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "request_completed",
        extra={
            "request_id": request_id,
            "user_id": getattr(request.state, "user_id", None),
            "operation": f"{request.method} {request.url.path}",
            "duration_ms": duration_ms,
            "status": response.status_code,
        },
    )
    return response


# CORSMiddleware is added after @app.middleware so it becomes the outermost layer,
# ensuring all responses (including errors and preflight OPTIONS) have CORS headers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


def _cors_headers(request: Request, extra_headers: dict[str, str] | None = None) -> dict[str, str]:
    headers = dict(extra_headers or {})
    origin = request.headers.get("origin")
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "*"
        headers["Access-Control-Allow-Headers"] = "*"
        headers["Vary"] = "Origin"
    return headers


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    logger.warning(
        "application_error",
        extra={
            "request_id": getattr(request.state, "request_id", None),
            "user_id": getattr(request.state, "user_id", None),
            "operation": f"{request.method} {request.url.path}",
            "status": exc.status_code,
            "error_code": exc.code,
        },
    )
    return JSONResponse(
        status_code=exc.status_code,
        headers=_cors_headers(request),
        content=jsonable_encoder(error_response(request, exc.code, exc.message, exc.details)),
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        headers=_cors_headers(request),
        content=jsonable_encoder(
            error_response(
                request,
                "VALIDATION_ERROR",
                "Request validation failed",
                [
                    {
                        key: value
                        for key, value in item.items()
                        if key not in {"url", "ctx", "input"}
                    }
                    for item in exc.errors()
                ],
            )
        ),
    )


@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
    code = "HTTP_ERROR"
    if exc.status_code == 404:
        code = "RESOURCE_NOT_FOUND"
    elif exc.status_code == 401:
        code = "AUTHENTICATION_REQUIRED"
    elif exc.status_code == 403:
        code = "PERMISSION_DENIED"
    return JSONResponse(
        status_code=exc.status_code,
        headers=_cors_headers(request, exc.headers),
        content=jsonable_encoder(error_response(request, code, str(exc.detail))),
    )


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    logger.error(
        "database_error",
        exc_info=not settings.is_production,
        extra={
            "request_id": getattr(request.state, "request_id", None),
            "operation": f"{request.method} {request.url.path}",
            "status": 503,
            "error_code": "DATABASE_ERROR",
        },
    )
    return JSONResponse(
        status_code=503,
        headers=_cors_headers(request),
        content=error_response(request, "DATABASE_ERROR", "Database operation failed"),
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "unhandled_error",
        exc_info=not settings.is_production,
        extra={
            "request_id": getattr(request.state, "request_id", None),
            "operation": f"{request.method} {request.url.path}",
            "status": 500,
            "error_code": "INTERNAL_SERVER_ERROR",
        },
    )
    return JSONResponse(
        status_code=500,
        headers=_cors_headers(request),
        content=error_response(request, "INTERNAL_SERVER_ERROR", "An unexpected error occurred"),
    )


@app.get("/health", tags=["system"])
async def root_health(request: Request) -> dict[str, object]:
    return success_response(request, {"status": "healthy", "service": "astera-api"})


app.include_router(api_v1_router, prefix=settings.api_prefix)
