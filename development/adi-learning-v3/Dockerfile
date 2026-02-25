# ── Stage 1: Build ────────────────────────────────────────
FROM oven/bun:1 AS build

WORKDIR /app

# Copy workspace root config
COPY package.json bun.lock* ./

# Copy all package.json files for workspace resolution
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

# Install dependencies
RUN bun install --frozen-lockfile || bun install

# Copy source code
COPY packages/shared/ packages/shared/
COPY apps/frontend/ apps/frontend/
COPY apps/backend/ apps/backend/

# Build frontend (Vite copies public/ contents including audio/ to dist/)
RUN bun run build

# ── Stage 2: Runtime ──────────────────────────────────────
FROM oven/bun:1-slim AS runtime

WORKDIR /app

# Copy workspace root config
COPY package.json bun.lock* ./

# Copy package.json files for workspace resolution
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

# Install production dependencies only
RUN bun install --production --frozen-lockfile || bun install --production

# Copy shared package (imported by backend at runtime)
COPY packages/shared/ packages/shared/

# Copy backend source
COPY apps/backend/src/ apps/backend/src/

# Copy built frontend from build stage
COPY --from=build /app/apps/frontend/dist/ apps/frontend/dist/

# Create data directory for SQLite
RUN mkdir -p apps/backend/data

# Cloud Run sets PORT env var (default 8080)
ENV PORT=8080
EXPOSE 8080

# Start the backend (serves API + static frontend)
CMD ["bun", "run", "apps/backend/src/index.ts"]
