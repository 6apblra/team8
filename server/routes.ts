import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { db } from "./db";
import { eq, inArray, sql } from "drizzle-orm";
import { games, users, profiles as profilesTable, userGames as userGamesTable } from "@shared/schema";
import bcrypt from "bcrypt";
import {
  addMatchToConnections,
  broadcastNewMessage,
  broadcastTyping,
  broadcastPresenceChange,
  updatePresence,
  sendToUser,
  broadcastReaction,
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
import { wordFilter, sanitizeHtml } from "./word-filter";
import { apiError, ErrorCode } from "./errors";
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
  createReviewSchema,
  blockUserSchema,
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
    return apiError(res, 401, ErrorCode.AUTH_REQUIRED);
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

  app.get("/api/health", async (_req, res) => {
    const { getPoolStats, isDbHealthy } = await import("./db");
    const pool = getPoolStats();
    try {
      await db.execute(sql`SELECT 1`);
      res.json({ status: "ok", uptime: process.uptime(), db: "connected", pool });
    } catch {
      res.status(503).json({ status: "degraded", uptime: process.uptime(), db: "disconnected", pool });
    }
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
          return apiError(res, 400, ErrorCode.USERNAME_TAKEN);
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
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
          return apiError(res, 401, ErrorCode.INVALID_CREDENTIALS);
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return apiError(res, 401, ErrorCode.INVALID_CREDENTIALS);
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
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
      }
    },
  );

  app.post("/api/auth/logout", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      if (token) await blacklistToken(token);
    }
    const { refreshToken } = req.body || {};
    if (refreshToken) await blacklistToken(refreshToken);

    req.session.destroy((err) => {
      if (err) {
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true });
    });
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return apiError(res, 400, ErrorCode.MISSING_FIELD);
      }

      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        return apiError(res, 401, ErrorCode.INVALID_REFRESH_TOKEN);
      }

      const user = await storage.getUser(decoded.userId);
      if (!user) {
        return apiError(res, 401, ErrorCode.USER_NOT_FOUND);
      }

      await blacklistToken(refreshToken);

      const newToken = generateToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      return res.json({ token: newToken, refreshToken: newRefreshToken });
    } catch (error) {
      log.error({ err: error }, "Refresh token error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) {
        return apiError(res, 404, ErrorCode.USER_NOT_FOUND);
      }
      const profile = await storage.getProfile(userId);
      return res.json({
        user: { id: user.id, email: user.email, isPremium: user.isPremium },
        profile,
        hasProfile: !!profile,
      });
    } catch (error) {
      log.error({ err: error }, "Get me error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
          return apiError(res, 404, ErrorCode.USER_NOT_FOUND);
        }

        const validPassword = await bcrypt.compare(
          currentPassword,
          user.passwordHash,
        );
        if (!validPassword) {
          return apiError(res, 400, ErrorCode.INVALID_CREDENTIALS);
        }

        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await storage.updateUserPassword(userId, newPasswordHash);

        log.info({ userId }, "Password changed successfully");
        return res.json({ success: true });
      } catch (error) {
        log.error({ err: error }, "Change password error");
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
          return apiError(res, 404, ErrorCode.USER_NOT_FOUND);
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
          return apiError(res, 400, ErrorCode.INVALID_CREDENTIALS);
        }

        await storage.deleteUser(userId);

        req.session.destroy(() => { });
        log.info({ userId }, "Account deleted successfully");
        return res.json({ success: true });
      } catch (error) {
        log.error({ err: error }, "Delete account error");
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  app.get("/api/games", async (_req, res) => {
    try {
      const allGames = await storage.getGames();
      return res.json(allGames);
    } catch (error) {
      log.error({ err: error }, "Get games error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  app.get("/api/profile/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const profile = await storage.getProfile(userId);
      if (!profile) {
        return apiError(res, 404, ErrorCode.PROFILE_NOT_FOUND);
      }

      const userGames = await storage.getUserGames(userId);
      const availability = await storage.getAvailability(userId);

      return res.json({ profile, userGames, availability });
    } catch (error) {
      log.error({ err: error }, "Get profile error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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

        // Moderate nickname
        if (profileData.nickname && wordFilter.containsBannedWord(profileData.nickname)) {
          return apiError(res, 400, ErrorCode.CONTENT_FILTERED);
        }
        if (profileData.nickname) {
          profileData.nickname = sanitizeHtml(profileData.nickname);
        }
        // Censor bio
        if (profileData.bio) {
          profileData.bio = wordFilter.censor(sanitizeHtml(profileData.bio));
        }

        const existing = await storage.getProfile(userId);
        if (existing) {
          const updated = await storage.updateProfile(userId, profileData);
          return res.json(updated);
        }

        const profile = await storage.createProfile(profileData);
        return res.json(profile);
      } catch (error) {
        log.error({ err: error }, "Create profile error");
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
          return apiError(res, 403, ErrorCode.NOT_IN_MATCH);
        }
        const updates = req.body;

        // Moderate nickname
        if (updates.nickname && wordFilter.containsBannedWord(updates.nickname)) {
          return apiError(res, 400, ErrorCode.CONTENT_FILTERED);
        }
        if (updates.nickname) {
          updates.nickname = sanitizeHtml(updates.nickname);
        }
        // Censor bio
        if (updates.bio) {
          updates.bio = wordFilter.censor(sanitizeHtml(updates.bio));
        }

        const updated = await storage.updateProfile(userId, updates);
        if (!updated) {
          return apiError(res, 404, ErrorCode.PROFILE_NOT_FOUND);
        }
        return res.json(updated);
      } catch (error) {
        log.error({ err: error }, "Update profile error");
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
          return apiError(res, 400, ErrorCode.MISSING_FIELD);
        }

        // Delete old avatar file if exists
        const existingProfile = await storage.getProfile(userId);
        if (existingProfile?.avatarUrl) {
          const oldFilename = existingProfile.avatarUrl.split("/").pop();
          if (oldFilename) {
            const oldPath = path.join(process.cwd(), "server", "uploads", oldFilename);
            fs.unlink(oldPath, () => { }); // best-effort
          }
        }

        // Compress non-GIF images with sharp
        let finalFilename = file.filename;
        const isGif = file.mimetype === "image/gif";
        if (!isGif) {
          const sharp = (await import("sharp")).default;
          const webpFilename = file.filename.replace(/\.[^.]+$/, ".webp");
          const outputPath = path.join(process.cwd(), "server", "uploads", webpFilename);
          await sharp(file.path)
            .resize(400, 400, { fit: "cover", withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(outputPath);
          // Remove original uncompressed file
          fs.unlink(file.path, () => { });
          finalFilename = webpFilename;
        }

        const avatarUrl = getUploadUrl(finalFilename);

        // Update profile with new avatar URL
        const updated = await storage.updateProfile(userId, { avatarUrl });
        if (!updated) {
          return apiError(res, 404, ErrorCode.PROFILE_NOT_FOUND);
        }

        return res.json({ avatarUrl, profile: updated });
      } catch (error) {
        log.error({ err: error }, "Avatar upload error");
        return apiError(res, 500, ErrorCode.UPLOAD_FAILED);
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
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
          return apiError(res, 403, ErrorCode.NOT_IN_MATCH);
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
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
          return apiError(res, 403, ErrorCode.NOT_IN_MATCH);
        }
        const { windows } = req.body;
        await storage.setAvailability(sessionUserId, windows);
        const updated = await storage.getAvailability(sessionUserId);
        return res.json(updated);
      } catch (error) {
        log.error({ err: error }, "Set availability error");
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
                  notifyNewMatch(fromUserId, toProfile.nickname).catch(() => { });
                if (fromProfile)
                  notifyNewMatch(toUserId, fromProfile.nickname).catch(() => { });
              });
            }
          }
        }

        if (swipeType === "super") {
          sendToUser(toUserId, { type: "super_like", fromUserId });
          storage.getProfile(fromUserId).then((fromProfile) => {
            if (fromProfile) {
              notifySuperLike(toUserId, fromProfile.nickname).catch(() => { });
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
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
      }
    },
  );

  app.delete("/api/swipe/last", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;

      const [undoCount, undoLimit] = await Promise.all([
        Promise.resolve(storage.getDailyUndoCount(userId)),
        storage.getUndoLimit(userId),
      ]);

      if (undoCount >= undoLimit) {
        return res.status(429).json({
          error: "Daily undo limit reached",
          undoCount,
          undoLimit,
        });
      }

      const lastSwipe = await storage.deleteLastSwipe(userId);
      if (!lastSwipe) {
        return apiError(res, 404, ErrorCode.NOT_FOUND);
      }

      storage.incrementDailyUndoCount(userId);
      await storage.decrementDailySwipeCount(userId);

      if (lastSwipe.swipeType === "like" || lastSwipe.swipeType === "super") {
        await storage.deleteMatchByUsers(userId, lastSwipe.toUserId);
      }

      const newUndoCount = undoCount + 1;
      return res.json({
        success: true,
        toUserId: lastSwipe.toUserId,
        undoCount: newUndoCount,
        undoLimit,
        undoRemaining: undoLimit - newUndoCount,
      });
    } catch (error) {
      log.error({ err: error }, "Undo swipe error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  app.get("/api/swipe-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [dailyCount, limit, superLikeCount, superLikeLimit, undoLimit] = await Promise.all([
        storage.getDailySwipeCount(userId),
        storage.getSwipeLimit(userId),
        storage.getDailySuperLikeCount(userId),
        storage.getSuperLikeLimit(userId),
        storage.getUndoLimit(userId),
      ]);
      const undoCount = storage.getDailyUndoCount(userId);
      return res.json({
        dailyCount,
        limit,
        remaining: limit - dailyCount,
        superLikeCount,
        superLikeLimit,
        superLikesRemaining: superLikeLimit - superLikeCount,
        undoCount,
        undoLimit,
        undoRemaining: undoLimit - undoCount,
      });
    } catch (error) {
      log.error({ err: error }, "Get swipe status error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  app.get("/api/matches", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const before = req.query.before as string | undefined;

      const { matches: userMatches, hasMore } = await storage.getMatches(userId, limit, before);

      // Batch-load all other user profiles and games
      const otherUserIds = userMatches.map((m) =>
        m.user1Id === userId ? m.user2Id : m.user1Id,
      );

      const [allProfiles, allUserGames, allSummaries] = await Promise.all([
        otherUserIds.length > 0
          ? db.select().from(profilesTable).where(inArray(profilesTable.userId, otherUserIds))
          : Promise.resolve([]),
        otherUserIds.length > 0
          ? db.select().from(userGamesTable).where(inArray(userGamesTable.userId, otherUserIds))
          : Promise.resolve([]),
        Promise.all(userMatches.map((m) => storage.getMatchMessageSummary(m.id, userId))),
      ]);

      const profilesMap = new Map(allProfiles.map((p: any) => [p.userId, p]));
      const gamesMap = new Map<string, any[]>();
      for (const g of allUserGames) {
        if (!gamesMap.has((g as any).userId)) gamesMap.set((g as any).userId, []);
        gamesMap.get((g as any).userId)!.push(g);
      }

      const enrichedMatches = userMatches.map((match, i) => {
        const otherUserId =
          match.user1Id === userId ? match.user2Id : match.user1Id;
        const profile = profilesMap.get(otherUserId);
        const userGames = gamesMap.get(otherUserId) || [];
        const { lastMessage, unreadCount } = allSummaries[i];

        const isOnline = profile?.lastSeenAt
          ? Date.now() - new Date(profile.lastSeenAt).getTime() < 5 * 60 * 1000
          : false;
        const isAvailableNow = !!(
          profile?.isAvailableNow &&
          profile?.availableUntil &&
          new Date(profile.availableUntil) > new Date()
        );

        return {
          ...match,
          otherUser: { profile, userGames },
          lastMessage,
          unreadCount,
          isOnline,
          isAvailableNow,
        };
      });

      // Cursor for next page = matchedAt of last match
      const lastMatch = userMatches[userMatches.length - 1];
      const nextCursor = hasMore && lastMatch
        ? (lastMatch.lastMessageAt || lastMatch.matchedAt)?.toISOString()
        : undefined;

      return res.json({ matches: enrichedMatches, hasMore, nextCursor });
    } catch (error) {
      log.error({ err: error }, "Get matches error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  app.get("/api/messages/:matchId", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { matchId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const before = (req.query.before as string) || undefined;

      const match = await storage.getMatch(matchId);
      if (!match) {
        return apiError(res, 404, ErrorCode.MATCH_NOT_FOUND);
      }

      if (match.user1Id !== userId && match.user2Id !== userId) {
        return apiError(res, 403, ErrorCode.NOT_IN_MATCH);
      }

      const result = await storage.getMessages(matchId, limit, before);
      await storage.markMessagesAsRead(matchId, userId);

      return res.json(result);
    } catch (error) {
      log.error({ err: error }, "Get messages error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  // Per-user message rate limiting: max 20 messages per 10s
  const msgRateMap = new Map<string, { count: number; resetAt: number; lastContent?: string; lastAt?: number }>();
  const MSG_RATE_LIMIT = 20;
  const MSG_RATE_WINDOW = 10_000;
  const DUPLICATE_WINDOW = 2_000;

  app.post(
    "/api/messages",
    requireAuth,
    validateRequest(sendMessageSchema),
    async (req, res) => {
      try {
        const senderId = req.session.userId!;
        const { matchId, content: rawContent } = req.body;

        if (!matchId)
          return apiError(res, 400, ErrorCode.MISSING_FIELD);

        // Rate limit check
        const now = Date.now();
        const rateEntry = msgRateMap.get(senderId);
        if (rateEntry && now < rateEntry.resetAt) {
          rateEntry.count++;
          if (rateEntry.count > MSG_RATE_LIMIT) {
            return apiError(res, 429, ErrorCode.RATE_LIMIT);
          }
          // Duplicate content detection
          if (rateEntry.lastContent === rawContent && rateEntry.lastAt && now - rateEntry.lastAt < DUPLICATE_WINDOW) {
            return apiError(res, 429, ErrorCode.RATE_LIMIT);
          }
        } else {
          msgRateMap.set(senderId, { count: 1, resetAt: now + MSG_RATE_WINDOW });
        }
        // Update last message info
        const entry = msgRateMap.get(senderId)!;
        entry.lastContent = rawContent;
        entry.lastAt = now;

        // Sanitize HTML and censor banned words
        const content = wordFilter.censor(sanitizeHtml(rawContent));

        const match = await storage.getMatch(matchId);
        if (!match) {
          return apiError(res, 404, ErrorCode.MATCH_NOT_FOUND);
        }

        if (match.user1Id !== senderId && match.user2Id !== senderId) {
          return apiError(res, 403, ErrorCode.NOT_IN_MATCH);
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
          notifyNewMessage(receiverId, senderProfile.nickname, content);
        }

        return res.json(message);
      } catch (error) {
        log.error({ err: error }, "Send message error");
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
      }
    },
  );

  app.post("/api/block", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { blockedUserId } = blockUserSchema.parse(req.body);

      await storage.blockUser(userId, blockedUserId);
      return res.json({ success: true });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return apiError(res, 400, ErrorCode.VALIDATION_FAILED, error.errors);
      }
      log.error({ err: error }, "Block error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  app.post("/api/heartbeat", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.updateLastSeen(userId);
      return res.json({ success: true });
    } catch (error) {
      log.error({ err: error }, "Heartbeat error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
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
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  app.get("/api/activity-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { userIds } = req.query;

      if (!userIds || typeof userIds !== "string") {
        return apiError(res, 400, ErrorCode.MISSING_FIELD);
      }

      const ids = userIds.split(",").filter(Boolean);
      const statuses = await storage.getOnlineUsers(ids);

      return res.json(statuses);
    } catch (error) {
      log.error({ err: error }, "Activity status error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  // ── Boost ──────────────────────────────────────────────────────────────────
  app.post("/api/boost", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const durationMinutes = Number(req.body.durationMinutes) || 30;
      const boostedUntil = await storage.setBoost(userId, durationMinutes);
      return res.json({ boostedUntil });
    } catch (error) {
      log.error({ err: error }, "Boost error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  app.delete("/api/boost", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.clearBoost(userId);
      return res.json({ success: true });
    } catch (error) {
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  app.get("/api/boost-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getProfile(userId);
      const now = new Date();
      const isBoosted = !!(profile?.boostedUntil && profile.boostedUntil > now);
      return res.json({ isBoosted, boostedUntil: profile?.boostedUntil || null });
    } catch (error) {
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  // ── Reactions ───────────────────────────────────────────────────────────────
  app.post("/api/messages/:messageId/react", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { messageId } = req.params;
      const { emoji } = req.body;
      if (!emoji) return apiError(res, 400, ErrorCode.MISSING_FIELD);

      const message = await storage.getMessageById(messageId);
      if (!message) return apiError(res, 404, ErrorCode.NOT_FOUND);

      const match = await storage.getMatch(message.matchId);
      if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
        return apiError(res, 403, ErrorCode.NOT_IN_MATCH);
      }

      const action = await storage.toggleReaction(messageId, userId, emoji);
      const reactionsMap = await storage.getMessageReactions([messageId]);
      const msgReactions = reactionsMap[messageId] || [];

      broadcastReaction(message.matchId, messageId, emoji, userId, action, msgReactions);

      return res.json({ action, reactions: msgReactions });
    } catch (error) {
      log.error({ err: error }, "Reaction error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  // ── Reviews ─────────────────────────────────────────────────────────────────
  app.post(
    "/api/reviews",
    requireAuth,
    validateRequest(createReviewSchema),
    async (req, res) => {
      try {
        const reviewerId = req.session.userId!;
        const { reviewedUserId, matchId, rating, tags, comment } = req.body;

        if (reviewerId === reviewedUserId) {
          return apiError(res, 400, ErrorCode.CANNOT_SWIPE_SELF);
        }

        // Verify they have a match together
        const match = matchId ? await storage.getMatch(matchId) : null;
        if (matchId) {
          if (!match || (match.user1Id !== reviewerId && match.user2Id !== reviewerId)) {
            return apiError(res, 403, ErrorCode.MATCH_NOT_FOUND);
          }
          if (match.user1Id !== reviewedUserId && match.user2Id !== reviewedUserId) {
            return apiError(res, 403, ErrorCode.NOT_IN_MATCH);
          }
        }

        const alreadyReviewed = await storage.hasReviewed(reviewerId, reviewedUserId);
        if (alreadyReviewed) {
          return apiError(res, 409, ErrorCode.ALREADY_EXISTS);
        }

        const review = await storage.createReview({
          reviewerId,
          reviewedUserId,
          matchId: matchId || null,
          rating,
          tags: tags || [],
          comment: comment || null,
        });

        return res.status(201).json(review);
      } catch (error) {
        log.error({ err: error }, "Create review error");
        return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
      }
    },
  );

  app.get("/api/reviews/stats/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const stats = await storage.getReviewStats(userId);
      return res.json(stats);
    } catch (error) {
      log.error({ err: error }, "Get review stats error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  app.get("/api/reviews/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.session.userId!;
      const reviewsList = await storage.getReviewsForUser(userId);
      const hasReviewed = await storage.hasReviewed(currentUserId, userId);
      return res.json({ reviews: reviewsList, hasReviewed });
    } catch (error) {
      log.error({ err: error }, "Get reviews error");
      return apiError(res, 500, ErrorCode.INTERNAL_ERROR);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
