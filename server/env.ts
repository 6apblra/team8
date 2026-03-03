import { log } from "./logger";

/**
 * Validate required and recommended environment variables at startup.
 */
export function validateEnv() {
    // Required
    const required = ["DATABASE_URL"];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        log.fatal(`Missing required env vars: ${missing.join(", ")}`);
        process.exit(1);
    }

    // Production warnings
    if (process.env.NODE_ENV === "production") {
        if (!process.env.SESSION_SECRET) {
            log.warn("SESSION_SECRET not set — using insecure default. Set it in production!");
        }
        if (!process.env.JWT_SECRET) {
            log.warn("JWT_SECRET not set — using insecure default. Set it in production!");
        }
        if (!process.env.EXPO_PUBLIC_API_URL) {
            log.warn("EXPO_PUBLIC_API_URL not set — CORS may not work correctly in production.");
        }
    }
}
