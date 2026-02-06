import { z } from "zod";

// ============ Auth Schemas ============
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password too long"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ============ Profile Schemas ============
export const createProfileSchema = z.object({
  nickname: z
    .string()
    .min(2, "Nickname must be at least 2 characters")
    .max(30, "Nickname too long")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Nickname can only contain letters, numbers, - and _",
    ),
  bio: z.string().max(500, "Bio too long").optional().nullable(),
  region: z.string().min(1, "Region is required"),
  languages: z.array(z.string()).default([]),
  micEnabled: z.boolean().default(true),
  discordTag: z.string().max(50, "Discord tag too long").optional().nullable(),
  age: z.number().int().min(13).max(120).optional().nullable(),
});

export const updateProfileSchema = createProfileSchema.partial();

// ============ User Games Schemas ============
export const userGameSchema = z.object({
  gameId: z.string().min(1, "Game ID is required"),
  rank: z.string().max(50).optional().nullable(),
  roles: z.array(z.string()).default([]),
  playstyle: z
    .enum(["competitive", "casual", "flex", "both"])
    .optional()
    .nullable(),
  platform: z
    .enum(["pc", "ps5", "xbox", "console", "mobile"])
    .optional()
    .nullable(),
  isPrimary: z.boolean().default(false),
});

export const setUserGamesSchema = z.object({
  games: z.array(userGameSchema).min(1, "At least one game is required"),
});

// ============ Swipe Schemas ============
export const swipeSchema = z.object({
  toUserId: z.string().uuid("Invalid user ID"),
  liked: z.boolean(),
});

// ============ Message Schemas ============
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(1000, "Message too long"),
});

// ============ Availability Schemas ============
export const availabilityWindowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
});

export const setAvailabilitySchema = z.object({
  windows: z.array(availabilityWindowSchema),
});

// ============ Report Schemas ============
export const reportSchema = z.object({
  reportedUserId: z.string().uuid("Invalid user ID"),
  reason: z.enum([
    "harassment",
    "spam",
    "inappropriate_content",
    "cheating",
    "other",
  ]),
  details: z.string().max(500, "Details too long").optional(),
});

// ============ Push Token Schema ============
export const pushTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

// ============ Available Now Schema ============
export const availableNowSchema = z.object({
  durationMinutes: z.number().int().min(15).max(480),
});

// ============ Filter Schemas ============
export const feedFiltersSchema = z.object({
  gameId: z.string().optional(),
  region: z.string().optional(),
  language: z.string().optional(),
  availableNowOnly: z.coerce.boolean().optional(),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UserGameInput = z.infer<typeof userGameSchema>;
export type SetUserGamesInput = z.infer<typeof setUserGamesSchema>;
export type SwipeInput = z.infer<typeof swipeSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type PushTokenInput = z.infer<typeof pushTokenSchema>;
export type AvailableNowInput = z.infer<typeof availableNowSchema>;
export type FeedFiltersInput = z.infer<typeof feedFiltersSchema>;
