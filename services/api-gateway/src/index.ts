import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import * as Sentry from "@sentry/node";
import type { SaaSConfig } from "@growthos/shared-types";
import { createCoreEngine, CoreEngine } from "@growthos/core-engine";
import { authMiddleware, isAuthExempt, isSubscriptionExempt } from "./middleware/auth";
import { registerLeadRoutes } from "./routes/leads";
import { registerMetricsRoutes } from "./routes/metrics";
import { registerDevRoutes } from "./routes/dev";
import { registerTenantRoutes } from "./routes/tenant";

export interface GatewayConfig {
  port: number;
  host: string;
  saasConfig: SaaSConfig;
  databaseUrl: string;
  redisUrl: string;
}

export async function startGateway(config: GatewayConfig): Promise<void> {
  // Initialize Sentry if DSN is configured
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: 0.1,
    });
    console.log("[Gateway] Sentry error tracking enabled");
  }

  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty" }
          : undefined,
    },
  });

  // Register raw body support for Stripe webhooks
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      // Store raw body for Stripe webhook signature verification
      (req as any).rawBody = body;
      try {
        const json = JSON.parse(body.toString());
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // CORS — restrict in production to known domains
  const corsOrigin =
    process.env.NODE_ENV === "production"
      ? [
          process.env.BOOKER_URL,
          process.env.LEADQUALIFIER_URL,
          process.env.FOLLOWUP_URL,
        ].filter(Boolean) as string[]
      : true;
  await app.register(cors, { origin: corsOrigin });

  // Rate limiting — protect public endpoints
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: (request) => {
      // Use tenant ID if authenticated, otherwise IP
      const auth = (request as any).auth;
      return auth?.tenantId || request.ip;
    },
  });

  // Initialize core engine
  const engine = createCoreEngine({
    saas: config.saasConfig,
    databaseUrl: config.databaseUrl,
    redisUrl: config.redisUrl,
  });

  // Auth middleware on /api and /metrics routes (skip exempt paths)
  app.addHook("onRequest", async (request, reply) => {
    const path = request.url;

    // Skip auth for non-API routes and exempt paths
    if (!path.startsWith("/api") && !path.startsWith("/metrics")) {
      return;
    }

    // These paths don't require auth at all
    if (isAuthExempt(path)) {
      return;
    }

    await authMiddleware(request, reply);
  });

  // Subscription enforcement middleware (after auth)
  app.addHook("onRequest", async (request, reply) => {
    const path = request.url;

    // Skip for non-API, exempt paths, and dev routes
    if (!path.startsWith("/api") && !path.startsWith("/metrics")) {
      return;
    }
    if (isSubscriptionExempt(path)) {
      return;
    }
    if (path.startsWith("/dev")) {
      return;
    }

    // Auth must have run first
    const auth = (request as any).auth;
    if (!auth) return;

    const tenant = await engine.prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      select: { subscriptionStatus: true },
    });

    if (!tenant) {
      return reply.status(404).send({ error: "Tenant not found" });
    }

    const allowed = ["active", "trialing"];
    // In dev mode, also allow "none" so existing dev workflows don't break
    if (process.env.NODE_ENV !== "production") {
      allowed.push("none", "past_due");
    }

    if (!allowed.includes(tenant.subscriptionStatus)) {
      return reply.status(403).send({
        error: "Active subscription required",
        subscriptionStatus: tenant.subscriptionStatus,
      });
    }
  });

  // Global error handler — report to Sentry
  app.setErrorHandler((error, request, reply) => {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: {
          url: request.url,
          method: request.method,
          tenantId: (request as any).auth?.tenantId,
        },
      });
    }
    request.log.error(error);
    reply.status(error.statusCode || 500).send({
      error: error.message || "Internal Server Error",
    });
  });

  // Health check (no auth)
  app.get("/health", async () => ({ status: "ok", saas: config.saasConfig.name }));

  // Register routes
  registerTenantRoutes(app, engine, config.saasConfig);
  registerLeadRoutes(app, engine);
  registerMetricsRoutes(app, engine);

  // Dev routes (no auth required) — only for local development
  if (process.env.NODE_ENV !== "production") {
    registerDevRoutes(app, engine);
    console.log("[Gateway] Dev routes enabled: POST /dev/bootstrap");
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[Gateway] Shutting down...");
    await app.close();
    await engine.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ port: config.port, host: config.host });
  console.log(`[Gateway] "${config.saasConfig.name}" running on ${config.host}:${config.port}`);
}
