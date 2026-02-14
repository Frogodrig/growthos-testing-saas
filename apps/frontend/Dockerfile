FROM node:20-alpine AS builder

WORKDIR /app

# Copy entire monorepo (needed for workspace resolution)
COPY package.json package-lock.json turbo.json ./
COPY packages/ packages/
COPY services/ services/
COPY apps/ apps/
COPY infrastructure/ infrastructure/

# Install all dependencies
RUN npm ci

# Railway passes service variables as Docker build args
# Declare them so they're available during Vite build
ARG VITE_SAAS_SLUG
ARG VITE_API_URL
ARG VITE_PRODUCT_NAME

# Set as env vars so Vite can read them
ENV VITE_SAAS_SLUG=$VITE_SAAS_SLUG
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PRODUCT_NAME=$VITE_PRODUCT_NAME

RUN cd apps/frontend && npx vite build

# Serve with a lightweight static server
FROM node:20-alpine

RUN npm install -g serve@latest

COPY --from=builder /app/apps/frontend/dist /app/dist

EXPOSE 3000

CMD ["serve", "-s", "/app/dist", "-l", "3000"]
