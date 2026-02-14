# ══════════════════════════════════════════════
# GrowthOS Production Dockerfile
# Uses node:20-slim (Debian) for Prisma OpenSSL compatibility
# ══════════════════════════════════════════════

FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Build stage — install all deps, generate prisma, compile TS
FROM base AS builder
COPY package.json package-lock.json turbo.json tsconfig.json ./
COPY packages/ packages/
COPY services/ services/
COPY apps/ apps/
COPY infrastructure/prisma/ infrastructure/prisma/
RUN npm ci
RUN npx prisma generate --schema=infrastructure/prisma/schema.prisma
RUN npx turbo build
# Remove devDependencies after build
RUN npm prune --omit=dev

# Production image
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 growthos
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services ./services
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/infrastructure/prisma ./infrastructure/prisma
COPY package.json docker-entrypoint.sh ./
USER growthos
EXPOSE 3001 3002 3003

# Start the SaaS app specified by SAAS_APP env var (default: saas-booker)
ENTRYPOINT ["./docker-entrypoint.sh"]
