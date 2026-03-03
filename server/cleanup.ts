import { db } from "./db";
import { dailySwipeCounts, dailySuperLikeCounts, profiles, swipes } from "@shared/schema";
import { lt, and, eq, sql } from "drizzle-orm";
import { log } from "./logger";

const SIX_HOURS = 6 * 60 * 60 * 1000;

/**
 * Periodic cleanup of stale data:
 * - Daily swipe/super-like counts older than 2 days
 * - Expired "available now" statuses
 * - Left swipes older than 30 days (max cooldown expired)
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

        // Clean expired left swipes (older than 30 days — max cooldown)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const leftSwipeResult = await db.delete(swipes)
            .where(
                and(
                    eq(swipes.swipeType, "left"),
                    lt(swipes.createdAt!, thirtyDaysAgo)
                )
            );

        log.info(
            {
                swipeCounts: swipeResult.rowCount,
                superLikeCounts: superLikeResult.rowCount,
                availability: availResult.rowCount,
                expiredLeftSwipes: leftSwipeResult.rowCount,
            },
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
