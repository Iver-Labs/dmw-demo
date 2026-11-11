# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:24-slim

# ---------- base: shared settings ----------
FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- deps: exact lockfile install (incl. dev deps for the build) ----------
FROM base AS deps
COPY package.json package-lock.json ./
# onnxruntime-node's install script otherwise downloads GPU (CUDA) binaries from NuGet;
# embeddings run on CPU, so skip it.
RUN --mount=type=cache,target=/root/.npm ONNXRUNTIME_NODE_INSTALL=skip npm ci

# ---------- builder: compile the app ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The index is built ahead of time by `npm run ingest` and committed.
# Fail fast if it's missing instead of shipping a bot with no knowledge.
RUN test -s data/index.json && test -s data/index.meta.json
# Local embedding model (multilingual-e5-small, fp32 like the notebook): pinned revision, every file SHA-256 verified.
RUN node scripts/fetch-model.mjs
RUN npm run build

# ---------- runner: the only stage that ships ----------
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0

# tini as PID 1 forwards SIGTERM to Node
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/data ./data
COPY --from=builder --chown=node:node /app/models ./models
RUN mkdir -p .next/cache && chown node:node .next/cache

USER node
EXPOSE 8080
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
