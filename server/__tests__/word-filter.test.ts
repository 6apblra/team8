import { describe, it, expect } from "vitest";
import { wordFilter, sanitizeHtml } from "../word-filter";

describe("sanitizeHtml", () => {
    it("escapes HTML tags", () => {
        expect(sanitizeHtml("<script>alert('xss')</script>")).toBe(
            "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;"
        );
    });

    it("escapes ampersands", () => {
        expect(sanitizeHtml("foo & bar")).toBe("foo &amp; bar");
    });

    it("escapes quotes", () => {
        expect(sanitizeHtml('He said "hello"')).toBe("He said &quot;hello&quot;");
    });

    it("returns empty string for empty input", () => {
        expect(sanitizeHtml("")).toBe("");
    });

    it("does not alter clean text", () => {
        expect(sanitizeHtml("Hello world 123")).toBe("Hello world 123");
    });
});

describe("wordFilter.containsBannedWord", () => {
    it("detects English banned words", () => {
        expect(wordFilter.containsBannedWord("fuck you")).toBe(true);
    });

    it("detects Russian banned words", () => {
        expect(wordFilter.containsBannedWord("иди на хуй")).toBe(true);
    });

    it("detects leet-speak evasion", () => {
        expect(wordFilter.containsBannedWord("f.u.c.k")).toBe(true);
    });

    it("returns false for clean text", () => {
        expect(wordFilter.containsBannedWord("hello friend")).toBe(false);
    });

    it("is case-insensitive", () => {
        expect(wordFilter.containsBannedWord("FUCK")).toBe(true);
    });
});

describe("wordFilter.censor", () => {
    it("replaces banned words with ***", () => {
        const result = wordFilter.censor("fuck you");
        expect(result).toContain("***");
        expect(result).not.toContain("fuck");
    });

    it("preserves clean text", () => {
        expect(wordFilter.censor("hello world")).toBe("hello world");
    });

    it("censors Russian profanity", () => {
        const result = wordFilter.censor("ты блять что");
        expect(result).toContain("***");
    });
});
