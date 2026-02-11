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
import { ActionButton } from "@/components/ActionButton";
import { SwipeCard } from "@/components/SwipeCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { FILTERS_KEY, SavedFilters } from "@/screens/FiltersScreen";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CARD_MAX_WIDTH = 460;
const CARD_HEIGHT = 540;
const CARD_WIDTH = Math.min(SCREEN_WIDTH - Spacing["4xl"] * 2, CARD_MAX_WIDTH);

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

export default function DiscoverScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();
  const { theme } = useTheme();
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
          "Daily Limit Reached",
          "You've reached your daily swipe limit. Try again tomorrow!",
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
    [currentCandidate, swipeMutation],
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
      if (event.translationY < -100 && Math.abs(event.translationX) < 50) {
        translateY.value = withSpring(-500, { damping: 20 });
        runOnJS(handleSwipe)("up");
      } else if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { damping: 20 });
        runOnJS(handleSwipe)("right");
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { damping: 20 });
        runOnJS(handleSwipe)("left");
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

  const handleButtonSwipe = (direction: "left" | "right" | "up") => {
    if (!currentCandidate) return;

    const targetX =
      direction === "left"
        ? -SCREEN_WIDTH * 1.5
        : direction === "right"
          ? SCREEN_WIDTH * 1.5
          : 0;
    const targetY = direction === "up" ? -500 : 0;

    translateX.value = withSpring(targetX, { damping: 20 });
    translateY.value = withSpring(targetY, { damping: 20 });

    setTimeout(() => {
      handleSwipe(direction);
      translateX.value = 0;
      translateY.value = 0;
    }, 200);
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={styles.loadingText}>Finding teammates...</ThemedText>
      </ThemedView>
    );
  }

  if (!currentCandidate) {
    return (
      <ThemedView
        style={[
          styles.container,
          styles.centered,
          { paddingTop: headerHeight },
        ]}
      >
        <Feather name="users" size={80} color={theme.textSecondary} />
        <ThemedText type="h3" style={styles.emptyTitle}>
          No More Profiles
        </ThemedText>
        <ThemedText style={styles.emptySubtitle}>
          Check back later for new teammates
        </ThemedText>
        <ActionButton
          icon="refresh-cw"
          color={theme.primary}
          onPress={() => {
            setCurrentIndex(0);
            refetch();
          }}
          size="large"
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: headerHeight + Spacing.md }]}>
        <View style={styles.swipeCounter}>
          <Feather name="heart" size={16} color={theme.primary} />
          <ThemedText style={styles.swipeCounterText}>
            {swipeStatus?.remaining ?? "..."} swipes left today
          </ThemedText>
        </View>

        <View style={styles.cardContainer}>
          <View style={styles.cardStack}>
            {nextCandidate ? (
              <View style={styles.nextCard}>
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
              </View>
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
                  isTopCard={true}
                  isOnline={currentCandidate.isOnline}
                  isAvailableNow={currentCandidate.isAvailableNow}
                />
              </Animated.View>
            </GestureDetector>
          </View>
        </View>

        <View
          style={[styles.actions, { paddingBottom: tabBarHeight + Spacing.md }]}
        >
          <ActionButton
            icon="x"
            color={theme.danger}
            onPress={() => handleButtonSwipe("left")}
            size="large"
          />
          <ActionButton
            icon="arrow-up"
            color={theme.secondary}
            onPress={() => handleButtonSwipe("up")}
            size="medium"
          />
          <ActionButton
            icon="heart"
            color={theme.success}
            onPress={() => handleButtonSwipe("right")}
            size="large"
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
    color: "#A0A8B8",
    marginTop: Spacing.md,
  },
  emptyTitle: {
    color: "#FFFFFF",
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    color: "#A0A8B8",
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  content: {
    flex: 1,
  },
  swipeCounter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  swipeCounterText: {
    color: "#A0A8B8",
    fontSize: 14,
  },
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["4xl"],
    paddingTop: Spacing.lg,
  },
  cardStack: {
    width: "100%",
    maxWidth: CARD_MAX_WIDTH + Spacing.md,
    height: CARD_HEIGHT + 40,
    alignItems: "center",
    justifyContent: "center",
  },
  nextCard: {
    position: "absolute",
    transform: [{ scale: 0.94 }],
    opacity: 0.55,
  },
  currentCard: {
    position: "absolute",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xl,
    paddingTop: Spacing["3xl"],
  },
});
