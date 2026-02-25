import {
  users,
  profiles,
  games,
  userGames,
  availabilityWindows,
  swipes,
  matches,
  messages,
  reactions,
  reports,
  blocks,
  dailySwipeCounts,
  dailySuperLikeCounts,
  reviews,
  type User,
  type InsertUser,
  type Profile,
  type InsertProfile,
  type Game,
  type UserGame,
  type InsertUserGame,
  type Swipe,
  type InsertSwipe,
  type Match,
  type Message,
  type InsertMessage,
  type AvailabilityWindow,
  type InsertReview,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, sql, desc, ne, notInArray, inArray, gt } from "drizzle-orm";

export interface ReactionSummary {
  emoji: string;
  count: number;
  userIds: string[];
}

const RANK_ORDER: Record<string, string[]> = {
  valorant: [
    "Iron",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
    "Ascendant",
    "Immortal",
    "Radiant",
  ],
  cs2: [
    "Silver",
    "Gold Nova",
    "Master Guardian",
    "Distinguished",
    "Legendary Eagle",
    "Supreme",
    "Global Elite",
  ],
  dota2: [
    "Herald",
    "Guardian",
    "Crusader",
    "Archon",
    "Legend",
    "Ancient",
    "Divine",
    "Immortal",
  ],
  fortnite: ["Open", "Contender", "Champion", "Unreal"],
  lol: [
    "Iron",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Emerald",
    "Diamond",
    "Master",
    "Grandmaster",
    "Challenger",
  ],
  wot: [
    "Beginner",
    "Average",
    "Good",
    "Very Good",
    "Great",
    "Unicum",
    "Super Unicum",
  ],
  apex: [
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
    "Master",
    "Apex Predator",
  ],
};

function getRankIndex(gameId: string, rank: string | null): number {
  if (!rank) return -1;
  const ranks = RANK_ORDER[gameId];
  if (!ranks) return -1;
  return ranks.indexOf(rank);
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;

  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(
    userId: string,
    profile: Partial<InsertProfile>,
  ): Promise<Profile | undefined>;

  getGames(): Promise<Game[]>;
  getGame(id: string): Promise<Game | undefined>;

  getUserGames(userId: string): Promise<UserGame[]>;
  setUserGames(userId: string, games: InsertUserGame[]): Promise<void>;

  getAvailability(userId: string): Promise<AvailabilityWindow[]>;
  setAvailability(
    userId: string,
    windows: { dayOfWeek: number; startTime: string; endTime: string }[],
  ): Promise<void>;

  getFeedCandidates(
    userId: string,
    filters: {
      gameId?: string | string[];
      region?: string | string[];
      language?: string | string[];
      micRequired?: boolean;
      playstyle?: string | string[];
      rankMin?: string;
      rankMax?: string;
      availableNowOnly?: boolean;
    },
  ): Promise<
    (Profile & {
      userGames: UserGame[];
      availability: AvailabilityWindow[];
      isOnline: boolean;
      isAvailableNow: boolean;
      superLikedMe: boolean;
    })[]
  >;

  createSwipe(swipe: InsertSwipe): Promise<Swipe>;
  getSwipe(fromUserId: string, toUserId: string): Promise<Swipe | undefined>;
  checkMutualLike(user1Id: string, user2Id: string): Promise<boolean>;
  deleteLastSwipe(userId: string): Promise<Swipe | null>;
  decrementDailySwipeCount(userId: string): Promise<void>;
  deleteMatchByUsers(user1Id: string, user2Id: string): Promise<void>;
  getDailyUndoCount(userId: string): number;
  incrementDailyUndoCount(userId: string): void;
  getUndoLimit(userId: string): Promise<number>;

  createMatch(user1Id: string, user2Id: string): Promise<Match>;
  getMatches(userId: string): Promise<Match[]>;
  getMatch(matchId: string): Promise<Match | undefined>;
  getMatchByUsers(user1Id: string, user2Id: string): Promise<Match | undefined>;

  getMessages(matchId: string): Promise<(Message & { reactions: ReactionSummary[] })[]>;
  getMessageById(messageId: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(matchId: string, userId: string): Promise<void>;
  toggleReaction(messageId: string, userId: string, emoji: string): Promise<"added" | "removed">;
  getMessageReactions(messageIds: string[]): Promise<Record<string, ReactionSummary[]>>;

  createReport(
    reporterId: string,
    reportedUserId: string,
    reason: string,
    details?: string,
  ): Promise<void>;
  blockUser(userId: string, blockedUserId: string): Promise<void>;
  isBlocked(userId: string, blockedUserId: string): Promise<boolean>;
  getBlockedUsers(userId: string): Promise<string[]>;

  getDailySwipeCount(userId: string): Promise<number>;
  incrementDailySwipeCount(userId: string): Promise<number>;
  getSwipeLimit(userId: string): Promise<number>;

  getDailySuperLikeCount(userId: string): Promise<number>;
  incrementDailySuperLikeCount(userId: string): Promise<number>;
  getSuperLikeLimit(userId: string): Promise<number>;
  getSuperLikerIds(userId: string): Promise<string[]>;

  updateLastSeen(userId: string): Promise<void>;
  setAvailableNow(userId: string, durationMinutes: number): Promise<void>;
  clearAvailableNow(userId: string): Promise<void>;
  setBoost(userId: string, durationMinutes: number): Promise<Date>;
  clearBoost(userId: string): Promise<void>;
  getBoostedUserIds(): Promise<string[]>;
  getOnlineUsers(
    userIds: string[],
  ): Promise<{ userId: string; isOnline: boolean; isAvailableNow: boolean }[]>;

  // Push notifications
  getPushToken(userId: string): Promise<string | null>;
  setPushToken(userId: string, token: string): Promise<void>;
  removePushToken(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private undoMap = new Map<string, { date: string; count: number }>();

  getDailyUndoCount(userId: string): number {
    const today = new Date().toISOString().split("T")[0];
    const entry = this.undoMap.get(userId);
    if (!entry || entry.date !== today) return 0;
    return entry.count;
  }

  incrementDailyUndoCount(userId: string): void {
    const today = new Date().toISOString().split("T")[0];
    const entry = this.undoMap.get(userId);
    if (!entry || entry.date !== today) {
      this.undoMap.set(userId, { date: today, count: 1 });
    } else {
      entry.count += 1;
    }
  }

  async getUndoLimit(userId: string): Promise<number> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.isPremium ? 5 : 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: string): Promise<void> {
    // Delete in order of dependencies
    await db.delete(messages).where(eq(messages.senderId, userId));
    await db.delete(matches).where(
      or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
    );
    await db.delete(swipes).where(
      or(eq(swipes.fromUserId, userId), eq(swipes.toUserId, userId))
    );
    await db.delete(reports).where(
      or(eq(reports.reporterId, userId), eq(reports.reportedUserId, userId))
    );
    await db.delete(blocks).where(
      or(eq(blocks.userId, userId), eq(blocks.blockedUserId, userId))
    );
    await db.delete(dailySwipeCounts).where(eq(dailySwipeCounts.userId, userId));
    await db.delete(dailySuperLikeCounts).where(eq(dailySuperLikeCounts.userId, userId));
    await db.delete(availabilityWindows).where(eq(availabilityWindows.userId, userId));
    await db.delete(userGames).where(eq(userGames.userId, userId));
    await db.delete(profiles).where(eq(profiles.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));
    return profile || undefined;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const [created] = await db.insert(profiles).values(profile).returning();
    return created;
  }

  async updateProfile(
    userId: string,
    profileData: Partial<InsertProfile>,
  ): Promise<Profile | undefined> {
    const [updated] = await db
      .update(profiles)
      .set(profileData)
      .where(eq(profiles.userId, userId))
      .returning();
    return updated || undefined;
  }

  async getGames(): Promise<Game[]> {
    return db.select().from(games);
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game || undefined;
  }

  async getUserGames(userId: string): Promise<UserGame[]> {
    return db.select().from(userGames).where(eq(userGames.userId, userId));
  }

  async setUserGames(
    userId: string,
    newGames: InsertUserGame[],
  ): Promise<void> {
    await db.delete(userGames).where(eq(userGames.userId, userId));
    if (newGames.length > 0) {
      await db.insert(userGames).values(newGames);
    }
  }

  async getAvailability(userId: string): Promise<AvailabilityWindow[]> {
    return db
      .select()
      .from(availabilityWindows)
      .where(eq(availabilityWindows.userId, userId));
  }

  async setAvailability(
    userId: string,
    windows: { dayOfWeek: number; startTime: string; endTime: string }[],
  ): Promise<void> {
    await db
      .delete(availabilityWindows)
      .where(eq(availabilityWindows.userId, userId));
    if (windows.length > 0) {
      await db.insert(availabilityWindows).values(
        windows.map((w) => ({
          userId,
          dayOfWeek: w.dayOfWeek,
          startTime: w.startTime,
          endTime: w.endTime,
        })),
      );
    }
  }

  async getFeedCandidates(
    userId: string,
    filters: {
      gameId?: string | string[];
      region?: string | string[];
      language?: string | string[];
      micRequired?: boolean;
      playstyle?: string | string[];
      rankMin?: string;
      rankMax?: string;
      availableNowOnly?: boolean;
    },
  ): Promise<
    (Profile & {
      userGames: UserGame[];
      availability: AvailabilityWindow[];
      isOnline: boolean;
      isAvailableNow: boolean;
      superLikedMe: boolean;
    })[]
  > {
    // Load current user's data for compatibility scoring
    const [myGames, myWindows] = await Promise.all([
      this.getUserGames(userId),
      this.getAvailability(userId),
    ]);

    const blockedIds = await this.getBlockedUsers(userId);
    const swipedUsers = await db
      .select({ toUserId: swipes.toUserId })
      .from(swipes)
      .where(eq(swipes.fromUserId, userId));
    const swipedIds = swipedUsers.map((s) => s.toUserId);

    const excludeIds = [...blockedIds, ...swipedIds, userId];

    const baseCondition =
      excludeIds.length > 0
        ? notInArray(profiles.userId, excludeIds)
        : ne(profiles.userId, userId);

    const candidateProfiles = await db
      .select()
      .from(profiles)
      .where(baseCondition!)
      .limit(50);

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const now = new Date();

    const result = await Promise.all(
      candidateProfiles.map(async (profile) => {
        const candidateGames = await this.getUserGames(profile.userId);
        const availability = await this.getAvailability(profile.userId);

        if (filters.gameId) {
          const gameIds = Array.isArray(filters.gameId)
            ? filters.gameId
            : [filters.gameId];
          if (!candidateGames.some((g) => gameIds.includes(g.gameId))) {
            return null;
          }
        }

        if (filters.region) {
          const regions = Array.isArray(filters.region)
            ? filters.region
            : [filters.region];
          if (!regions.includes(profile.region)) {
            return null;
          }
        }

        if (filters.language) {
          const filterLang = Array.isArray(filters.language)
            ? filters.language
            : [filters.language];
          const profileLangs = (profile.languages as string[]) || [];
          if (!filterLang.some((fl) => profileLangs.includes(fl))) {
            return null;
          }
        }

        if (filters.micRequired) {
          if (!profile.micEnabled) {
            return null;
          }
        }

        if (filters.playstyle) {
          const playstyles = Array.isArray(filters.playstyle)
            ? filters.playstyle
            : [filters.playstyle];
          if (
            !candidateGames.some(
              (g) => g.playstyle && playstyles.includes(g.playstyle),
            )
          ) {
            return null;
          }
        }

        if (filters.rankMin || filters.rankMax) {
          const filterGameIds = filters.gameId
            ? Array.isArray(filters.gameId)
              ? filters.gameId
              : [filters.gameId]
            : null;
          const matchingGames = filterGameIds
            ? candidateGames.filter((g) => filterGameIds.includes(g.gameId))
            : candidateGames;
          const passesRank = matchingGames.some((g) => {
            const idx = getRankIndex(g.gameId, g.rank);
            if (idx === -1) return false;
            if (filters.rankMin) {
              const minIdx = getRankIndex(g.gameId, filters.rankMin);
              if (minIdx !== -1 && idx < minIdx) return false;
            }
            if (filters.rankMax) {
              const maxIdx = getRankIndex(g.gameId, filters.rankMax);
              if (maxIdx !== -1 && idx > maxIdx) return false;
            }
            return true;
          });
          if (!passesRank) return null;
        }

        const isOnline = profile.lastSeenAt
          ? profile.lastSeenAt > fiveMinutesAgo
          : false;
        const isAvailableNow =
          (profile.isAvailableNow &&
            profile.availableUntil &&
            profile.availableUntil > now) ||
          false;

        if (filters.availableNowOnly && !isAvailableNow) {
          return null;
        }

        return {
          ...profile,
          userGames: candidateGames,
          availability,
          isOnline,
          isAvailableNow,
        };
      }),
    );

    const filtered = result.filter((r) => r !== null) as (Profile & {
      userGames: UserGame[];
      availability: AvailabilityWindow[];
      isOnline: boolean;
      isAvailableNow: boolean;
    })[];

    const [superLikerIds, boostedIds] = await Promise.all([
      this.getSuperLikerIds(userId),
      this.getBoostedUserIds(),
    ]);
    const superLikerSet = new Set(superLikerIds);
    const boostSet = new Set(boostedIds);

    // Multi-factor scoring: higher score = shown first
    const myGameIds = new Set(myGames.map((g) => g.gameId));
    const myPlaystyles = new Set(
      myGames.map((g) => g.playstyle).filter((p): p is string => !!p),
    );
    const todayDow = new Date().getDay();

    const scored = filtered.map((candidate) => {
      let score = 0;

      // Social signals (highest priority — preserves existing behaviour)
      if (superLikerSet.has(candidate.userId)) score += 40;
      if (boostSet.has(candidate.userId)) score += 20;

      // Shared games (up to 3 × 5 = 15 pts)
      const sharedCount = candidate.userGames.filter((g) =>
        myGameIds.has(g.gameId),
      ).length;
      score += Math.min(sharedCount, 3) * 5;

      // Rank proximity for shared games (up to 10 pts per shared game, capped effectively)
      for (const myGame of myGames) {
        const theirGame = candidate.userGames.find(
          (g) => g.gameId === myGame.gameId,
        );
        if (!theirGame || !myGame.rank || !theirGame.rank) continue;
        const myIdx = getRankIndex(myGame.gameId, myGame.rank);
        const theirIdx = getRankIndex(myGame.gameId, theirGame.rank);
        if (myIdx === -1 || theirIdx === -1) continue;
        const diff = Math.abs(myIdx - theirIdx);
        if (diff <= 1) score += 10;
        else if (diff <= 2) score += 5;
      }

      // Matching playstyle (8 pts)
      if (
        candidate.userGames.some(
          (g) => g.playstyle && myPlaystyles.has(g.playstyle),
        )
      ) {
        score += 8;
      }

      // Activity signals
      if (candidate.isOnline) score += 7;
      if (candidate.isAvailableNow) score += 6;

      // Schedule overlap today (5 pts)
      const myToday = myWindows.filter((w) => w.dayOfWeek === todayDow);
      const theirToday = candidate.availability.filter(
        (w) => w.dayOfWeek === todayDow,
      );
      if (myToday.length > 0 && theirToday.length > 0) score += 5;

      // Good behaviour (3 pts)
      if ((candidate.toxicityRating ?? 0) === 0) score += 3;

      // New user boost — ≤7 days old (2 pts)
      if (candidate.createdAt) {
        const ageMs = Date.now() - new Date(candidate.createdAt).getTime();
        if (ageMs < 7 * 24 * 60 * 60 * 1000) score += 2;
      }

      return { candidate, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.map(({ candidate }) => ({
      ...candidate,
      superLikedMe: superLikerSet.has(candidate.userId),
    }));
  }

  async createSwipe(swipe: InsertSwipe): Promise<Swipe> {
    const [created] = await db.insert(swipes).values(swipe).returning();
    return created;
  }

  async getSwipe(
    fromUserId: string,
    toUserId: string,
  ): Promise<Swipe | undefined> {
    const [swipe] = await db
      .select()
      .from(swipes)
      .where(
        and(eq(swipes.fromUserId, fromUserId), eq(swipes.toUserId, toUserId)),
      );
    return swipe || undefined;
  }

  async checkMutualLike(user1Id: string, user2Id: string): Promise<boolean> {
    const [swipe] = await db
      .select()
      .from(swipes)
      .where(
        and(
          eq(swipes.fromUserId, user2Id),
          eq(swipes.toUserId, user1Id),
          or(eq(swipes.swipeType, "like"), eq(swipes.swipeType, "super")),
        ),
      );
    return !!swipe;
  }

  async createMatch(user1Id: string, user2Id: string): Promise<Match> {
    const [match] = await db
      .insert(matches)
      .values({ user1Id, user2Id })
      .returning();
    return match;
  }

  async getMatches(userId: string): Promise<Match[]> {
    return db
      .select()
      .from(matches)
      .where(or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)))
      .orderBy(desc(matches.lastMessageAt), desc(matches.matchedAt));
  }

  async getMatch(matchId: string): Promise<Match | undefined> {
    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId));
    return match || undefined;
  }

  async getMatchByUsers(
    user1Id: string,
    user2Id: string,
  ): Promise<Match | undefined> {
    const [match] = await db
      .select()
      .from(matches)
      .where(
        or(
          and(eq(matches.user1Id, user1Id), eq(matches.user2Id, user2Id)),
          and(eq(matches.user1Id, user2Id), eq(matches.user2Id, user1Id)),
        ),
      );
    return match || undefined;
  }

  async getMessages(matchId: string): Promise<(Message & { reactions: ReactionSummary[] })[]> {
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.matchId, matchId))
      .orderBy(messages.createdAt);
    const msgIds = msgs.map((m) => m.id);
    const reactionMap = await this.getMessageReactions(msgIds);
    return msgs.map((m) => ({ ...m, reactions: reactionMap[m.id] || [] }));
  }

  async getMessageById(messageId: string): Promise<Message | undefined> {
    const [msg] = await db.select().from(messages).where(eq(messages.id, messageId));
    return msg || undefined;
  }

  async toggleReaction(messageId: string, userId: string, emoji: string): Promise<"added" | "removed"> {
    const existing = await db
      .select()
      .from(reactions)
      .where(and(eq(reactions.messageId, messageId), eq(reactions.userId, userId), eq(reactions.emoji, emoji)))
      .limit(1);
    if (existing.length > 0) {
      await db.delete(reactions).where(
        and(eq(reactions.messageId, messageId), eq(reactions.userId, userId), eq(reactions.emoji, emoji)),
      );
      return "removed";
    } else {
      await db.insert(reactions).values({ messageId, userId, emoji });
      return "added";
    }
  }

  async getMessageReactions(messageIds: string[]): Promise<Record<string, ReactionSummary[]>> {
    if (messageIds.length === 0) return {};
    const rows = await db
      .select()
      .from(reactions)
      .where(inArray(reactions.messageId, messageIds));
    const result: Record<string, ReactionSummary[]> = {};
    for (const row of rows) {
      if (!result[row.messageId]) result[row.messageId] = [];
      const existing = result[row.messageId].find((r) => r.emoji === row.emoji);
      if (existing) {
        existing.count++;
        existing.userIds.push(row.userId);
      } else {
        result[row.messageId].push({ emoji: row.emoji, count: 1, userIds: [row.userId] });
      }
    }
    return result;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    await db
      .update(matches)
      .set({ lastMessageAt: new Date() })
      .where(eq(matches.id, message.matchId));
    return created;
  }

  async markMessagesAsRead(matchId: string, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.matchId, matchId), ne(messages.senderId, userId)));
  }

  async createReport(
    reporterId: string,
    reportedUserId: string,
    reason: string,
    details?: string,
  ): Promise<void> {
    await db.insert(reports).values({
      reporterId,
      reportedUserId,
      reason,
      details,
    });
  }

  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    await db
      .insert(blocks)
      .values({ userId, blockedUserId })
      .onConflictDoNothing();
  }

  async isBlocked(userId: string, blockedUserId: string): Promise<boolean> {
    const [block] = await db
      .select()
      .from(blocks)
      .where(
        or(
          and(
            eq(blocks.userId, userId),
            eq(blocks.blockedUserId, blockedUserId),
          ),
          and(
            eq(blocks.userId, blockedUserId),
            eq(blocks.blockedUserId, userId),
          ),
        ),
      );
    return !!block;
  }

  async getBlockedUsers(userId: string): Promise<string[]> {
    const blockedByMe = await db
      .select({ blockedUserId: blocks.blockedUserId })
      .from(blocks)
      .where(eq(blocks.userId, userId));

    const blockedMe = await db
      .select({ userId: blocks.userId })
      .from(blocks)
      .where(eq(blocks.blockedUserId, userId));

    return [
      ...blockedByMe.map((b) => b.blockedUserId),
      ...blockedMe.map((b) => b.userId),
    ];
  }

  async getDailySwipeCount(userId: string): Promise<number> {
    const today = new Date().toISOString().split("T")[0];
    const [record] = await db
      .select()
      .from(dailySwipeCounts)
      .where(
        and(
          eq(dailySwipeCounts.userId, userId),
          eq(dailySwipeCounts.date, today),
        ),
      );
    return record?.count || 0;
  }

  async incrementDailySwipeCount(userId: string): Promise<number> {
    const today = new Date().toISOString().split("T")[0];
    const [existing] = await db
      .select()
      .from(dailySwipeCounts)
      .where(
        and(
          eq(dailySwipeCounts.userId, userId),
          eq(dailySwipeCounts.date, today),
        ),
      );

    if (existing) {
      const [updated] = await db
        .update(dailySwipeCounts)
        .set({ count: (existing.count || 0) + 1 })
        .where(eq(dailySwipeCounts.id, existing.id))
        .returning();
      return updated.count || 0;
    } else {
      const [created] = await db
        .insert(dailySwipeCounts)
        .values({ userId, date: today, count: 1 })
        .returning();
      return created.count || 0;
    }
  }

  async deleteLastSwipe(userId: string): Promise<Swipe | null> {
    const [lastSwipe] = await db
      .select()
      .from(swipes)
      .where(eq(swipes.fromUserId, userId))
      .orderBy(desc(swipes.createdAt))
      .limit(1);

    if (!lastSwipe) return null;

    await db.delete(swipes).where(eq(swipes.id, lastSwipe.id));
    return lastSwipe;
  }

  async decrementDailySwipeCount(userId: string): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const [existing] = await db
      .select()
      .from(dailySwipeCounts)
      .where(
        and(
          eq(dailySwipeCounts.userId, userId),
          eq(dailySwipeCounts.date, today),
        ),
      );

    if (existing && (existing.count || 0) > 0) {
      await db
        .update(dailySwipeCounts)
        .set({ count: (existing.count || 0) - 1 })
        .where(eq(dailySwipeCounts.id, existing.id));
    }
  }

  async deleteMatchByUsers(user1Id: string, user2Id: string): Promise<void> {
    await db.delete(matches).where(
      or(
        and(eq(matches.user1Id, user1Id), eq(matches.user2Id, user2Id)),
        and(eq(matches.user1Id, user2Id), eq(matches.user2Id, user1Id)),
      ),
    );
  }

  async getSwipeLimit(userId: string): Promise<number> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.isPremium ? 999 : 50;
  }

  async getDailySuperLikeCount(userId: string): Promise<number> {
    const today = new Date().toISOString().split("T")[0];
    const [record] = await db
      .select()
      .from(dailySuperLikeCounts)
      .where(
        and(
          eq(dailySuperLikeCounts.userId, userId),
          eq(dailySuperLikeCounts.date, today),
        ),
      );
    return record?.count || 0;
  }

  async incrementDailySuperLikeCount(userId: string): Promise<number> {
    const today = new Date().toISOString().split("T")[0];
    const [existing] = await db
      .select()
      .from(dailySuperLikeCounts)
      .where(
        and(
          eq(dailySuperLikeCounts.userId, userId),
          eq(dailySuperLikeCounts.date, today),
        ),
      );

    if (existing) {
      const [updated] = await db
        .update(dailySuperLikeCounts)
        .set({ count: (existing.count || 0) + 1 })
        .where(eq(dailySuperLikeCounts.id, existing.id))
        .returning();
      return updated.count || 0;
    } else {
      const [created] = await db
        .insert(dailySuperLikeCounts)
        .values({ userId, date: today, count: 1 })
        .returning();
      return created.count || 0;
    }
  }

  async getSuperLikeLimit(userId: string): Promise<number> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.isPremium ? 5 : 1;
  }

  async getSuperLikerIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({ fromUserId: swipes.fromUserId })
      .from(swipes)
      .where(
        and(
          eq(swipes.toUserId, userId),
          eq(swipes.swipeType, "super"),
        ),
      );
    return rows.map((r) => r.fromUserId);
  }

  async updateLastSeen(userId: string): Promise<void> {
    await db
      .update(profiles)
      .set({ lastSeenAt: new Date() })
      .where(eq(profiles.userId, userId));
  }

  async setAvailableNow(
    userId: string,
    durationMinutes: number,
  ): Promise<void> {
    const availableUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    await db
      .update(profiles)
      .set({
        isAvailableNow: true,
        availableUntil,
        lastSeenAt: new Date(),
      })
      .where(eq(profiles.userId, userId));
  }

  async clearAvailableNow(userId: string): Promise<void> {
    await db
      .update(profiles)
      .set({
        isAvailableNow: false,
        availableUntil: null,
      })
      .where(eq(profiles.userId, userId));
  }

  async getOnlineUsers(
    userIds: string[],
  ): Promise<{ userId: string; isOnline: boolean; isAvailableNow: boolean }[]> {
    if (userIds.length === 0) return [];

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const now = new Date();

    const userProfiles = await db
      .select({
        userId: profiles.userId,
        lastSeenAt: profiles.lastSeenAt,
        isAvailableNow: profiles.isAvailableNow,
        availableUntil: profiles.availableUntil,
      })
      .from(profiles)
      .where(
        userIds.length === 1
          ? eq(profiles.userId, userIds[0])
          : sql`${profiles.userId} = ANY(${userIds})`,
      );

    return userProfiles.map((p) => ({
      userId: p.userId,
      isOnline: p.lastSeenAt ? p.lastSeenAt > fiveMinutesAgo : false,
      isAvailableNow:
        (p.isAvailableNow && p.availableUntil && p.availableUntil > now) ||
        false,
    }));
  }

  // Push notifications
  async getPushToken(userId: string): Promise<string | null> {
    const [user] = await db
      .select({ pushToken: users.pushToken })
      .from(users)
      .where(eq(users.id, userId));
    return user?.pushToken || null;
  }

  async setPushToken(userId: string, token: string): Promise<void> {
    await db
      .update(users)
      .set({ pushToken: token })
      .where(eq(users.id, userId));
  }

  async removePushToken(userId: string): Promise<void> {
    await db.update(users).set({ pushToken: null }).where(eq(users.id, userId));
  }

  async setBoost(userId: string, durationMinutes: number): Promise<Date> {
    const boostedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    await db.update(profiles).set({ boostedUntil }).where(eq(profiles.userId, userId));
    return boostedUntil;
  }

  async clearBoost(userId: string): Promise<void> {
    await db.update(profiles).set({ boostedUntil: null }).where(eq(profiles.userId, userId));
  }

  async getBoostedUserIds(): Promise<string[]> {
    const now = new Date();
    const rows = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(gt(profiles.boostedUntil, now));
    return rows.map((r) => r.userId);
  }

  // Reviews
  async createReview(data: InsertReview) {
    const [review] = await db.insert(reviews).values(data).returning();
    return review;
  }

  async hasReviewed(reviewerId: string, reviewedUserId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.reviewerId, reviewerId), eq(reviews.reviewedUserId, reviewedUserId)));
    return !!row;
  }

  async getReviewsForUser(userId: string) {
    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        tags: reviews.tags,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        reviewer: {
          userId: profiles.userId,
          nickname: profiles.nickname,
          avatarUrl: profiles.avatarUrl,
        },
      })
      .from(reviews)
      .innerJoin(profiles, eq(profiles.userId, reviews.reviewerId))
      .where(eq(reviews.reviewedUserId, userId))
      .orderBy(desc(reviews.createdAt));
    return rows;
  }

  async getReviewStats(userId: string) {
    const rows = await db
      .select({ rating: reviews.rating, tags: reviews.tags })
      .from(reviews)
      .where(eq(reviews.reviewedUserId, userId));

    if (rows.length === 0) {
      return { averageRating: 0, totalReviews: 0, tagCounts: {} as Record<string, number> };
    }

    const totalRating = rows.reduce((sum, r) => sum + r.rating, 0);
    const tagCounts: Record<string, number> = {};
    for (const row of rows) {
      for (const tag of (row.tags as string[]) || []) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    return {
      averageRating: Math.round((totalRating / rows.length) * 10) / 10,
      totalReviews: rows.length,
      tagCounts,
    };
  }
}

export const storage = new DatabaseStorage();
