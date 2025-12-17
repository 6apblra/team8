import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isPremium: boolean("is_premium").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  nickname: text("nickname").notNull(),
  avatarUrl: text("avatar_url"),
  age: integer("age"),
  bio: text("bio"),
  region: text("region").notNull(),
  timezone: text("timezone"),
  languages: jsonb("languages").$type<string[]>().default([]),
  micEnabled: boolean("mic_enabled").default(true),
  discordTag: text("discord_tag"),
  steamId: text("steam_id"),
  riotId: text("riot_id"),
  toxicityRating: integer("toxicity_rating").default(0),
  lastSeenAt: timestamp("last_seen_at"),
  isAvailableNow: boolean("is_available_now").default(false),
  availableUntil: timestamp("available_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const games = pgTable("games", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  icon: text("icon"),
});

export const userGames = pgTable(
  "user_games",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: varchar("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    rank: text("rank"),
    roles: jsonb("roles").$type<string[]>().default([]),
    playstyle: text("playstyle"),
    platform: text("platform"),
    isPrimary: boolean("is_primary").default(false),
  },
  (table) => [
    index("user_games_user_id_idx").on(table.userId),
    index("user_games_game_id_idx").on(table.gameId),
  ]
);

export const availabilityWindows = pgTable(
  "availability_windows",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
  },
  (table) => [index("availability_user_id_idx").on(table.userId)]
);

export const swipes = pgTable(
  "swipes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fromUserId: varchar("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: varchar("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    swipeType: text("swipe_type").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("swipes_to_user_idx").on(table.toUserId, table.createdAt),
    index("swipes_from_user_idx").on(table.fromUserId, table.toUserId),
    index("swipes_from_created_idx").on(table.fromUserId, table.createdAt),
  ]
);

export const matches = pgTable(
  "matches",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    user1Id: varchar("user1_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    user2Id: varchar("user2_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchedAt: timestamp("matched_at").defaultNow(),
    lastMessageAt: timestamp("last_message_at"),
  },
  (table) => [
    index("matches_user1_idx").on(table.user1Id),
    index("matches_user2_idx").on(table.user2Id),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    matchId: varchar("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    senderId: varchar("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("messages_match_idx").on(table.matchId, table.createdAt),
    index("messages_sender_idx").on(table.senderId),
  ]
);

export const reports = pgTable("reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reportedUserId: varchar("reported_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blocks = pgTable(
  "blocks",
  {
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedUserId: varchar("blocked_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.blockedUserId] }),
    index("blocks_user_idx").on(table.userId),
  ]
);

export const dailySwipeCounts = pgTable(
  "daily_swipe_counts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    count: integer("count").default(0),
    swipeLimit: integer("swipe_limit").default(50),
  },
  (table) => [index("daily_swipes_user_date_idx").on(table.userId, table.date)]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  userGames: many(userGames),
  availabilityWindows: many(availabilityWindows),
  sentSwipes: many(swipes, { relationName: "sentSwipes" }),
  receivedSwipes: many(swipes, { relationName: "receivedSwipes" }),
  matchesAsUser1: many(matches, { relationName: "user1Matches" }),
  matchesAsUser2: many(matches, { relationName: "user2Matches" }),
  sentMessages: many(messages),
  reports: many(reports, { relationName: "reporter" }),
  reportedBy: many(reports, { relationName: "reported" }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const userGamesRelations = relations(userGames, ({ one }) => ({
  user: one(users, {
    fields: [userGames.userId],
    references: [users.id],
  }),
  game: one(games, {
    fields: [userGames.gameId],
    references: [games.id],
  }),
}));

export const swipesRelations = relations(swipes, ({ one }) => ({
  fromUser: one(users, {
    fields: [swipes.fromUserId],
    references: [users.id],
    relationName: "sentSwipes",
  }),
  toUser: one(users, {
    fields: [swipes.toUserId],
    references: [users.id],
    relationName: "receivedSwipes",
  }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  user1: one(users, {
    fields: [matches.user1Id],
    references: [users.id],
    relationName: "user1Matches",
  }),
  user2: one(users, {
    fields: [matches.user2Id],
    references: [users.id],
    relationName: "user2Matches",
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  match: one(matches, {
    fields: [messages.matchId],
    references: [matches.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  passwordHash: true,
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
});

export const insertUserGameSchema = createInsertSchema(userGames).omit({
  id: true,
});

export const insertSwipeSchema = createInsertSchema(swipes).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Game = typeof games.$inferSelect;
export type UserGame = typeof userGames.$inferSelect;
export type InsertUserGame = z.infer<typeof insertUserGameSchema>;
export type Swipe = typeof swipes.$inferSelect;
export type InsertSwipe = z.infer<typeof insertSwipeSchema>;
export type Match = typeof matches.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type AvailabilityWindow = typeof availabilityWindows.$inferSelect;
export type Block = typeof blocks.$inferSelect;
export type Report = typeof reports.$inferSelect;
