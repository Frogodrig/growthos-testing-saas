# ══════════════════════════════════════════════
# GrowthOS Production Dockerfile
# Multi-stage build for minimal image size
# ══════════════════════════════════════════════

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/event-bus/package.json packages/event-bus/
COPY packages/memory/package.json packages/memory/
COPY packages/rules-engine/package.json packages/rules-engine/
COPY packages/action-layer/package.json packages/action-layer/
COPY packages/agents/package.json packages/agents/
COPY packages/agent-orchestrator/package.json packages/agent-orchestrator/
COPY packages/core-engine/package.json packages/core-engine/
COPY services/api-gateway/package.json services/api-gateway/
COPY services/worker/package.json services/worker/
COPY services/scheduler/package.json services/scheduler/
COPY apps/saas-booker/package.json apps/saas-booker/
COPY apps/saas-leadqualifier/package.json apps/saas-leadqualifier/
COPY apps/saas-followup/package.json apps/saas-followup/
RUN npm ci --omit=dev

# Build
FROM base AS builder
COPY package.json package-lock.json turbo.json ./
COPY packages/ packages/
COPY services/ services/
COPY apps/ apps/
COPY infrastructure/prisma/ infrastructure/prisma/
RUN npm ci
RUN npx prisma generate --schema=infrastructure/prisma/schema.prisma
RUN npx turbo build

# Production image
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 growthos
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services ./services
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/infrastructure/prisma ./infrastructure/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY package.json ./
USER growthos
EXPOSE 3001 3002 3003

# Default: start saas-booker. Override CMD per service.
CMD ["node", "apps/saas-booker/dist/index.js"]
