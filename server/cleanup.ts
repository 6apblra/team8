import { db } from "./db";
import { dailySwipeCounts, dailySuperLikeCounts, profiles } from "@shared/schema";
import { lt, and, eq, sql } from "drizzle-orm";
import { log } from "./logger";

const SIX_HOURS = 6 * 60 * 60 * 1000;

/**
 * Periodic cleanup of stale data:
 * - Daily swipe/super-like counts older than 2 days
 * - Expired "available now" statuses
 */
async function runCleanup() {
    try {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0]; // YYYY-MM-DD

        // Clean old daily swipe counts
        const swipeResult = await db.delete(dailySwipeCounts)
            .where(lt(dailySwipeCounts.date, twoDaysAgoStr));

        // Clean old daily super-like counts
        const superLikeResult = await db.delete(dailySuperLikeCounts)
            .where(lt(dailySuperLikeCounts.date, twoDaysAgoStr));

        // Reset expired "available now" statuses
        const now = new Date();
        const availResult = await db.update(profiles)
            .set({ isAvailableNow: false, availableUntil: null })
            .where(
                and(
                    eq(profiles.isAvailableNow, true),
                    lt(profiles.availableUntil!, now)
                )
            );

        log.info(
            { swipes: swipeResult.rowCount, superLikes: superLikeResult.rowCount, availability: availResult.rowCount },
            "Cleanup completed"
        );
    } catch (error) {
        log.error({ err: error }, "Cleanup job failed");
    }
}

/**
 * Start the periodic cleanup job (every 6 hours).
 */
export function startCleanupJob() {
    // Run once at startup (after 30s delay to let DB warm up)
    setTimeout(runCleanup, 30_000);

    // Then every 6 hours
    setInterval(runCleanup, SIX_HOURS);

    log.info("Cleanup job scheduled (every 6 hours)");
}
