import { log } from "./logger";

/**
 * Server-side word filter for content moderation.
 * Filters profanity and slurs in English and Russian.
 * Case-insensitive, handles basic evasion (l33t-speak, spaces between chars).
 */

// ── Banned word lists ─────────────────────────────────────────────────────────

const BANNED_WORDS_EN: string[] = [
    // Slurs and hate speech
    "nigger", "nigga", "faggot", "retard", "tranny",
    "chink", "kike", "spic", "wetback", "gook",
    // Common profanity
    "fuck", "shit", "bitch", "asshole", "cunt",
    "dick", "cock", "pussy", "whore", "slut",
    // Threats / extreme
    "kys", "kill yourself", "rape",
];

const BANNED_WORDS_RU: string[] = [
    // Мат
    "хуй", "хуя", "хуе", "хуё", "хуи",
    "пизд", "пизда", "пиздец",
    "ебать", "ебан", "ебал", "ебло", "ёб", "еб",
    "блять", "блядь", "бляд",
    "сука", "сучка", "сучар",
    "мудак", "мудил",
    "пидор", "пидар", "пидр",
    "шлюха", "шалава",
    "даун", "дебил",
    // Hate speech
    "нигер", "чурка", "хохол", "жид",
    // Threats
    "убей себя", "кончай себя",
];

// ── Leet-speak substitution map ───────────────────────────────────────────────

const LEET_MAP: Record<string, string> = {
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "8": "b",
    "@": "a",
    "$": "s",
    "!": "i",
};

// ── Word Filter class ─────────────────────────────────────────────────────────

class WordFilter {
    private patterns: RegExp[];

    constructor() {
        const allWords = [...BANNED_WORDS_EN, ...BANNED_WORDS_RU];
        this.patterns = allWords.map((word) => {
            // Escape regex special chars, then allow optional separators between each character
            const escaped = word
                .split("")
                .map((ch) => this.escapeRegex(ch))
                .join("[\\s._\\-*]*");
            return new RegExp(escaped, "gi");
        });

        log.info(`WordFilter initialized with ${allWords.length} banned patterns`);
    }

    /**
     * Normalize text: lowercase, apply leet-speak reverse, collapse repeated chars
     */
    private normalize(text: string): string {
        let result = text.toLowerCase();
        // Replace leet-speak characters
        for (const [leet, normal] of Object.entries(LEET_MAP)) {
            result = result.replaceAll(leet, normal);
        }
        return result;
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    /**
     * Check if text contains any banned words.
     */
    containsBannedWord(text: string): boolean {
        const normalized = this.normalize(text);
        return this.patterns.some((pattern) => {
            pattern.lastIndex = 0;
            return pattern.test(normalized);
        });
    }

    /**
     * Replace banned words with asterisks, preserving original text length feel.
     * Returns censored text.
     */
    censor(text: string): string {
        const normalized = this.normalize(text);
        let censored = text;

        for (const pattern of this.patterns) {
            pattern.lastIndex = 0;

            // Find matches in normalized text, apply censorship to original
            let match: RegExpExecArray | null;
            const normalizedCopy = new RegExp(pattern.source, pattern.flags);

            while ((match = normalizedCopy.exec(normalized)) !== null) {
                const start = match.index;
                const end = start + match[0].length;
                const replacement = "***";

                // Replace in original text at the same position
                censored =
                    censored.substring(0, start) +
                    replacement +
                    censored.substring(end);

                // Also update normalized to keep indices in sync
                break; // Re-run from start since length changed
            }
        }

        // Second pass: re-check with simple replacement on the result
        let result = censored;
        for (const pattern of this.patterns) {
            const freshPattern = new RegExp(pattern.source, pattern.flags);
            const normalizedResult = this.normalize(result);

            let match: RegExpExecArray | null;
            while ((match = freshPattern.exec(normalizedResult)) !== null) {
                const start = match.index;
                const end = start + match[0].length;
                result =
                    result.substring(0, start) +
                    "***" +
                    result.substring(end);
                break;
            }
        }

        return result;
    }
}

export const wordFilter = new WordFilter();

/**
 * Escape HTML special characters to prevent XSS.
 * Should be applied to user-generated text before storage.
 */
export function sanitizeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
