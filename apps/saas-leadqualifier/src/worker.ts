import { startWorker } from "@growthos/worker";
import { saasConfig } from "./config";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/growthos";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

startWorker({
  saasConfig,
  databaseUrl: DATABASE_URL,
  redisUrl: REDIS_URL,
}).catch((err) => {
  console.error("[saas-leadqualifier:worker] Failed to start:", err);
  process.exit(1);
});
