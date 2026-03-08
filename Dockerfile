FROM python:3.12-slim AS builder

# Install uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency files first for layer caching
COPY pyproject.toml uv.lock ./

# Install dependencies into a virtual env (no editable install needed)
RUN uv sync --frozen --no-dev --no-install-project

# --- Runtime stage ---
FROM python:3.12-slim

# Run as non-root user for security
RUN groupadd -r council && useradd -r -g council -d /app -s /sbin/nologin council

WORKDIR /app

# Copy virtual env from builder
COPY --from=builder /app/.venv /app/.venv

# Copy application code
COPY backend/ backend/

# Create data directories (storage/cache) owned by non-root user
RUN mkdir -p data/conversations data/cache && chown -R council:council /app

# Switch to non-root user
USER council

# Use the virtual env's Python
ENV PATH="/app/.venv/bin:$PATH"

# Cloud Run sets PORT; default to 8800
ENV PORT=8800

EXPOSE ${PORT}

# Run with uvicorn — Cloud Run sends SIGTERM for graceful shutdown
# Shell form so $PORT env var expands at runtime
CMD python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT
