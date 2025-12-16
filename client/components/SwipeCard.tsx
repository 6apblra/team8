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
import { BorderRadius, Spacing, Colors } from "@/constants/theme";

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
}: SwipeCardProps) {
  const theme = Colors.dark;

  const rotateStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-15, 0, 15]
    );
    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate}deg` },
      ],
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

  const primaryGame = userGames.find((g) => g) || userGames[0];

  return (
    <Animated.View
      style={[styles.card, { backgroundColor: theme.backgroundDefault }, isTopCard ? rotateStyle : undefined]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: avatarUrl }}
          style={styles.avatar}
          contentFit="cover"
        />
        <Animated.View style={[styles.likeLabel, likeOpacity]}>
          <ThemedText style={styles.likeLabelText}>LIKE</ThemedText>
        </Animated.View>
        <Animated.View style={[styles.nopeLabel, nopeOpacity]}>
          <ThemedText style={styles.nopeLabelText}>NOPE</ThemedText>
        </Animated.View>
        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />
          <ThemedText style={styles.onlineText}>Online</ThemedText>
        </View>
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
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    position: "absolute",
  },
  imageContainer: {
    height: 280,
    position: "relative",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  likeLabel: {
    position: "absolute",
    top: 40,
    left: 20,
    borderWidth: 3,
    borderColor: "#00FF88",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    transform: [{ rotate: "-15deg" }],
  },
  likeLabelText: {
    color: "#00FF88",
    fontSize: 32,
    fontWeight: "800",
  },
  nopeLabel: {
    position: "absolute",
    top: 40,
    right: 20,
    borderWidth: 3,
    borderColor: "#FF3366",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    transform: [{ rotate: "15deg" }],
  },
  nopeLabelText: {
    color: "#FF3366",
    fontSize: 32,
    fontWeight: "800",
  },
  onlineIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00FF88",
  },
  onlineText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  content: {
    padding: Spacing.lg,
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
