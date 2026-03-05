import type { Response } from "express";

/**
 * Structured error codes for i18n-ready API responses.
 * Clients can map numeric codes to localized messages.
 */
export enum ErrorCode {
    // Auth (1xxx)
    AUTH_REQUIRED = 1001,
    INVALID_TOKEN = 1002,
    INVALID_REFRESH_TOKEN = 1003,
    INVALID_CREDENTIALS = 1004,
    USERNAME_TAKEN = 1005,
    USER_NOT_FOUND = 1006,
    ACCOUNT_BANNED = 1007,

    // Validation (2xxx)
    VALIDATION_FAILED = 2001,
    MISSING_FIELD = 2002,
    INVALID_FORMAT = 2003,

    // Rate limit (3xxx)
    RATE_LIMIT = 3001,
    SWIPE_LIMIT = 3002,
    SUPER_LIKE_LIMIT = 3003,

    // Resources (4xxx)
    NOT_FOUND = 4001,
    MATCH_NOT_FOUND = 4002,
    PROFILE_NOT_FOUND = 4003,
    ALREADY_EXISTS = 4004,

    // Business logic (5xxx)
    CANNOT_SWIPE_SELF = 5001,
    ALREADY_MATCHED = 5002,
    NOT_IN_MATCH = 5003,
    BLOCKED_USER = 5004,
    CONTENT_FILTERED = 5005,

    // Server (9xxx)
    INTERNAL_ERROR = 9001,
    DB_ERROR = 9002,
    UPLOAD_FAILED = 9003,
}

/** Default English messages for each error code */
const defaultMessages: Record<ErrorCode, string> = {
    [ErrorCode.AUTH_REQUIRED]: "Authentication required",
    [ErrorCode.INVALID_TOKEN]: "Invalid or expired token",
    [ErrorCode.INVALID_REFRESH_TOKEN]: "Invalid refresh token",
    [ErrorCode.INVALID_CREDENTIALS]: "Invalid username or password",
    [ErrorCode.USERNAME_TAKEN]: "Username already taken",
    [ErrorCode.USER_NOT_FOUND]: "User not found",
    [ErrorCode.ACCOUNT_BANNED]: "Account has been banned",
    [ErrorCode.VALIDATION_FAILED]: "Validation failed",
    [ErrorCode.MISSING_FIELD]: "Required field missing",
    [ErrorCode.INVALID_FORMAT]: "Invalid format",
    [ErrorCode.RATE_LIMIT]: "Too many requests, please try again later",
    [ErrorCode.SWIPE_LIMIT]: "Daily swipe limit reached",
    [ErrorCode.SUPER_LIKE_LIMIT]: "Daily super like limit reached",
    [ErrorCode.NOT_FOUND]: "Resource not found",
    [ErrorCode.MATCH_NOT_FOUND]: "Match not found",
    [ErrorCode.PROFILE_NOT_FOUND]: "Profile not found",
    [ErrorCode.ALREADY_EXISTS]: "Resource already exists",
    [ErrorCode.CANNOT_SWIPE_SELF]: "Cannot swipe on yourself",
    [ErrorCode.ALREADY_MATCHED]: "Already matched with this user",
    [ErrorCode.NOT_IN_MATCH]: "You are not part of this match",
    [ErrorCode.BLOCKED_USER]: "User is blocked",
    [ErrorCode.CONTENT_FILTERED]: "Message contains inappropriate content",
    [ErrorCode.INTERNAL_ERROR]: "Internal server error",
    [ErrorCode.DB_ERROR]: "Database error",
    [ErrorCode.UPLOAD_FAILED]: "File upload failed",
};

/**
 * Send a structured error response.
 * Format: { error: { code, message, details? } }
 */
export function apiError(
    res: Response,
    status: number,
    code: ErrorCode,
    details?: unknown,
): Response {
    return res.status(status).json({
        error: {
            code,
            message: defaultMessages[code],
            ...(details !== undefined && { details }),
        },
    });
}
