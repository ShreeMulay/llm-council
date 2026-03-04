FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy source
COPY src/ ./src/
COPY tsconfig.json ./

# Copy shared types
COPY ../../shared/ ../shared/

EXPOSE 8080
ENV PORT=8080

CMD ["bun", "src/index.ts"]
