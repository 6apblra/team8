import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { GameBadge } from "@/components/GameBadge";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { BorderRadius, Spacing, GameColors } from "@/constants/theme";
import { GAMES, REGIONS, LANGUAGES, DAYS_OF_WEEK } from "@/lib/game-data";
import { apiRequest } from "@/lib/api-client";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface ProfileSheetData {
  userId: string;
  nickname: string;
  avatarUrl?: string | null;
  age?: number | null;
  bio?: string | null;
  region: string;
  languages?: string[];
  micEnabled?: boolean;
  discordTag?: string | null;
  steamId?: string | null;
  riotId?: string | null;
  superLikedMe?: boolean;
  isOnline?: boolean;
  isAvailableNow?: boolean;
  userGames: {
    gameId: string;
    rank?: string | null;
    roles?: string[];
    playstyle?: string | null;
  }[];
  availability: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
}

interface ProfileBottomSheetProps {
  data: ProfileSheetData | null;
  onClose: () => void;
  onLike?: () => void;
  onSuperLike?: () => void;
}

function SectionHeader({ title, icon }: { title: string; icon: keyof typeof Feather.glyphMap }) {
  const { theme } = useTheme();
  return (
    <View style={secStyles.row}>
      <View style={[secStyles.bar, { backgroundColor: theme.primary }]} />
      <Feather name={icon} size={14} color={theme.primary} />
      <ThemedText style={[secStyles.title, { color: theme.text }]}>{title}</ThemedText>
    </View>
  );
}

const secStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  bar: { width: 3, height: 16, borderRadius: 2 },
  title: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
});

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  tagCounts: Record<string, number>;
}

interface ReviewItem {
  id: string;
  rating: number;
  tags: string[];
  comment: string | null;
  createdAt: string;
  reviewer: { userId: string; nickname: string; avatarUrl: string | null };
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather key={s} name="star" size={size} color={s <= rating ? "#FFB800" : "#444"} />
      ))}
    </View>
  );
}

export function ProfileBottomSheet({
  data,
  onClose,
  onLike,
  onSuperLike,
}: ProfileBottomSheetProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const bgOpacity = useSharedValue(0);

  const { data: reviewStats } = useQuery<ReviewStats>({
    queryKey: ["reviewStats", data?.userId],
    enabled: !!data?.userId,
    queryFn: () => apiRequest("GET", `/api/reviews/stats/${data!.userId}`),
    staleTime: 60_000,
  });

  const { data: reviewsData } = useQuery<{ reviews: ReviewItem[]; hasReviewed: boolean }>({
    queryKey: ["reviews", data?.userId],
    enabled: !!data?.userId && !!reviewStats && reviewStats.totalReviews > 0,
    queryFn: () => apiRequest("GET", `/api/reviews/${data!.userId}`),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data) {
      bgOpacity.value = withTiming(1, { duration: 280 });
      translateY.value = withSpring(0, { damping: 22, stiffness: 200 });
    } else {
      bgOpacity.value = withTiming(0, { duration: 220 });
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 260, easing: Easing.out(Easing.quad) });
    }
  }, [data]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));

  if (!data) return null;

  const regionLabel = REGIONS.find((r) => r.id === data.region)?.label ?? data.region.toUpperCase();
  const languageLabels = (data.languages ?? [])
    .map((l) => LANGUAGES.find((x) => x.id === l)?.label ?? l)
    .join(" · ");

  // Group availability by day
  const availByDay = DAYS_OF_WEEK.map((d) => ({
    label: d.label,
    windows: data.availability.filter((a) => a.dayOfWeek === d.id),
  })).filter((d) => d.windows.length > 0);

  const avatarUrl =
    data.avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/png?seed=${data.nickname}`;

  return (
    <Modal visible={!!data} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[sheetStyles.backdrop, bgStyle]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[sheetStyles.sheet, { backgroundColor: theme.backgroundDefault }, sheetStyle]}
      >
        {/* Handle */}
        <View style={[sheetStyles.handle, { backgroundColor: theme.border }]} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={sheetStyles.scrollContent}
          bounces={false}
        >
          {/* Hero section */}
          <View style={sheetStyles.heroRow}>
            <View style={sheetStyles.avatarWrap}>
              {data.superLikedMe && (
                <View style={sheetStyles.superRing} />
              )}
              <Image source={{ uri: avatarUrl }} style={sheetStyles.avatar} contentFit="cover" />
              {data.isOnline && (
                <View style={[sheetStyles.onlineDot, { borderColor: theme.backgroundDefault }]} />
              )}
            </View>

            <View style={sheetStyles.heroInfo}>
              <View style={sheetStyles.nameRow}>
                <ThemedText style={[sheetStyles.nickname, { color: theme.text }]}>
                  {data.nickname}
                </ThemedText>
                {data.age ? (
                  <ThemedText style={[sheetStyles.age, { color: theme.textSecondary }]}>
                    {data.age}
                  </ThemedText>
                ) : null}
              </View>
              {reviewStats && reviewStats.totalReviews > 0 && (
                <View style={sheetStyles.ratingRow}>
                  <StarRow rating={Math.round(reviewStats.averageRating)} size={13} />
                  <ThemedText style={[sheetStyles.ratingText, { color: "#FFB800" }]}>
                    {reviewStats.averageRating.toFixed(1)}
                  </ThemedText>
                  <ThemedText style={[sheetStyles.ratingCount, { color: theme.textSecondary }]}>
                    ({reviewStats.totalReviews})
                  </ThemedText>
                </View>
              )}

              {data.superLikedMe && (
                <View style={sheetStyles.superBadge}>
                  <Feather name="star" size={11} color="#FFD700" />
                  <ThemedText style={sheetStyles.superBadgeText}>Super Liked you</ThemedText>
                </View>
              )}

              {/* Tags */}
              <View style={sheetStyles.tagsRow}>
                <View style={[sheetStyles.tag, { backgroundColor: theme.backgroundSecondary }]}>
                  <Feather name="map-pin" size={12} color={theme.primary} />
                  <ThemedText style={[sheetStyles.tagText, { color: theme.textSecondary }]}>
                    {regionLabel}
                  </ThemedText>
                </View>
                {data.micEnabled && (
                  <View style={[sheetStyles.tag, { backgroundColor: `${theme.success}15` }]}>
                    <Feather name="mic" size={12} color={theme.success} />
                    <ThemedText style={[sheetStyles.tagText, { color: theme.success }]}>Mic</ThemedText>
                  </View>
                )}
                {data.isAvailableNow && (
                  <View style={[sheetStyles.tag, { backgroundColor: `${theme.secondary}15` }]}>
                    <Feather name="zap" size={12} color={theme.secondary} />
                    <ThemedText style={[sheetStyles.tagText, { color: theme.secondary }]}>Ready</ThemedText>
                  </View>
                )}
              </View>

              {languageLabels ? (
                <View style={[sheetStyles.tag, { backgroundColor: theme.backgroundSecondary, alignSelf: "flex-start" }]}>
                  <Feather name="globe" size={12} color={theme.textSecondary} />
                  <ThemedText style={[sheetStyles.tagText, { color: theme.textSecondary }]}>
                    {languageLabels}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>

          {/* Bio */}
          {data.bio ? (
            <View style={[sheetStyles.section, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
              <ThemedText style={[sheetStyles.bioText, { color: theme.textSecondary }]}>
                {data.bio}
              </ThemedText>
            </View>
          ) : null}

          {/* Games */}
          {data.userGames.length > 0 && (
            <View style={sheetStyles.sectionBlock}>
              <SectionHeader title="Games" icon="grid" />
              <View style={sheetStyles.gamesList}>
                {data.userGames.map((g, i) => {
                  const gameInfo = GAMES.find((x) => x.id === g.gameId);
                  const color = GameColors[g.gameId] ?? "#00D9FF";
                  return (
                    <View
                      key={i}
                      style={[sheetStyles.gameRow, { backgroundColor: theme.backgroundSecondary, borderLeftColor: color, borderColor: theme.border }]}
                    >
                      <View style={sheetStyles.gameLeft}>
                        <GameBadge game={g.gameId} size="small" />
                        <ThemedText style={[sheetStyles.gameName, { color: theme.text }]}>
                          {gameInfo?.name ?? g.gameId}
                        </ThemedText>
                      </View>
                      <View style={sheetStyles.gameMeta}>
                        {g.rank && (
                          <View style={[sheetStyles.metaChip, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
                            <ThemedText style={[sheetStyles.metaChipText, { color }]}>{g.rank}</ThemedText>
                          </View>
                        )}
                        {g.roles && g.roles.length > 0 && g.roles.map((r, ri) => (
                          <View key={ri} style={[sheetStyles.metaChip, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}>
                            <ThemedText style={[sheetStyles.metaChipText, { color: theme.textSecondary }]}>{r}</ThemedText>
                          </View>
                        ))}
                        {g.playstyle && (
                          <View style={[sheetStyles.metaChip, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}>
                            <ThemedText style={[sheetStyles.metaChipText, { color: theme.textSecondary }]}>{g.playstyle}</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Availability */}
          {availByDay.length > 0 && (
            <View style={sheetStyles.sectionBlock}>
              <SectionHeader title="Availability" icon="clock" />
              <View style={sheetStyles.availRow}>
                {availByDay.map((d) => (
                  <View key={d.label} style={[sheetStyles.dayChip, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <ThemedText style={[sheetStyles.dayLabel, { color: theme.primary }]}>{d.label}</ThemedText>
                    {d.windows.map((w, wi) => (
                      <ThemedText key={wi} style={[sheetStyles.dayTime, { color: theme.textSecondary }]}>
                        {w.startTime}–{w.endTime}
                      </ThemedText>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Social IDs */}
          {(data.discordTag || data.steamId || data.riotId) && (
            <View style={sheetStyles.sectionBlock}>
              <SectionHeader title="Social" icon="link" />
              <View style={sheetStyles.socialList}>
                {data.discordTag && (
                  <View style={[sheetStyles.socialRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <View style={[sheetStyles.socialIcon, { backgroundColor: "rgba(88,101,242,0.15)" }]}>
                      <Feather name="message-square" size={14} color="#5865F2" />
                    </View>
                    <ThemedText style={[sheetStyles.socialText, { color: theme.text }]}>{data.discordTag}</ThemedText>
                  </View>
                )}
                {data.steamId && (
                  <View style={[sheetStyles.socialRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <View style={[sheetStyles.socialIcon, { backgroundColor: "rgba(102,192,244,0.15)" }]}>
                      <Feather name="monitor" size={14} color="#66C0F4" />
                    </View>
                    <ThemedText style={[sheetStyles.socialText, { color: theme.text }]}>{data.steamId}</ThemedText>
                  </View>
                )}
                {data.riotId && (
                  <View style={[sheetStyles.socialRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <View style={[sheetStyles.socialIcon, { backgroundColor: "rgba(215,0,0,0.15)" }]}>
                      <Feather name="crosshair" size={14} color="#D70000" />
                    </View>
                    <ThemedText style={[sheetStyles.socialText, { color: theme.text }]}>{data.riotId}</ThemedText>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Reviews */}
          {reviewStats && reviewStats.totalReviews > 0 && (
            <View style={sheetStyles.sectionBlock}>
              <SectionHeader title={t("reviews.title")} icon="star" />

              {/* Summary bar */}
              <View style={[sheetStyles.reviewSummary, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <View style={sheetStyles.reviewSummaryLeft}>
                  <ThemedText style={[sheetStyles.reviewBigRating, { color: theme.text }]}>
                    {reviewStats.averageRating.toFixed(1)}
                  </ThemedText>
                  <StarRow rating={Math.round(reviewStats.averageRating)} size={16} />
                  <ThemedText style={[sheetStyles.reviewSummaryCount, { color: theme.textSecondary }]}>
                    {reviewStats.totalReviews} {t("reviews.title").toLowerCase()}
                  </ThemedText>
                </View>
                {/* Top tags */}
                {Object.keys(reviewStats.tagCounts).length > 0 && (
                  <View style={sheetStyles.reviewTopTags}>
                    {Object.entries(reviewStats.tagCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 4)
                      .map(([tag, count]) => (
                        <View key={tag} style={[sheetStyles.reviewTagChip, { backgroundColor: `${theme.success}18`, borderColor: `${theme.success}40` }]}>
                          <Feather name="check" size={10} color={theme.success} />
                          <ThemedText style={[sheetStyles.reviewTagText, { color: theme.success }]}>
                            {t(`reviews.tags_${tag}`)} · {count}
                          </ThemedText>
                        </View>
                      ))}
                  </View>
                )}
              </View>

              {/* Individual reviews */}
              {reviewsData?.reviews.slice(0, 3).map((rev) => (
                <View key={rev.id} style={[sheetStyles.reviewCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <View style={sheetStyles.reviewCardHeader}>
                    <ThemedText style={[sheetStyles.reviewerName, { color: theme.text }]}>
                      {rev.reviewer.nickname}
                    </ThemedText>
                    <StarRow rating={rev.rating} size={12} />
                  </View>
                  {rev.tags.length > 0 && (
                    <View style={sheetStyles.reviewCardTags}>
                      {rev.tags.map((tag) => (
                        <View key={tag} style={[sheetStyles.reviewTagChipSm, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}>
                          <ThemedText style={[sheetStyles.reviewTagTextSm, { color: theme.textSecondary }]}>
                            {t(`reviews.tags_${tag}`)}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                  {rev.comment ? (
                    <ThemedText style={[sheetStyles.reviewComment, { color: theme.textSecondary }]}>
                      {rev.comment}
                    </ThemedText>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* Bottom spacing for action buttons */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Action buttons */}
        <View style={[sheetStyles.actions, { backgroundColor: theme.backgroundDefault, borderTopColor: theme.border }]}>
          <Pressable
            onPress={onClose}
            style={[sheetStyles.actionBtn, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
          >
            <Feather name="x" size={20} color={theme.textSecondary} />
          </Pressable>

          {onSuperLike && (
            <Pressable
              onPress={() => { onSuperLike(); onClose(); }}
              style={[sheetStyles.actionBtn, { backgroundColor: "rgba(255,215,0,0.1)", borderColor: "rgba(255,215,0,0.4)" }]}
            >
              <Feather name="star" size={20} color="#FFD700" />
            </Pressable>
          )}

          {onLike && (
            <LinearGradient
              colors={[theme.primary, theme.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={sheetStyles.likeGradient}
            >
              <Pressable
                onPress={() => { onLike(); onClose(); }}
                style={sheetStyles.likeInner}
              >
                <Feather name="heart" size={20} color="#fff" />
                <ThemedText style={sheetStyles.likeText}>Like</ThemedText>
              </Pressable>
            </LinearGradient>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.88,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
  },
  heroRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: "flex-start",
  },
  avatarWrap: {
    position: "relative",
  },
  superRing: {
    position: "absolute",
    inset: -3,
    borderRadius: 52,
    borderWidth: 2.5,
    borderColor: "#FFD700",
    zIndex: 1,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#00FF88",
    borderWidth: 2,
  },
  heroInfo: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  nickname: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  age: {
    fontSize: 18,
    fontWeight: "400",
  },
  superBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,215,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.4)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  superBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFD700",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionBlock: {
    marginBottom: Spacing.xl,
  },
  gamesList: {
    gap: Spacing.sm,
  },
  gameRow: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: Spacing.md,
    gap: 8,
  },
  gameLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gameName: {
    fontSize: 14,
    fontWeight: "600",
  },
  gameMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  availRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  dayChip: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    minWidth: 62,
    alignItems: "center",
    gap: 3,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  dayTime: {
    fontSize: 10,
    fontWeight: "500",
  },
  socialList: {
    gap: Spacing.sm,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  socialIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  socialText: {
    fontSize: 14,
    fontWeight: "500",
  },
  actions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.xl,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  actionBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  likeGradient: {
    flex: 1,
    borderRadius: 26,
    overflow: "hidden",
  },
  likeInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  likeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Rating inline
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
  },
  ratingCount: {
    fontSize: 12,
  },

  // Reviews section
  reviewSummary: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  reviewSummaryLeft: {
    alignItems: "center",
    gap: 4,
    minWidth: 56,
  },
  reviewBigRating: {
    fontSize: 28,
    fontWeight: "800",
  },
  reviewSummaryCount: {
    fontSize: 11,
    textAlign: "center",
  },
  reviewTopTags: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignContent: "flex-start",
  },
  reviewTagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  reviewTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  reviewCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 6,
  },
  reviewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: "700",
  },
  reviewCardTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  reviewTagChipSm: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  reviewTagTextSm: {
    fontSize: 10,
    fontWeight: "500",
  },
  reviewComment: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: "italic",
  },
});
