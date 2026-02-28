"""API key authentication middleware for Cloud Run deployment.

Protects /api/* routes with X-Council-Key header validation.
Skips auth for /health, /, and when COUNCIL_API_KEY is not set (local dev).
"""

import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

from .secrets import COUNCIL_API_KEY

logger = logging.getLogger("llm-council.auth")

# Paths that never require authentication
_PUBLIC_PATHS = frozenset({"/", "/health", "/docs", "/openapi.json"})


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """Validate X-Council-Key header on protected routes."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # No key configured — auth disabled (local dev mode)
        if not COUNCIL_API_KEY:
            return await call_next(request)

        # Public paths — always allowed
        if request.url.path in _PUBLIC_PATHS:
            return await call_next(request)

        # Check API key header
        provided_key = request.headers.get("X-Council-Key")
        if not provided_key:
            logger.warning(
                "Missing X-Council-Key header from %s %s",
                request.method,
                request.url.path,
            )
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing X-Council-Key header"},
            )

        if provided_key != COUNCIL_API_KEY:
            logger.warning(
                "Invalid API key from %s %s",
                request.method,
                request.url.path,
            )
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid API key"},
            )

        return await call_next(request)
