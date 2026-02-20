import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { db } from "./db";
import { games } from "@shared/schema";
import bcrypt from "bcrypt";
import {
  addMatchToConnections,
  broadcastNewMessage,
  broadcastTyping,
  broadcastPresenceChange,
  updatePresence,
  sendToUser,
} from "./websocket";
import { avatarUpload, getUploadUrl } from "./upload";
import { notifyNewMatch, notifyNewMessage, notifySuperLike } from "./push-notifications";
import { validateRequest, authLimiter } from "./middleware";
import {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  blacklistToken,
} from "./auth-utils";
import { log } from "./logger";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  deleteAccountSchema,
  createProfileSchema,
  updateProfileSchema,
  setUserGamesSchema,
  setAvailabilitySchema,
  swipeSchema,
  sendMessageSchema,
  reportSchema,
  pushTokenSchema,
  feedFiltersSchema,
  availableNowSchema,
} from "@shared/validation";

const SALT_ROUNDS = 10;

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.session.userId = decoded.userId;
        return next();
      }
    }
  }

  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function seedGames() {
  const existingGames = await storage.getGames();
  const existingIds = new Set(existingGames.map((g) => g.id));

  const desiredGames = [
    { id: "valorant", name: "Valorant", icon: "valorant" },
    { id: "cs2", name: "CS2", icon: "cs2" },
    { id: "dota2", name: "Dota 2", icon: "dota2" },
    { id: "fortnite", name: "Fortnite", icon: "fortnite" },
    { id: "lol", name: "League of Legends", icon: "lol" },
    { id: "wot", name: "World of Tanks", icon: "wot" },
    { id: "apex", name: "Apex Legends", icon: "apex" },
  ];

  const gamesToAdd = desiredGames.filter((g) => !existingIds.has(g.id));

  if (gamesToAdd.length > 0) {
    await db.insert(games).values(gamesToAdd);
    log.info(`Added ${gamesToAdd.length} new games to database`);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  await seedGames();

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.post(
    "/api/auth/register",
    authLimiter,
    validateRequest(registerSchema),
    async (req, res) => {
      try {
        const { email, password } = req.body;

        const existing = await storage.getUserByEmail(email);
        if (existing) {
          return res.status(400).json({ error: "Email already registered" });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await storage.createUser({ email, passwordHash });

        req.session.userId = user.id;
        const token = generateToken(user.id);
        const refreshToken = generateRefreshToken(user.id);
        return res.json({
          user: { id: user.id, email: user.email },
          token,
          refreshToken,
        });
      } catch (error) {
        log.error({ err: error }, "Register error");
        return res.status(500).json({ error: "Registration failed" });
      }
    },
  );

  app.post(
    "/api/auth/login",
    authLimiter,
    validateRequest(loginSchema),
    async (req, res) => {
      try {
        const { email, password } = req.body;

        const user = await storage.getUserByEmail(email);
        if (!user) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        req.session.userId = user.id;
        const token = generateToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        const profile = await storage.getProfile(user.id);
        return res.json({
          user: { id: user.id, email: user.email, isPremium: user.isPremium },
          token,
          refreshToken,
          profile,
          hasProfile: !!profile,
        });
      } catch (error) {
        log.error({ err: error }, "Login error");
        return res.status(500).json({ error: "Login failed" });
      }
    },
  );

  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      if (token) blacklistToken(token);
    }
    const { refreshToken } = req.body || {};
    if (refreshToken) blacklistToken(refreshToken);

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true });
    });
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token required" });
      }

      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      const user = await storage.getUser(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      blacklistToken(refreshToken);

      const newToken = generateToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      return res.json({ token: newToken, refreshToken: newRefreshToken });
    } catch (error) {
      log.error({ err: error }, "Refresh token error");
      return res.status(500).json({ error: "Token refresh failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const profile = await storage.getProfile(userId);
      return res.json({
        user: { id: user.id, email: user.email, isPremium: user.isPremium },
        profile,
        hasProfile: !!profile,
      });
    } catch (error) {
      log.error({ err: error }, "Get me error");
      return res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Change password
  app.post(
    "/api/auth/change-password",
    requireAuth,
    validateRequest(changePasswordSchema),
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const { currentPassword, newPassword } = req.body;

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const validPassword = await bcrypt.compare(
          currentPassword,
          user.passwordHash,
        );
        if (!validPassword) {
          return res.status(400).json({ error: "Current password is incorrect" });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await storage.updateUserPassword(userId, newPasswordHash);

        log.info({ userId }, "Password changed successfully");
        return res.json({ success: true });
      } catch (error) {
        log.error({ err: error }, "Change password error");
        return res.status(500).json({ error: "Failed to change password" });
      }
    },
  );

  // Delete account
  app.delete(
    "/api/auth/account",
    requireAuth,
    validateRequest(deleteAccountSchema),
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const { password } = req.body;

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
          return res.status(400).json({ error: "Password is incorrect" });
        }

        await storage.deleteUser(userId);

        req.session.destroy(() => {});
        log.info({ userId }, "Account deleted successfully");
        return res.json({ success: true });
      } catch (error) {
        log.error({ err: error }, "Delete account error");
        return res.status(500).json({ error: "Failed to delete account" });
      }
    },
  );

  // Register push notification token
  app.post(
    "/api/push-token",
    requireAuth,
    validateRequest(pushTokenSchema),
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const { token } = req.body;
        await storage.setPushToken(userId, token);
        return res.json({ success: true });
      } catch (error) {
        log.error({ err: error }, "Set push token error");
        return res.status(500).json({ error: "Failed to set push token" });
      }
    },
  );

  // Unregister push notification token
  app.delete("/api/push-token", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.removePushToken(userId);
      return res.json({ success: true });
    } catch (error) {
      log.error({ err: error }, "Remove push token error");
      return res.status(500).json({ error: "Failed to remove push token" });
    }
  });

  app.get("/api/games", async (_req, res) => {
    try {
      const allGames = await storage.getGames();
      return res.json(allGames);
    } catch (error) {
      log.error({ err: error }, "Get games error");
      return res.status(500).json({ error: "Failed to fetch games" });
    }
  });

  app.get("/api/profile/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const userGames = await storage.getUserGames(userId);
      const availability = await storage.getAvailability(userId);

      return res.json({ profile, userGames, availability });
    } catch (error) {
      log.error({ err: error }, "Get profile error");
      return res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post(
    "/api/profile",
    requireAuth,
    validateRequest(createProfileSchema),
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const profileData = { ...req.body, userId };

        const existing = await storage.getProfile(userId);
        if (existing) {
          const updated = await storage.updateProfile(userId, profileData);
          return res.json(updated);
        }

        const profile = await storage.createProfile(profileData);
        return res.json(profile);
      } catch (error) {
        log.error({ err: error }, "Create profile error");
        return res.status(500).json({ error: "Failed to create profile" });
      }
    },
  );

  app.put(
    "/api/profile/:userId",
    requireAuth,
    validateRequest(updateProfileSchema),
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        if (req.params.userId !== userId) {
          return res.status(403).json({ error: "Forbidden" });
        }
        const updates = req.body;
        const updated = await storage.updateProfile(userId, updates);
        if (!updated) {
          return res.status(404).json({ error: "Profile not found" });
        }
        return res.json(updated);
      } catch (error) {
        log.error({ err: error }, "Update profile error");
        return res.status(500).json({ error: "Failed to update profile" });
      }
    },
  );

  // Avatar upload endpoint
  app.post(
    "/api/avatar",
    requireAuth,
    avatarUpload.single("avatar"),
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const file = req.file;

        if (!file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const avatarUrl = getUploadUrl(file.filename);

        // Update profile with new avatar URL
        const updated = await storage.updateProfile(userId, { avatarUrl });
        if (!updated) {
          return res.status(404).json({ error: "Profile not found" });
        }

        return res.json({ avatarUrl, profile: updated });
      } catch (error) {
        log.error({ err: error }, "Avatar upload error");
        return res.status(500).json({ error: "Failed to upload avatar" });
      }
    },
  );

  app.get("/api/user-games/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const userGames = await storage.getUserGames(userId);
      return res.json(userGames);
    } catch (error) {
      log.error({ err: error }, "Get user games error");
      return res.status(500).json({ error: "Failed to fetch user games" });
    }
  });

  app.post(
    "/api/user-games",
    requireAuth,
    validateRequest(setUserGamesSchema),
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const { games: newGames } = req.body;
        await storage.setUserGames(
          userId,
          newGames.map((g: any) => ({ ...g, userId })),
        );
        const updated = await storage.getUserGames(userId);
        return res.json(updated);
      } catch (error) {
        log.error({ err: error }, "Set user games error");
        return res.status(500).json({ error: "Failed to set user games" });
      }
    },
  );

  app.post(
    "/api/user-games/:userId",
    requireAuth,
    validateRequest(setUserGamesSchema),
    async (req, res) => {
      try {
        const sessionUserId = req.session.userId!;
        if (req.params.userId !== sessionUserId) {
          return res.status(403).json({ error: "Forbidden" });
        }
        const { games: newGames } = req.body;
        await storage.setUserGames(
          sessionUserId,
          newGames.map((g: any) => ({ ...g, userId: sessionUserId })),
        );
        const updated = await storage.getUserGames(sessionUserId);
        return res.json(updated);
      } catch (error) {
        log.error({ err: error }, "Set user games error");
        return res.status(500).json({ error: "Failed to set user games" });
      }
    },
  );

  app.get("/api/availability/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const availability = await storage.getAvailability(userId);
      return res.json(availability);
    } catch (error) {
      log.error({ err: error }, "Get availability error");
      return res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  app.post(
    "/api/availability",
    requireAuth,
    validateRequest(setAvailabilitySchema),
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const { windows } = req.body;
        await storage.setAvailability(userId, windows);
        const updated = await storage.getAvailability(userId);
        return res.json(updated);
      } catch (error) {
        log.error({ err: error }, "Set availability error");
        return res.status(500).json({ error: "Failed to set availability" });
      }
    },
  );

  app.post(
    "/api/availability/:userId",
    requireAuth,
    validateRequest(setAvailabilitySchema),
    async (req, res) => {
      try {
        const sessionUserId = req.session.userId!;
        if (req.params.userId !== sessionUserId) {
          return res.status(403).json({ error: "Forbidden" });
        }
        const { windows } = req.body;
        await storage.setAvailability(sessionUserId, windows);
        const updated = await storage.getAvailability(sessionUserId);
        return res.json(updated);
      } catch (error) {
        log.error({ err: error }, "Set availability error");
        return res.status(500).json({ error: "Failed to set availability" });
      }
    },
  );

  app.get(
    "/api/feed",
    requireAuth,
    validateRequest(feedFiltersSchema),
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const {
          gameId,
          region,
          language,
          availableNowOnly,
          micRequired,
          playstyle,
          rankMin,
          rankMax,
        } = req.query as any;

        const candidates = await storage.getFeedCandidates(userId, {
          gameId,
          region,
          language,
          micRequired,
          playstyle,
          rankMin,
          rankMax,
          availableNowOnly,
        });

        return res.json(candidates);
      } catch (error) {
        log.error({ err: error }, "Get feed error");
        return res.status(500).json({ error: "Failed to fetch feed" });
      }
    },
  );

  app.post(
    "/api/swipe",
    requireAuth,
    validateRequest(swipeSchema),
    async (req, res) => {
      try {
        const fromUserId = req.session.userId!;
        const { toUserId, swipeType } = req.body;

        const [dailyCount, limit, superLikeCount, superLikeLimit] = await Promise.all([
          storage.getDailySwipeCount(fromUserId),
          storage.getSwipeLimit(fromUserId),
          storage.getDailySuperLikeCount(fromUserId),
          storage.getSuperLikeLimit(fromUserId),
        ]);

        if (dailyCount >= limit) {
          return res.status(429).json({
            error: "Daily swipe limit reached",
            dailyCount,
            limit,
          });
        }

        if (swipeType === "super" && superLikeCount >= superLikeLimit) {
          return res.status(429).json({
            error: "Daily super like limit reached",
            superLikeCount,
            superLikeLimit,
          });
        }

        const incrementTasks: Promise<any>[] = [
          storage.createSwipe({ fromUserId, toUserId, swipeType }),
          storage.incrementDailySwipeCount(fromUserId),
        ];
        if (swipeType === "super") {
          incrementTasks.push(storage.incrementDailySuperLikeCount(fromUserId));
        }
        const [swipe] = await Promise.all(incrementTasks);

        let match = null;
        if (swipeType === "like" || swipeType === "super") {
          const isMutual = await storage.checkMutualLike(fromUserId, toUserId);
          if (isMutual) {
            const existing = await storage.getMatchByUsers(fromUserId, toUserId);
            if (!existing) {
              match = await storage.createMatch(fromUserId, toUserId);
              addMatchToConnections(fromUserId, toUserId, match.id);

              Promise.all([
                storage.getProfile(fromUserId),
                storage.getProfile(toUserId),
              ]).then(([fromProfile, toProfile]) => {
                if (toProfile)
                  notifyNewMatch(fromUserId, toProfile.nickname).catch(() => {});
                if (fromProfile)
                  notifyNewMatch(toUserId, fromProfile.nickname).catch(() => {});
              });
            }
          }
        }

        if (swipeType === "super") {
          sendToUser(toUserId, { type: "super_like", fromUserId });
          storage.getProfile(fromUserId).then((fromProfile) => {
            if (fromProfile) {
              notifySuperLike(toUserId, fromProfile.nickname).catch(() => {});
            }
          });
        }

        const newCount = dailyCount + 1;
        const newSuperCount = swipeType === "super" ? superLikeCount + 1 : superLikeCount;

        return res.json({
          swipe,
          match,
          dailyCount: newCount,
          limit,
          remaining: limit - newCount,
          superLikeCount: newSuperCount,
          superLikeLimit,
          superLikesRemaining: superLikeLimit - newSuperCount,
        });
      } catch (error) {
        log.error({ err: error }, "Swipe error");
        return res.status(500).json({ error: "Failed to process swipe" });
      }
    },
  );

  app.get("/api/swipe-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [dailyCount, limit, superLikeCount, superLikeLimit] = await Promise.all([
        storage.getDailySwipeCount(userId),
        storage.getSwipeLimit(userId),
        storage.getDailySuperLikeCount(userId),
        storage.getSuperLikeLimit(userId),
      ]);
      return res.json({
        dailyCount,
        limit,
        remaining: limit - dailyCount,
        superLikeCount,
        superLikeLimit,
        superLikesRemaining: superLikeLimit - superLikeCount,
      });
    } catch (error) {
      log.error({ err: error }, "Get swipe status error");
      return res.status(500).json({ error: "Failed to get swipe status" });
    }
  });

  app.get("/api/matches", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const userMatches = await storage.getMatches(userId);

      const enrichedMatches = await Promise.all(
        userMatches.map(async (match) => {
          const otherUserId =
            match.user1Id === userId ? match.user2Id : match.user1Id;
          const profile = await storage.getProfile(otherUserId);
          const userGames = await storage.getUserGames(otherUserId);
          const messages = await storage.getMessages(match.id);
          const lastMessage = messages[messages.length - 1];
          const unreadCount = messages.filter(
            (m) => !m.isRead && m.senderId !== userId,
          ).length;

          return {
            ...match,
            otherUser: { profile, userGames },
            lastMessage,
            unreadCount,
          };
        }),
      );

      return res.json(enrichedMatches);
    } catch (error) {
      log.error({ err: error }, "Get matches error");
      return res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  app.get("/api/messages/:matchId", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { matchId } = req.params;

      const match = await storage.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }

      if (match.user1Id !== userId && match.user2Id !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const matchMessages = await storage.getMessages(matchId);
      await storage.markMessagesAsRead(matchId, userId);

      return res.json(matchMessages);
    } catch (error) {
      log.error({ err: error }, "Get messages error");
      return res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post(
    "/api/messages",
    requireAuth,
    validateRequest(sendMessageSchema),
    async (req, res) => {
      try {
        const senderId = req.session.userId!;
        const { matchId, content } = req.body;

        if (!matchId)
          return res.status(400).json({ error: "matchId required" });

        const match = await storage.getMatch(matchId);
        if (!match) {
          return res.status(404).json({ error: "Match not found" });
        }

        if (match.user1Id !== senderId && match.user2Id !== senderId) {
          return res.status(403).json({ error: "Forbidden" });
        }

        const message = await storage.createMessage({
          matchId,
          senderId,
          content,
        });

        const receiverId =
          match.user1Id === senderId ? match.user2Id : match.user1Id;
        broadcastNewMessage(matchId, senderId, receiverId, message);

        const senderProfile = await storage.getProfile(senderId);
        if (senderProfile) {
          notifyNewMessage(receiverId, senderProfile.nickname, content).catch(
            () => {},
          );
        }

        return res.json(message);
      } catch (error) {
        log.error({ err: error }, "Send message error");
        return res.status(500).json({ error: "Failed to send message" });
      }
    },
  );

  app.post(
    "/api/report",
    requireAuth,
    validateRequest(reportSchema),
    async (req, res) => {
      try {
        const reporterId = req.session.userId!;
        const { reportedUserId, reason, details } = req.body;

        await storage.createReport(reporterId, reportedUserId, reason, details);
        return res.json({ success: true });
      } catch (error) {
        log.error({ err: error }, "Report error");
        return res.status(500).json({ error: "Failed to submit report" });
      }
    },
  );

  app.post("/api/block", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { blockedUserId } = req.body;

      if (!blockedUserId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      await storage.blockUser(userId, blockedUserId);
      return res.json({ success: true });
    } catch (error) {
      log.error({ err: error }, "Block error");
      return res.status(500).json({ error: "Failed to block user" });
    }
  });

  app.post("/api/heartbeat", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.updateLastSeen(userId);
      return res.json({ success: true });
    } catch (error) {
      log.error({ err: error }, "Heartbeat error");
      return res.status(500).json({ error: "Heartbeat failed" });
    }
  });

  app.post(
    "/api/available-now",
    requireAuth,
    validateRequest(availableNowSchema),
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const { durationMinutes } = req.body;

        const duration = Math.min(Math.max(durationMinutes, 15), 240);
        await storage.setAvailableNow(userId, duration);

        broadcastPresenceChange(userId, true);

        return res.json({
          success: true,
          availableUntil: new Date(Date.now() + duration * 60 * 1000),
        });
      } catch (error) {
        log.error({ err: error }, "Set available error");
        return res.status(500).json({ error: "Failed to set availability" });
      }
    },
  );

  app.delete("/api/available-now", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.clearAvailableNow(userId);

      broadcastPresenceChange(userId, false);

      return res.json({ success: true });
    } catch (error) {
      log.error({ err: error }, "Clear available error");
      return res.status(500).json({ error: "Failed to clear availability" });
    }
  });

  app.get("/api/activity-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { userIds } = req.query;

      if (!userIds || typeof userIds !== "string") {
        return res.status(400).json({ error: "userIds query param required" });
      }

      const ids = userIds.split(",").filter(Boolean);
      const statuses = await storage.getOnlineUsers(ids);

      return res.json(statuses);
    } catch (error) {
      log.error({ err: error }, "Activity status error");
      return res.status(500).json({ error: "Failed to get activity status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
