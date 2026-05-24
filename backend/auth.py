"""API key authentication middleware for Cloud Run deployment.

Protects /api/* routes with X-Council-Key header validation.
Skips auth for /health, /, Tailscale IPs, and when COUNCIL_API_KEY is not set (local dev).
"""

import ipaddress
import logging
import secrets

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

from .secrets import COUNCIL_API_KEY

logger = logging.getLogger("llm-council.auth")

# Paths that never require authentication
_PUBLIC_PATHS = frozenset({"/", "/health", "/docs", "/openapi.json"})

# Tailscale IP ranges — authenticated at network layer, skip API key check
_TAILSCALE_NETWORKS = [
    ipaddress.ip_network("100.64.0.0/10"),      # Tailscale IPv4 CGNAT range
    ipaddress.ip_network("fd7a:115c:a1e0::/48"),  # Tailscale IPv6 ULA range
]


def _is_tailscale_ip(client_host: str | None) -> bool:
    """Check if a client IP is within Tailscale ranges."""
    if not client_host:
        return False
    try:
        # X-Forwarded-For may contain multiple comma-separated IPs.
        host = client_host.split(",")[0].strip()
        # Handle bracketed IPv6 with optional port: [fd7a:...]:1234
        if host.startswith("[") and "]" in host:
            host = host[1:host.index("]")]
        # Handle IPv4 with optional port: 100.106.122.86:5173
        elif host.count(":") == 1:
            host_part, port_part = host.rsplit(":", 1)
            if port_part.isdigit():
                host = host_part
        client_ip = ipaddress.ip_address(host)
        return any(client_ip in network for network in _TAILSCALE_NETWORKS)
    except ValueError:
        return False


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """Validate X-Council-Key header on protected routes."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # No key configured — auth disabled (local dev mode)
        if not COUNCIL_API_KEY:
            return await call_next(request)

        # Public paths — always allowed
        if request.url.path in _PUBLIC_PATHS:
            return await call_next(request)

        # Tailscale IPs — authenticated at network layer
        client_host = request.headers.get("X-Forwarded-For", request.client.host if request.client else None)
        if _is_tailscale_ip(client_host):
            logger.debug("Tailscale IP %s — skipping API key check", client_host)
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

        if not secrets.compare_digest(provided_key, COUNCIL_API_KEY):
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
