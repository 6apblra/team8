import { WebSocketServer, WebSocket } from "ws";
import type { Server, IncomingMessage } from "node:http";
import { z } from "zod";
import { storage, type ReactionSummary } from "./storage";
import { verifyToken } from "./auth-utils";
import { log } from "./logger";

const wsMessageSchema = z.object({
  type: z.enum(["typing", "stop_typing", "read"]),
  matchId: z.string().min(1),
});

interface ChatMessage {
  type: "typing" | "stop_typing" | "read";
  matchId: string;
  senderId: string;
}

interface UserConnection {
  userId: string;
  ws: WebSocket;
  matchIds: Set<string>;
}

const connections = new Map<string, UserConnection>();
const matchSubscribers = new Map<string, Set<string>>();

// WebSocket rate limiting: max 30 messages per 10 seconds per user
const WS_RATE_LIMIT = 30;
const WS_RATE_WINDOW = 10_000;
const wsRateMap = new Map<string, { count: number; resetAt: number }>();

function checkWsRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = wsRateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    wsRateMap.set(userId, { count: 1, resetAt: now + WS_RATE_WINDOW });
    return true;
  }
  entry.count++;
  return entry.count <= WS_RATE_LIMIT;
}

function parseSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    },
    {} as Record<string, string>,
  );
  return cookies["connect.sid"] || null;
}

export function setupWebSocket(server: Server, sessionParser: any) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    let userId: string | null = null;

    const url = new URL(req.url || "", "http://localhost");
    const token = url.searchParams.get("token");

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.userId;
      }
    }

    const proceed = async () => {
      if (!userId) {
        ws.close(4001, "Unauthorized");
        return;
      }

      log.info(`WebSocket connected: ${userId}`);

      const userMatches = await storage.getMatches(userId!);
      const matchIds = new Set(userMatches.map((m) => m.id));

      const connection: UserConnection = { userId: userId!, ws, matchIds };
      connections.set(userId!, connection);

      for (const matchId of matchIds) {
        if (!matchSubscribers.has(matchId)) {
          matchSubscribers.set(matchId, new Set());
        }
        matchSubscribers.get(matchId)!.add(userId!);
      }

      ws.send(
        JSON.stringify({
          type: "connected",
          userId,
          matchIds: Array.from(matchIds),
        }),
      );

      ws.on("message", async (data: Buffer) => {
        if (!checkWsRateLimit(userId!)) {
          ws.send(JSON.stringify({ type: "error", message: "Rate limited" }));
          return;
        }
        try {
          const raw = JSON.parse(data.toString());
          const message = wsMessageSchema.parse(raw) as ChatMessage;
          await handleMessage(userId!, message);
        } catch (error: any) {
          if (error.name === "ZodError") {
            ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
          } else {
            log.error({ err: error }, "WebSocket message error");
            ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
          }
        }
      });

      ws.on("close", () => {
        if (userId) {
          log.info(`WebSocket disconnected: ${userId}`);
          const conn = connections.get(userId);
          if (conn) {
            for (const matchId of conn.matchIds) {
              matchSubscribers.get(matchId)?.delete(userId);
            }
          }
          connections.delete(userId);
        }
      });

      ws.on("error", (error: Error) => {
        log.error({ err: error, userId }, "WebSocket error");
      });
    };

    if (userId) {
      await proceed();
    } else {
      sessionParser(req, {} as any, async () => {
        const session = (req as any).session;
        if (session?.userId) {
          userId = session.userId;
        }
        await proceed();
      });
    }
  });

  return wss;
}

async function handleMessage(senderId: string, message: ChatMessage) {
  const { type, matchId } = message;

  const match = await storage.getMatch(matchId);
  if (!match) return;

  if (match.user1Id !== senderId && match.user2Id !== senderId) return;

  switch (type) {
    case "typing":
      broadcast(
        matchId,
        {
          type: "typing",
          matchId,
          userId: senderId,
        },
        senderId,
      );
      break;

    case "stop_typing":
      broadcast(
        matchId,
        {
          type: "stop_typing",
          matchId,
          userId: senderId,
        },
        senderId,
      );
      break;

    case "read":
      await storage.markMessagesAsRead(matchId, senderId);
      broadcast(
        matchId,
        {
          type: "messages_read",
          matchId,
          readBy: senderId,
        },
        senderId,
      );
      break;
  }
}

function broadcast(matchId: string, data: any, excludeUserId?: string) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;

  const payload = JSON.stringify(data);
  for (const userId of subscribers) {
    if (excludeUserId && userId === excludeUserId) continue;
    const conn = connections.get(userId);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(payload);
    }
  }
}

export function addMatchToConnections(
  user1Id: string,
  user2Id: string,
  matchId: string,
) {
  for (const userId of [user1Id, user2Id]) {
    const conn = connections.get(userId);
    if (conn) {
      conn.matchIds.add(matchId);
      if (!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set());
      }
      matchSubscribers.get(matchId)!.add(userId);

      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(
          JSON.stringify({
            type: "new_match",
            matchId,
            user1Id,
            user2Id,
          }),
        );
      }
    }
  }
}

export function broadcastNewMessage(
  matchId: string,
  senderId: string,
  receiverId: string,
  message: any,
) {
  broadcast(matchId, {
    type: "new_message",
    matchId,
    message,
  });
}

export function broadcastTyping(
  matchId: string,
  senderId: string,
  isTyping: boolean,
) {
  broadcast(
    matchId,
    {
      type: isTyping ? "typing" : "stop_typing",
      matchId,
      userId: senderId,
    },
    senderId,
  );
}

export function broadcastPresenceChange(
  userId: string,
  isAvailableNow: boolean,
) {
  const conn = connections.get(userId);
  if (!conn) return;

  for (const matchId of conn.matchIds) {
    broadcast(
      matchId,
      {
        type: "presence_change",
        userId,
        isAvailableNow,
        isOnline: true,
      },
      userId,
    );
  }
}

export function updatePresence(userId: string, isOnline: boolean) {
  const conn = connections.get(userId);
  if (!conn) return;

  for (const matchId of conn.matchIds) {
    broadcast(
      matchId,
      {
        type: "presence_change",
        userId,
        isOnline,
      },
      userId,
    );
  }
}

export function isUserConnected(userId: string): boolean {
  return connections.has(userId);
}

export function sendToUser(userId: string, data: any) {
  const conn = connections.get(userId);
  if (conn && conn.ws.readyState === WebSocket.OPEN) {
    conn.ws.send(JSON.stringify(data));
  }
}

export function getConnectedUserIds(): string[] {
  return Array.from(connections.keys());
}

export function broadcastReaction(
  matchId: string,
  messageId: string,
  emoji: string,
  userId: string,
  action: "added" | "removed",
  reactions: ReactionSummary[],
) {
  broadcast(matchId, {
    type: "reaction",
    matchId,
    messageId,
    emoji,
    userId,
    action,
    reactions,
  });
}
