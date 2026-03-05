import { db } from "./db";
import { dailySwipeCounts, dailySuperLikeCounts, profiles, swipes } from "@shared/schema";
import { lt, and, eq } from "drizzle-orm";
import { log } from "./logger";
import { cleanupExpiredTokens } from "./auth-utils";

/**
 * Hourly task: reset expired "available now" statuses.
 * Runs every hour since availability can expire at any moment.
 */
async function runHourlyCleanup() {
    try {
        const now = new Date();
        const availResult = await db.update(profiles)
            .set({ isAvailableNow: false, availableUntil: null })
            .where(
                and(
                    eq(profiles.isAvailableNow, true),
                    lt(profiles.availableUntil!, now)
                )
            );

        if ((availResult.rowCount ?? 0) > 0) {
            log.info({ availability: availResult.rowCount }, "Hourly cleanup: reset expired availability");
        }
    } catch (error) {
        log.error({ err: error }, "Hourly cleanup failed");
    }
}

/**
 * Daily task (midnight): clean stale data in a single transaction.
 * - Daily swipe/super-like counts older than 2 days
 * - Left swipes older than 30 days (max cooldown expired)
 */
async function runDailyCleanup() {
    try {
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // All deletes in a single transaction
        const results = await db.transaction(async (tx) => {
            const swipeCounts = await tx.delete(dailySwipeCounts)
                .where(lt(dailySwipeCounts.date, twoDaysAgoStr));

            const superLikeCounts = await tx.delete(dailySuperLikeCounts)
                .where(lt(dailySuperLikeCounts.date, twoDaysAgoStr));

            const expiredLeftSwipes = await tx.delete(swipes)
                .where(
                    and(
                        eq(swipes.swipeType, "left"),
                        lt(swipes.createdAt!, thirtyDaysAgo)
                    )
                );

            return {
                swipeCounts: swipeCounts.rowCount ?? 0,
                superLikeCounts: superLikeCounts.rowCount ?? 0,
                expiredLeftSwipes: expiredLeftSwipes.rowCount ?? 0,
            };
        });

        // Clean expired blacklisted tokens (outside transaction — separate table)
        const expiredTokens = await cleanupExpiredTokens();

        log.info({ ...results, expiredTokens }, "Daily cleanup completed (midnight)");
    } catch (error) {
        log.error({ err: error }, "Daily cleanup failed");
    }
}

/**
 * Calculate ms until next midnight in the given timezone offset.
 * @param utcOffsetHours - timezone offset in hours (e.g. +3 for Moscow)
 */
function msUntilMidnight(utcOffsetHours: number): number {
    const now = new Date();
    const localNow = new Date(now.getTime() + utcOffsetHours * 60 * 60 * 1000);
    const tomorrow = new Date(localNow);
    tomorrow.setUTCHours(0, 0, 0, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow.getTime() - localNow.getTime();
}

const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

// Server timezone offset (MSK = +3). Change this for other timezones.
const SERVER_TZ_OFFSET = 3;

/**
 * Start cleanup jobs:
 * - Hourly: expired availability reset
 * - Daily at midnight (local): stale counts + expired left swipes (in transaction)
 */
export function startCleanupJob() {
    // === Hourly: availability reset ===
    setTimeout(runHourlyCleanup, 10_000); // first run after 10s
    setInterval(runHourlyCleanup, ONE_HOUR);

    // === Daily at midnight local time ===
    const msToMidnight = msUntilMidnight(SERVER_TZ_OFFSET);
    const hoursToMidnight = (msToMidnight / ONE_HOUR).toFixed(1);

    setTimeout(() => {
        runDailyCleanup();
        // Then repeat every 24 hours
        setInterval(runDailyCleanup, ONE_DAY);
    }, msToMidnight);

    log.info(
        `Cleanup scheduled: hourly (availability), daily at 00:00 MSK (in ${hoursToMidnight}h)`
    );
}
