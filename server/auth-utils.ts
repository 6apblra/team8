import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod";
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

const tokenBlacklist = new Set<string>();

setInterval(
  () => {
    for (const token of tokenBlacklist) {
      try {
        jwt.verify(token, JWT_SECRET);
      } catch {
        tokenBlacklist.delete(token);
      }
    }
  },
  60 * 60 * 1000,
);

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: "refresh" }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    if (tokenBlacklist.has(token)) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    if (tokenBlacklist.has(token)) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      type?: string;
    };
    if (decoded.type !== "refresh") return null;
    return { userId: decoded.userId };
  } catch (error) {
    return null;
  }
}

export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
}
