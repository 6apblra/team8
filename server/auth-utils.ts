import jwt from "jsonwebtoken";
import { log } from "./logger";

// Lazy DB imports — only loaded when blacklist functions are called.
// This keeps pure JWT functions testable without DB dependency.
async function getDb() {
  const { db } = await import("./db");
  const { tokenBlacklist } = await import("@shared/schema");
  const { eq, lt } = await import("drizzle-orm");
  return { db, tokenBlacklist, eq, lt };
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

// In-memory cache to avoid DB hit on every request
const blacklistCache = new Set<string>();

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: "refresh" }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    if (blacklistCache.has(token)) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    if (blacklistCache.has(token)) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      type?: string;
    };
    if (decoded.type !== "refresh") return null;
    return { userId: decoded.userId };
  } catch (error) {
    return null;
  }
}

/**
 * Blacklist a token — persists to DB and adds to in-memory cache.
 */
export async function blacklistToken(token: string): Promise<void> {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    blacklistCache.add(token);

    const { db, tokenBlacklist } = await getDb();
    await db.insert(tokenBlacklist)
      .values({ token, expiresAt })
      .onConflictDoNothing();
  } catch (error) {
    log.error({ err: error }, "Failed to blacklist token");
    blacklistCache.add(token);
  }
}

/**
 * Check if a token is blacklisted (DB check, used for refresh tokens).
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  if (blacklistCache.has(token)) return true;
  const { db, tokenBlacklist, eq } = await getDb();
  const [row] = await db.select().from(tokenBlacklist).where(eq(tokenBlacklist.token, token));
  if (row) {
    blacklistCache.add(token);
    return true;
  }
  return false;
}

/**
 * Load blacklisted tokens from DB into memory cache on startup.
 */
export async function loadBlacklistCache(): Promise<void> {
  try {
    const { db, tokenBlacklist } = await getDb();
    const rows = await db.select({ token: tokenBlacklist.token }).from(tokenBlacklist);
    for (const row of rows) {
      blacklistCache.add(row.token);
    }
    log.info(`Loaded ${rows.length} blacklisted tokens into cache`);
  } catch (error) {
    log.error({ err: error }, "Failed to load blacklist cache");
  }
}

/**
 * Cleanup expired blacklisted tokens from DB and cache.
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const { db, tokenBlacklist, lt } = await getDb();
  const now = new Date();
  const result = await db.delete(tokenBlacklist).where(lt(tokenBlacklist.expiresAt, now));

  // Also clean cache
  for (const token of blacklistCache) {
    try {
      jwt.verify(token, JWT_SECRET);
    } catch {
      blacklistCache.delete(token);
    }
  }

  return result.rowCount ?? 0;
}
