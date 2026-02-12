import { startScheduler } from "@growthos/scheduler";
import { saasConfig } from "./config";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/growthos";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

startScheduler({
  saasConfig,
  databaseUrl: DATABASE_URL,
  redisUrl: REDIS_URL,
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "60000", 10),
}).catch((err) => {
  console.error("[saas-followup:scheduler] Failed to start:", err);
  process.exit(1);
});
