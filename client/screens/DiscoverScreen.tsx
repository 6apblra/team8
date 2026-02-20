import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
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

export default function DiscoverScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
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
});
