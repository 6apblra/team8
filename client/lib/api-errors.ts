import i18n from "@/lib/i18n";

/**
 * Structured API error from the server.
 * Format: { error: { code: number, message: string, details?: unknown } }
 */
export interface ApiError {
    code: number;
    message: string;
    details?: unknown;
}

/** Error code → i18n key mapping */
const errorCodeKeys: Record<number, string> = {
    // Auth (1xxx)
    1001: "errors.authRequired",
    1002: "errors.invalidToken",
    1003: "errors.invalidRefreshToken",
    1004: "errors.invalidCredentials",
    1005: "errors.usernameTaken",
    1006: "errors.userNotFound",
    1007: "errors.accountBanned",
    // Validation (2xxx)
    2001: "errors.validationFailed",
    2002: "errors.missingField",
    2003: "errors.invalidFormat",
    // Rate limit (3xxx)
    3001: "errors.rateLimit",
    3002: "errors.swipeLimit",
    3003: "errors.superLikeLimit",
    // Resources (4xxx)
    4001: "errors.notFound",
    4002: "errors.matchNotFound",
    4003: "errors.profileNotFound",
    4004: "errors.alreadyExists",
    // Business logic (5xxx)
    5001: "errors.cannotSwipeSelf",
    5002: "errors.alreadyMatched",
    5003: "errors.notInMatch",
    5004: "errors.blockedUser",
    5005: "errors.contentFiltered",
    // Server (9xxx)
    9001: "errors.internalError",
    9002: "errors.dbError",
    9003: "errors.uploadFailed",
};

/**
 * Parse an API error response body into a structured ApiError.
 * Falls back to generic error if parsing fails.
 */
export function parseApiError(body: unknown): ApiError {
    if (body && typeof body === "object" && "error" in body) {
        const err = (body as any).error;
        if (err && typeof err === "object" && typeof err.code === "number") {
            return err as ApiError;
        }
    }
    return { code: 9001, message: "Unknown error" };
}

/**
 * Get a localized error message from an API error code.
 * Uses i18n lookup, falls back to server message, then generic.
 */
export function getErrorMessage(error: ApiError): string {
    const i18nKey = errorCodeKeys[error.code];
    if (i18nKey) {
        const translated = i18n.t(i18nKey);
        // i18n-js returns the key if translation is missing
        if (translated !== i18nKey) return translated;
    }
    // Fallback to server-provided English message
    return error.message || i18n.t("errors.internalError");
}

/**
 * Parse a fetch error (thrown by query-client) into a localized message.
 * Handles both structured API errors and plain text errors.
 */
export async function getErrorFromResponse(response: Response): Promise<string> {
    try {
        const body = await response.json();
        const apiError = parseApiError(body);
        return getErrorMessage(apiError);
    } catch {
        return i18n.t("errors.internalError");
    }
}
