import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { db } from "./db";
import { games } from "@shared/schema";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function seedGames() {
  const existingGames = await storage.getGames();
  if (existingGames.length === 0) {
    await db.insert(games).values([
      { name: "Valorant", icon: "valorant" },
      { name: "CS2", icon: "cs2" },
      { name: "Dota 2", icon: "dota2" },
      { name: "Fortnite", icon: "fortnite" },
      { name: "League of Legends", icon: "lol" },
    ]);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  await seedGames();

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await storage.createUser({ email, passwordHash });

      req.session.userId = user.id;

      return res.json({ user: { id: user.id, email: user.email } });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;

      const profile = await storage.getProfile(user.id);
      return res.json({
        user: { id: user.id, email: user.email, isPremium: user.isPremium },
        profile,
        hasProfile: !!profile,
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true });
    });
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
      console.error("Get me error:", error);
      return res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.get("/api/games", async (_req, res) => {
    try {
      const allGames = await storage.getGames();
      return res.json(allGames);
    } catch (error) {
      console.error("Get games error:", error);
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
      console.error("Get profile error:", error);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profileData = { ...req.body, userId };

      if (!profileData.nickname || !profileData.region) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const existing = await storage.getProfile(userId);
      if (existing) {
        const updated = await storage.updateProfile(userId, profileData);
        return res.json(updated);
      }

      const profile = await storage.createProfile(profileData);
      return res.json(profile);
    } catch (error) {
      console.error("Create profile error:", error);
      return res.status(500).json({ error: "Failed to create profile" });
    }
  });

  app.put("/api/profile/:userId", requireAuth, async (req, res) => {
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
      console.error("Update profile error:", error);
      return res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/user-games/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const userGames = await storage.getUserGames(userId);
      return res.json(userGames);
    } catch (error) {
      console.error("Get user games error:", error);
      return res.status(500).json({ error: "Failed to fetch user games" });
    }
  });

  app.post("/api/user-games", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { games: newGames } = req.body;
      await storage.setUserGames(userId, newGames.map((g: any) => ({ ...g, userId })));
      const updated = await storage.getUserGames(userId);
      return res.json(updated);
    } catch (error) {
      console.error("Set user games error:", error);
      return res.status(500).json({ error: "Failed to set user games" });
    }
  });

  app.get("/api/availability/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const availability = await storage.getAvailability(userId);
      return res.json(availability);
    } catch (error) {
      console.error("Get availability error:", error);
      return res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  app.post("/api/availability", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { windows } = req.body;
      await storage.setAvailability(userId, windows);
      const updated = await storage.getAvailability(userId);
      return res.json(updated);
    } catch (error) {
      console.error("Set availability error:", error);
      return res.status(500).json({ error: "Failed to set availability" });
    }
  });

  app.get("/api/feed", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { gameId, region, language } = req.query;

      const candidates = await storage.getFeedCandidates(userId, {
        gameId: gameId as string,
        region: region as string,
        language: language as string,
      });

      return res.json(candidates);
    } catch (error) {
      console.error("Get feed error:", error);
      return res.status(500).json({ error: "Failed to fetch feed" });
    }
  });

  app.post("/api/swipe", requireAuth, async (req, res) => {
    try {
      const fromUserId = req.session.userId!;
      const { toUserId, swipeType } = req.body;

      if (!toUserId || !swipeType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const dailyCount = await storage.getDailySwipeCount(fromUserId);
      const limit = await storage.getSwipeLimit(fromUserId);

      if (dailyCount >= limit) {
        return res.status(429).json({
          error: "Daily swipe limit reached",
          dailyCount,
          limit,
        });
      }

      const swipe = await storage.createSwipe({
        fromUserId,
        toUserId,
        swipeType,
      });

      await storage.incrementDailySwipeCount(fromUserId);

      let match = null;
      if (swipeType === "like" || swipeType === "super") {
        const isMutual = await storage.checkMutualLike(fromUserId, toUserId);
        if (isMutual) {
          const existing = await storage.getMatchByUsers(fromUserId, toUserId);
          if (!existing) {
            match = await storage.createMatch(fromUserId, toUserId);
          }
        }
      }

      const newCount = await storage.getDailySwipeCount(fromUserId);

      return res.json({
        swipe,
        match,
        dailyCount: newCount,
        limit,
        remaining: limit - newCount,
      });
    } catch (error) {
      console.error("Swipe error:", error);
      return res.status(500).json({ error: "Failed to process swipe" });
    }
  });

  app.get("/api/swipe-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const dailyCount = await storage.getDailySwipeCount(userId);
      const limit = await storage.getSwipeLimit(userId);
      return res.json({
        dailyCount,
        limit,
        remaining: limit - dailyCount,
      });
    } catch (error) {
      console.error("Get swipe status error:", error);
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
            (m) => !m.isRead && m.senderId !== userId
          ).length;

          return {
            ...match,
            otherUser: { profile, userGames },
            lastMessage,
            unreadCount,
          };
        })
      );

      return res.json(enrichedMatches);
    } catch (error) {
      console.error("Get matches error:", error);
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
      console.error("Get messages error:", error);
      return res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const senderId = req.session.userId!;
      const { matchId, content } = req.body;

      if (!matchId || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const match = await storage.getMatch(matchId);
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }

      if (match.user1Id !== senderId && match.user2Id !== senderId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const message = await storage.createMessage({ matchId, senderId, content });
      return res.json(message);
    } catch (error) {
      console.error("Send message error:", error);
      return res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.post("/api/report", requireAuth, async (req, res) => {
    try {
      const reporterId = req.session.userId!;
      const { reportedUserId, reason, details } = req.body;

      if (!reportedUserId || !reason) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      await storage.createReport(reporterId, reportedUserId, reason, details);
      return res.json({ success: true });
    } catch (error) {
      console.error("Report error:", error);
      return res.status(500).json({ error: "Failed to submit report" });
    }
  });

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
      console.error("Block error:", error);
      return res.status(500).json({ error: "Failed to block user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
