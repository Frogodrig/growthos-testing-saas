import { startGateway } from "@growthos/api-gateway";
import { saasConfig } from "./config";

const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0";
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/growthos";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

startGateway({
  port: PORT,
  host: HOST,
  saasConfig,
  databaseUrl: DATABASE_URL,
  redisUrl: REDIS_URL,
}).catch((err) => {
  console.error("[saas-booker] Failed to start:", err);
  process.exit(1);
});
