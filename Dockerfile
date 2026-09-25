# --- Builder stage: compile TypeScript ---
# Using a Debian-based (glibc) image, not Alpine, because @temporalio/worker's
# native core-bridge addon needs glibc; musl (Alpine) support is unreliable.
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# --- Runtime stage: slim image with only production deps + compiled JS ---
FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Default command runs the API. docker-compose overrides this for the
# worker service (node dist/temporal/worker.js) so both services share
# this one image instead of maintaining two Dockerfiles.
CMD ["node", "dist/server.js"]
