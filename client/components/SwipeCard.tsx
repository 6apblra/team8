import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { GameBadge } from "@/components/GameBadge";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

interface UserGame {
  gameId: string;
  rank?: string | null;
  roles?: string[];
  playstyle?: string | null;
}

interface Profile {
  id: string;
  nickname: string;
  avatarUrl?: string | null;
  age?: number | null;
  bio?: string | null;
  region: string;
  languages?: string[];
  micEnabled?: boolean;
}

interface SwipeCardProps {
  profile: Profile;
  userGames: UserGame[];
  translateX: SharedValue<number>;
  isTopCard?: boolean;
  isOnline?: boolean;
  isAvailableNow?: boolean;
  width?: number;
  height?: number;
}

const AVATAR_PLACEHOLDERS = [
  "https://api.dicebear.com/7.x/avataaars/png?seed=gamer1",
  "https://api.dicebear.com/7.x/avataaars/png?seed=gamer2",
  "https://api.dicebear.com/7.x/avataaars/png?seed=gamer3",
];

export function SwipeCard({
  profile,
  userGames,
  translateX,
  isTopCard = false,
  isOnline = false,
  isAvailableNow = false,
  width,
  height,
}: SwipeCardProps) {
  const { theme } = useTheme();

  const rotateStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-15, 0, 15],
    );
    return {
      transform: [{ translateX: translateX.value }, { rotate: `${rotate}deg` }],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SCREEN_WIDTH / 4], [0, 1]),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SCREEN_WIDTH / 4, 0], [1, 0]),
  }));

  const avatarUrl =
    profile.avatarUrl ||
    AVATAR_PLACEHOLDERS[Math.floor(Math.random() * AVATAR_PLACEHOLDERS.length)];

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault },
        width ? { width } : undefined,
        height ? { height } : undefined,
        isTopCard ? rotateStyle : undefined,
      ]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: avatarUrl }}
          style={styles.avatar}
          contentFit="cover"
        />
        <View style={styles.imageOverlay} />
        <Animated.View style={[styles.likeLabel, likeOpacity]}>
          <ThemedText style={styles.likeLabelText}>LIKE</ThemedText>
        </Animated.View>
        <Animated.View style={[styles.nopeLabel, nopeOpacity]}>
          <ThemedText style={styles.nopeLabelText}>NOPE</ThemedText>
        </Animated.View>
        {isOnline || isAvailableNow ? (
          <View style={styles.statusContainer}>
            {isAvailableNow ? (
              <View style={[styles.statusBadge, styles.availableBadge]}>
                <Feather name="zap" size={12} color="#FFFFFF" />
                <ThemedText style={styles.statusText}>Ready to Play</ThemedText>
              </View>
            ) : null}
            {isOnline ? (
              <View style={[styles.statusBadge, styles.onlineBadge]}>
                <View style={styles.onlineDot} />
                <ThemedText style={styles.statusText}>Online</ThemedText>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <ThemedText type="h3" style={styles.nickname}>
              {profile.nickname}
            </ThemedText>
            {profile.age ? (
              <ThemedText style={styles.age}>{profile.age}</ThemedText>
            ) : null}
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Feather name="map-pin" size={14} color={theme.textSecondary} />
              <ThemedText style={styles.infoText}>{profile.region}</ThemedText>
            </View>
            {profile.micEnabled ? (
              <View style={styles.infoItem}>
                <Feather name="mic" size={14} color={theme.success} />
                <ThemedText style={[styles.infoText, { color: theme.success }]}>
                  Mic
                </ThemedText>
              </View>
            ) : null}
            {profile.languages && profile.languages.length > 0 ? (
              <View style={styles.infoItem}>
                <Feather name="globe" size={14} color={theme.textSecondary} />
                <ThemedText style={styles.infoText}>
                  {profile.languages.slice(0, 2).join(", ")}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.gamesContainer}>
          {userGames.slice(0, 3).map((game, index) => (
            <GameBadge
              key={index}
              game={game.gameId}
              rank={game.rank || undefined}
              role={game.roles?.[0]}
              size="small"
            />
          ))}
        </View>

        {profile.bio ? (
          <ThemedText style={styles.bio} numberOfLines={2}>
            {profile.bio}
          </ThemedText>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    position: "absolute",
    backgroundColor: "#111726",
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  imageContainer: {
    height: 320,
    position: "relative",
    backgroundColor: "#0F1525",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  likeLabel: {
    position: "absolute",
    top: 36,
    left: 18,
    borderWidth: 2,
    borderColor: "#00FF88",
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 6,
    transform: [{ rotate: "-12deg" }],
    backgroundColor: "rgba(0,255,136,0.1)",
  },
  likeLabelText: {
    color: "#00FF88",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 2,
  },
  nopeLabel: {
    position: "absolute",
    top: 36,
    right: 18,
    borderWidth: 2,
    borderColor: "#FF3366",
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 6,
    transform: [{ rotate: "12deg" }],
    backgroundColor: "rgba(255,51,102,0.12)",
  },
  nopeLabelText: {
    color: "#FF3366",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 2,
  },
  statusContainer: {
    position: "absolute",
    top: 14,
    right: 14,
    gap: 8,
    alignItems: "flex-end",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(26,31,46,0.75)",
  },
  onlineBadge: {
    backgroundColor: "rgba(0, 255, 136, 0.12)",
  },
  availableBadge: {
    backgroundColor: "rgba(184, 87, 255, 0.18)",
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00FF88",
  },
  statusText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  content: {
    padding: Spacing["2xl"],
    gap: Spacing.md,
  },
  header: {
    gap: Spacing.xs,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
  },
  nickname: {
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  age: {
    fontSize: 18,
    color: "#A0A8B8",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#A0A8B8",
  },
  gamesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  bio: {
    fontSize: 14,
    color: "#A0A8B8",
  },
});
