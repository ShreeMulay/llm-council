# Premier Dialysis Policy Search — Cloud Run Dockerfile
# Bun-based server: serves static frontend + proxies Vertex AI Search API

FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy server and static files
COPY server.ts ./
COPY firebase/public/ ./firebase/public/

# Cloud Run sets PORT env var (default 8080)
ENV PORT=8080

EXPOSE 8080

CMD ["bun", "run", "server.ts"]
