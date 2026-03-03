import { describe, it, expect } from "vitest";
import {
    registerSchema,
    loginSchema,
    sendMessageSchema,
} from "../../shared/validation";

describe("registerSchema", () => {
    it("accepts valid registration", () => {
        const result = registerSchema.safeParse({
            email: "user@example.com",
            password: "Password1",
        });
        expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
        const result = registerSchema.safeParse({
            email: "not-an-email",
            password: "Password1",
        });
        expect(result.success).toBe(false);
    });

    it("rejects short password (< 8 chars)", () => {
        const result = registerSchema.safeParse({
            email: "user@example.com",
            password: "Pass1",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain("8");
        }
    });

    it("rejects password without digits", () => {
        const result = registerSchema.safeParse({
            email: "user@example.com",
            password: "PasswordOnly",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain("number");
        }
    });

    it("rejects password over 100 chars", () => {
        const result = registerSchema.safeParse({
            email: "user@example.com",
            password: "A1" + "x".repeat(100),
        });
        expect(result.success).toBe(false);
    });
});

describe("loginSchema", () => {
    it("accepts valid login", () => {
        const result = loginSchema.safeParse({
            email: "user@example.com",
            password: "anything",
        });
        expect(result.success).toBe(true);
    });

    it("rejects empty password", () => {
        const result = loginSchema.safeParse({
            email: "user@example.com",
            password: "",
        });
        expect(result.success).toBe(false);
    });
});

describe("sendMessageSchema", () => {
    it("accepts valid message", () => {
        const result = sendMessageSchema.safeParse({
            matchId: "match-123",
            content: "Hello!",
        });
        expect(result.success).toBe(true);
    });

    it("rejects empty content", () => {
        const result = sendMessageSchema.safeParse({
            matchId: "match-123",
            content: "",
        });
        expect(result.success).toBe(false);
    });

    it("rejects missing matchId", () => {
        const result = sendMessageSchema.safeParse({
            content: "Hello!",
        });
        expect(result.success).toBe(false);
    });
});
