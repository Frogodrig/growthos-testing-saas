import Fastify from "fastify";
import cors from "@fastify/cors";
import type { SaaSConfig } from "@growthos/shared-types";
import { createCoreEngine, CoreEngine } from "@growthos/core-engine";
import { authMiddleware } from "./middleware/auth";
import { registerLeadRoutes } from "./routes/leads";
import { registerMetricsRoutes } from "./routes/metrics";
import { registerDevRoutes } from "./routes/dev";

export interface GatewayConfig {
  port: number;
  host: string;
  saasConfig: SaaSConfig;
  databaseUrl: string;
  redisUrl: string;
}

export async function startGateway(config: GatewayConfig): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  // Initialize core engine
  const engine = createCoreEngine({
    saas: config.saasConfig,
    databaseUrl: config.databaseUrl,
    redisUrl: config.redisUrl,
  });

  // Auth middleware on all /api and /metrics routes
  app.addHook("onRequest", async (request, reply) => {
    const path = request.url;
    if (path.startsWith("/api") || path.startsWith("/metrics")) {
      await authMiddleware(request, reply);
    }
  });

  // Health check (no auth)
  app.get("/health", async () => ({ status: "ok", saas: config.saasConfig.name }));

  // Register routes
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
