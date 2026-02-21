import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SwipeCard } from "@/components/SwipeCard";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius } from "@/constants/theme";
import { FILTERS_KEY, SavedFilters } from "@/screens/FiltersScreen";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CARD_MAX_WIDTH = 460;
const CARD_HEIGHT = 560;
const CARD_WIDTH = Math.min(SCREEN_WIDTH - Spacing.lg * 2, CARD_MAX_WIDTH);

interface FeedCandidate {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string | null;
  age?: number | null;
  bio?: string | null;
  region: string;
  languages?: string[];
  micEnabled?: boolean;
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
  isOnline?: boolean;
  isAvailableNow?: boolean;
}

function GlowButton({
  icon,
  color,
  size = "large",
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  size?: "medium" | "large";
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const btnSize = size === "large" ? 68 : 56;
  const iconSize = size === "large" ? 30 : 24;

  return (
    <Animated.View style={animatedStyle}>
      <Animated.View
        style={[
          styles.glowButton,
          {
            width: btnSize,
            height: btnSize,
            borderRadius: btnSize / 2,
            borderColor: color,
            shadowColor: color,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glowButtonInner,
            {
              width: btnSize,
              height: btnSize,
              borderRadius: btnSize / 2,
              backgroundColor: `${color}18`,
            },
          ]}
        >
          <Feather
            name={icon}
            size={iconSize}
            color={color}
            onPress={() => {
              scale.value = withSpring(0.88, { damping: 12, stiffness: 220 });
              setTimeout(() => {
                scale.value = withSpring(1, { damping: 12, stiffness: 220 });
              }, 100);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onPress();
            }}
          />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Undo Button ─────────────────────────────────────────────────────────────

function UndoButton({
  canUndo,
  isPremium,
  onPress,
  theme,
}: {
  canUndo: boolean;
  isPremium: boolean;
  onPress: () => void;
  theme: any;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[animStyle, undoStyles.wrap]}>
      <Animated.View
        style={[
          undoStyles.btn,
          {
            borderColor: canUndo ? theme.warning : `${theme.border}80`,
            shadowColor: canUndo ? theme.warning : "transparent",
            backgroundColor: canUndo ? `${theme.warning}14` : "transparent",
          },
        ]}
      >
        <Feather
          name="rotate-ccw"
          size={20}
          color={canUndo ? theme.warning : `${theme.textSecondary}55`}
          onPress={
            canUndo
              ? () => {
                  scale.value = withSpring(0.85, { damping: 12 });
                  setTimeout(() => { scale.value = withSpring(1, { damping: 12 }); }, 120);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onPress();
                }
              : undefined
          }
        />
      </Animated.View>
      {isPremium && (
        <View style={[undoStyles.badge, { backgroundColor: theme.warning }]}>
          <Feather name="zap" size={8} color="#000" />
        </View>
      )}
    </Animated.View>
  );
}

const undoStyles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: Spacing.xl,
    bottom: 0,
    alignItems: "center",
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Playing Now Widget ───────────────────────────────────────────────────────

const DURATIONS = [
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "4h", minutes: 240 },
];

function PlayingNowWidget({ theme, t }: { theme: any; t: any }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState("");

  const isActive = !!(
    profile?.isAvailableNow &&
    profile?.availableUntil &&
    new Date(profile.availableUntil) > new Date()
  );

  // countdown timer
  useEffect(() => {
    if (!isActive || !profile?.availableUntil) {
      setCountdown("");
      return;
    }
    const update = () => {
      const diff = new Date(profile.availableUntil!).getTime() - Date.now();
      if (diff <= 0) { setCountdown(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [isActive, profile?.availableUntil]);

  // glow pulse when active
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);
  useEffect(() => {
    if (isActive) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.65, { duration: 900 }),
          withTiming(0.15, { duration: 900 }),
        ), -1, true,
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 900 }),
          withTiming(1, { duration: 900 }),
        ), -1, true,
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
      glowScale.value = withTiming(1, { duration: 300 });
    }
  }, [isActive]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const activateMutation = useMutation({
    mutationFn: (minutes: number) =>
      apiRequest("POST", "/api/available-now", { durationMinutes: minutes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setShowModal(false);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/available-now"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setShowModal(false);
    },
  });

  const isLoading = activateMutation.isPending || deactivateMutation.isPending;

  return (
    <>
      <Pressable onPress={() => setShowModal(true)} style={styles.nowPill}>
        {/* glow dot */}
        <View style={styles.nowDotWrap}>
          {isActive && (
            <Animated.View
              style={[
                styles.nowGlow,
                { backgroundColor: theme.success },
                glowStyle,
              ]}
            />
          )}
          <View
            style={[
              styles.nowDot,
              { backgroundColor: isActive ? theme.success : theme.textSecondary },
            ]}
          />
        </View>
        <ThemedText
          style={[
            styles.nowText,
            { color: isActive ? theme.success : theme.textSecondary },
          ]}
        >
          {isActive ? (countdown || "Active") : t("discover.playingNow") }
        </ThemedText>
      </Pressable>

      <Modal visible={showModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />

            <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
              {isActive ? t("discover.playingNowActive") : t("discover.setPlayingNow")}
            </ThemedText>
            <ThemedText style={[styles.modalSub, { color: theme.textSecondary }]}>
              {isActive
                ? (countdown ? `${t("discover.timeLeft")}: ${countdown}` : "")
                : t("discover.playingNowSubtitle")}
            </ThemedText>

            {isActive ? (
              <Pressable
                onPress={() => deactivateMutation.mutate()}
                disabled={isLoading}
                style={[styles.deactivateBtn, { borderColor: theme.danger }]}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.danger} size="small" />
                ) : (
                  <ThemedText style={{ color: theme.danger, fontWeight: "700", fontSize: 15 }}>
                    {t("discover.turnOff")}
                  </ThemedText>
                )}
              </Pressable>
            ) : (
              <View style={styles.durationGrid}>
                {DURATIONS.map((d) => (
                  <Pressable
                    key={d.minutes}
                    onPress={() => activateMutation.mutate(d.minutes)}
                    disabled={isLoading}
                    style={[
                      styles.durationBtn,
                      { backgroundColor: `${theme.success}18`, borderColor: theme.success },
                    ]}
                  >
                    {activateMutation.isPending ? (
                      <ActivityIndicator color={theme.success} size="small" />
                    ) : (
                      <>
                        <Feather name="zap" size={18} color={theme.success} />
                        <ThemedText style={{ color: theme.success, fontWeight: "700", fontSize: 16 }}>
                          {d.label}
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function DiscoverScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [undoUsed, setUndoUsed] = useState(false); // free users: 1 undo per session
  const [filters, setFilters] = useState<SavedFilters | null>(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const nextCardTranslateX = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      const loadFilters = async () => {
        try {
          const stored = await AsyncStorage.getItem(FILTERS_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as SavedFilters;
            setFilters(parsed);
          } else {
            setFilters(null);
          }
        } catch (error) {
          console.error("Failed to load filters:", error);
        }
      };
      loadFilters();
    }, []),
  );

  const buildFeedQueryKey = useCallback(() => {
    let path = "/api/feed";
    const params = new URLSearchParams();
    if (filters?.games?.length) {
      filters.games.forEach((g) => params.append("gameId", g));
    }
    if (filters?.regions?.length) {
      filters.regions.forEach((r) => params.append("region", r));
    }
    if (filters?.languages?.length) {
      filters.languages.forEach((l) => params.append("language", l));
    }
    if (filters?.availableNowOnly) {
      params.set("availableNowOnly", "true");
    }
    if (filters?.micRequired) {
      params.set("micRequired", "true");
    }
    if (filters?.playstyles?.length) {
      filters.playstyles.forEach((p) => params.append("playstyle", p));
    }
    const qs = params.toString();
    if (qs) {
      path += `?${qs}`;
    }
    return [path];
  }, [filters]);

  const {
    data: candidates = [],
    isLoading,
    refetch,
  } = useQuery<FeedCandidate[]>({
    queryKey: buildFeedQueryKey(),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (user?.id) {
      setCurrentIndex(0);
      refetch();
    }
  }, [filters, user?.id, refetch]);

  const { data: swipeStatus } = useQuery<{
    dailyCount: number;
    limit: number;
    remaining: number;
    superLikeCount: number;
    superLikeLimit: number;
    superLikesRemaining: number;
  }>({
    queryKey: ["/api/swipe-status", user?.id],
    enabled: !!user?.id,
  });

  const swipeMutation = useMutation<
    { match?: boolean },
    Error,
    { toUserId: string; swipeType: string }
  >({
    mutationFn: async ({
      toUserId,
      swipeType,
    }: {
      toUserId: string;
      swipeType: string;
    }) => {
      return apiRequest<{ match?: boolean }>("POST", "/api/swipe", {
        toUserId,
        swipeType,
      });
    },
    onSuccess: (data) => {
      if (data.match) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/swipe-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
    onError: (error) => {
      if (error.message.includes("429")) {
        Alert.alert(
          t("discover.dailyLimitTitle"),
          t("discover.dailyLimitMessage"),
        );
      }
    },
  });

  const undoMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/swipe/last"),
    onSuccess: () => {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
      if (!user?.isPremium) setUndoUsed(true);
      queryClient.invalidateQueries({ queryKey: ["/api/swipe-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onError: () => {
      Alert.alert(t("discover.undoErrorTitle"), t("discover.undoErrorMessage"));
    },
  });

  const canUndo =
    currentIndex > 0 &&
    !undoMutation.isPending &&
    (user?.isPremium || !undoUsed);

  const currentCandidate = candidates[currentIndex];
  const nextCandidate = candidates[currentIndex + 1];

  const handleSwipe = useCallback(
    (direction: "left" | "right" | "up") => {
      if (!currentCandidate) return;

      const swipeType =
        direction === "left" ? "skip" : direction === "up" ? "super" : "like";

      if (swipeType === "super" && (swipeStatus?.superLikesRemaining ?? 1) <= 0) {
        Alert.alert(
          t("discover.superLikeLimitTitle"),
          t("discover.superLikeLimitMessage"),
        );
        return;
      }

      Haptics.impactAsync(
        direction === "up"
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Medium,
      );

      swipeMutation.mutate({
        toUserId: currentCandidate.userId,
        swipeType,
      });

      setCurrentIndex((prev) => prev + 1);
    },
    [currentCandidate, swipeMutation, swipeStatus],
  );

  const resetPosition = () => {
    translateX.value = withSpring(0, { damping: 20 });
    translateY.value = withSpring(0, { damping: 20 });
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const exitTiming = { duration: 200, easing: Easing.out(Easing.quad) };

      if (event.translationY < -100 && Math.abs(event.translationX) < 50) {
        translateX.value = withTiming(0, exitTiming);
        translateY.value = withTiming(-500, exitTiming, (finished) => {
          if (finished) {
            translateX.value = 0;
            translateY.value = 0;
            runOnJS(handleSwipe)("up");
          }
        });
      } else if (event.translationX > SWIPE_THRESHOLD) {
        translateY.value = withTiming(0, exitTiming);
        translateX.value = withTiming(
          SCREEN_WIDTH * 1.5,
          exitTiming,
          (finished) => {
            if (finished) {
              translateX.value = 0;
              translateY.value = 0;
              runOnJS(handleSwipe)("right");
            }
          },
        );
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateY.value = withTiming(0, exitTiming);
        translateX.value = withTiming(
          -SCREEN_WIDTH * 1.5,
          exitTiming,
          (finished) => {
            if (finished) {
              translateX.value = 0;
              translateY.value = 0;
              runOnJS(handleSwipe)("left");
            }
          },
        );
      } else {
        runOnJS(resetPosition)();
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-15, 0, 15])}deg`,
      },
    ],
  }));

  const nextCardScale = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(translateX.value) + Math.abs(translateY.value),
      [0, 120],
      [0.94, 1],
      "clamp",
    );
    const opacity = interpolate(
      Math.abs(translateX.value) + Math.abs(translateY.value),
      [0, 120],
      [0.5, 1],
      "clamp",
    );
    return { transform: [{ scale }], opacity };
  });

  const handleButtonSwipe = (direction: "left" | "right" | "up") => {
    if (!currentCandidate) return;

    const targetX =
      direction === "left"
        ? -SCREEN_WIDTH * 1.5
        : direction === "right"
          ? SCREEN_WIDTH * 1.5
          : 0;
    const targetY = direction === "up" ? -500 : 0;
    const exitTiming = { duration: 200, easing: Easing.out(Easing.quad) };

    const onComplete = (finished?: boolean) => {
      "worklet";
      if (finished) {
        translateX.value = 0;
        translateY.value = 0;
        runOnJS(handleSwipe)(direction);
      }
    };

    if (direction === "up") {
      translateX.value = withTiming(0, exitTiming);
      translateY.value = withTiming(targetY, exitTiming, onComplete);
    } else {
      translateY.value = withTiming(0, exitTiming);
      translateX.value = withTiming(targetX, exitTiming, onComplete);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
          {t("discover.findingTeammates")}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!currentCandidate) {
    return (
      <ThemedView
        style={[styles.container, styles.centered, { paddingTop: headerHeight }]}
      >
        <View style={[styles.emptyIconWrap, { borderColor: theme.border }]}>
          <Feather name="users" size={52} color={theme.textSecondary} />
        </View>
        <ThemedText type="h3" style={[styles.emptyTitle, { color: theme.text }]}>
          {t("discover.noMoreProfiles")}
        </ThemedText>
        <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          {t("discover.checkBackLater")}
        </ThemedText>
        <GlowButton
          icon="refresh-cw"
          color={theme.primary}
          size="large"
          onPress={() => {
            setCurrentIndex(0);
            refetch();
          }}
        />
      </ThemedView>
    );
  }

  const superRemaining = swipeStatus?.superLikesRemaining ?? 1;
  const swipeRemaining = swipeStatus?.remaining ?? "...";

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: headerHeight + Spacing.sm }]}>

        {/* Counters row */}
        <View style={styles.countersRow}>
          <View style={[styles.counterPill, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <Feather name="heart" size={13} color={theme.primary} />
            <ThemedText style={[styles.counterText, { color: theme.text }]}>
              {String(swipeRemaining)}
            </ThemedText>
          </View>
          <View style={[
            styles.counterPill,
            {
              backgroundColor: superRemaining > 0
                ? "rgba(255,215,0,0.1)"
                : theme.backgroundSecondary,
              borderColor: superRemaining > 0 ? "rgba(255,215,0,0.35)" : theme.border,
            },
          ]}>
            <Feather name="star" size={13} color={superRemaining > 0 ? "#FFD700" : theme.textSecondary} />
            <ThemedText style={[
              styles.counterText,
              { color: superRemaining > 0 ? "#FFD700" : theme.textSecondary },
            ]}>
              {String(superRemaining)}
            </ThemedText>
          </View>
          <PlayingNowWidget theme={theme} t={t} />
        </View>

        {/* Card stack */}
        <View style={styles.cardContainer}>
          <View style={styles.cardStack}>
            {nextCandidate ? (
              <Animated.View style={[styles.nextCard, nextCardScale]}>
                <SwipeCard
                  width={CARD_WIDTH}
                  height={CARD_HEIGHT}
                  profile={{
                    id: nextCandidate.id,
                    nickname: nextCandidate.nickname,
                    avatarUrl: nextCandidate.avatarUrl,
                    age: nextCandidate.age,
                    bio: nextCandidate.bio,
                    region: nextCandidate.region,
                    languages: nextCandidate.languages,
                    micEnabled: nextCandidate.micEnabled,
                  }}
                  userGames={nextCandidate.userGames}
                  translateX={nextCardTranslateX}
                  isTopCard={false}
                  isOnline={nextCandidate.isOnline}
                  isAvailableNow={nextCandidate.isAvailableNow}
                />
              </Animated.View>
            ) : null}

            <GestureDetector gesture={panGesture}>
              <Animated.View style={[styles.currentCard, cardStyle]}>
                <SwipeCard
                  width={CARD_WIDTH}
                  height={CARD_HEIGHT}
                  profile={{
                    id: currentCandidate.id,
                    nickname: currentCandidate.nickname,
                    avatarUrl: currentCandidate.avatarUrl,
                    age: currentCandidate.age,
                    bio: currentCandidate.bio,
                    region: currentCandidate.region,
                    languages: currentCandidate.languages,
                    micEnabled: currentCandidate.micEnabled,
                  }}
                  userGames={currentCandidate.userGames}
                  translateX={translateX}
                  translateY={translateY}
                  isTopCard={true}
                  isOnline={currentCandidate.isOnline}
                  isAvailableNow={currentCandidate.isAvailableNow}
                />
              </Animated.View>
            </GestureDetector>
          </View>
        </View>

        {/* Action buttons */}
        <View style={[styles.actions, { paddingBottom: tabBarHeight + Spacing.md }]}>
          <GlowButton
            icon="x"
            color="#FF3366"
            size="large"
            onPress={() => handleButtonSwipe("left")}
          />
          <GlowButton
            icon="star"
            color="#FFD700"
            size="medium"
            onPress={() => handleButtonSwipe("up")}
          />
          <GlowButton
            icon="heart"
            color="#00FF88"
            size="large"
            onPress={() => handleButtonSwipe("right")}
          />
          <UndoButton
            canUndo={canUndo}
            isPremium={!!user?.isPremium}
            onPress={() => undoMutation.mutate()}
            theme={theme}
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
  },
  emptyIconWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    marginTop: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 15,
    marginBottom: Spacing.lg,
    textAlign: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  content: {
    flex: 1,
  },
  countersRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  counterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  counterText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  cardStack: {
    width: "100%",
    maxWidth: CARD_MAX_WIDTH + Spacing.md,
    height: CARD_HEIGHT + 20,
    alignItems: "center",
    justifyContent: "center",
  },
  nextCard: {
    position: "absolute",
  },
  currentCard: {
    position: "absolute",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing["2xl"],
    paddingTop: Spacing.xl,
  },
  glowButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  glowButtonInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  // PlayingNow
  nowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  nowDotWrap: {
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  nowGlow: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nowDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  nowText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing["3xl"],
    gap: Spacing.lg,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  modalSub: {
    fontSize: 14,
    textAlign: "center",
    marginTop: -Spacing.sm,
  },
  durationGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  durationBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  deactivateBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    marginTop: Spacing.sm,
  },
});
