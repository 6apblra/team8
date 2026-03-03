import { describe, it, expect } from "vitest";
import { generateToken, verifyToken, generateRefreshToken } from "../auth-utils";

describe("generateToken + verifyToken", () => {
    it("creates a valid token that can be verified", () => {
        const token = generateToken("user-123");
        const result = verifyToken(token);
        expect(result).not.toBeNull();
        expect(result?.userId).toBe("user-123");
    });

    it("returns null for invalid token", () => {
        const result = verifyToken("invalid.token.here");
        expect(result).toBeNull();
    });

    it("returns null for empty string", () => {
        const result = verifyToken("");
        expect(result).toBeNull();
    });
});

describe("generateRefreshToken", () => {
    it("creates a valid refresh token", () => {
        const token = generateRefreshToken("user-456");
        const result = verifyToken(token);
        expect(result).not.toBeNull();
        expect(result?.userId).toBe("user-456");
    });
});
