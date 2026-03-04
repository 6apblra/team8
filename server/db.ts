import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { log } from "./logger";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// === Pool event monitoring ===

pool.on("error", (err) => {
  log.error({ err }, "Unexpected DB pool error (idle client)");
});

pool.on("connect", () => {
  log.debug("DB pool: new client connected");
});

pool.on("remove", () => {
  log.debug("DB pool: client removed");
});

// === Periodic health check ===

let dbHealthy = true;
const HEALTH_CHECK_INTERVAL = 30_000; // 30 seconds

async function checkDbHealth() {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    if (!dbHealthy) {
      log.info("DB connection restored ✓");
      dbHealthy = true;
    }
  } catch (err) {
    if (dbHealthy) {
      log.error({ err }, "DB health check failed — connection lost");
      dbHealthy = false;
    }
  }
}

export function startDbHealthCheck() {
  setInterval(checkDbHealth, HEALTH_CHECK_INTERVAL);
  log.info("DB health check scheduled (every 30s)");
}

export function isDbHealthy(): boolean {
  return dbHealthy;
}

// === Pool stats ===

export function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };
}

export const db = drizzle(pool, { schema });
