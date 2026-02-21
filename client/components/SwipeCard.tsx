import React from "react";
import { View, StyleSheet, Dimensions, Pressable } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  translateY?: SharedValue<number>;
  isTopCard?: boolean;
  isOnline?: boolean;
  isAvailableNow?: boolean;
  superLikedMe?: boolean;
  onPressInfo?: () => void;
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
  translateY,
  isTopCard = false,
  isOnline = false,
  isAvailableNow = false,
  superLikedMe = false,
  onPressInfo,
  width,
  height,
}: SwipeCardProps) {
  const { theme } = useTheme();

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SCREEN_WIDTH / 4], [0, 1], "clamp"),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SCREEN_WIDTH / 4, 0], [1, 0], "clamp"),
  }));

  const superOpacity = useAnimatedStyle(() => {
    const ty = translateY?.value ?? 0;
    return {
      opacity: interpolate(ty, [-30, -100], [0, 1], "clamp"),
    };
  });

  const avatarUrl =
    profile.avatarUrl ||
    AVATAR_PLACEHOLDERS[Math.floor(Math.random() * AVATAR_PLACEHOLDERS.length)];

  const cardWidth = width ?? CARD_WIDTH;
  const cardHeight = height ?? 540;

  return (
    <View
      style={[
        styles.card,
        { width: cardWidth, height: cardHeight },
      ]}
    >
      {/* Full-bleed photo */}
      <Image
        source={{ uri: avatarUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />

      {/* Bottom gradient overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.85)", "rgba(0,0,0,0.97)"]}
        locations={[0.3, 0.55, 0.78, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Super Like banner — top center */}
      {superLikedMe && (
        <View style={styles.superLikedBanner}>
          <Feather name="star" size={13} color="#FFD700" />
          <ThemedText style={styles.superLikedText}>Super Liked you</ThemedText>
        </View>
      )}

      {/* Status badges — top right */}
      {(isOnline || isAvailableNow) && (
        <View style={styles.statusContainer}>
          {isAvailableNow && (
            <View style={[styles.statusBadge, styles.availableBadge]}>
              <Feather name="zap" size={11} color="#B857FF" />
              <ThemedText style={[styles.statusText, { color: "#B857FF" }]}>Ready</ThemedText>
            </View>
          )}
          {isOnline && (
            <View style={[styles.statusBadge, styles.onlineBadge]}>
              <View style={styles.onlineDot} />
              <ThemedText style={[styles.statusText, { color: "#00FF88" }]}>Online</ThemedText>
            </View>
          )}
        </View>
      )}

      {/* LIKE stamp */}
      {isTopCard && (
        <Animated.View style={[styles.likeLabel, likeOpacity]}>
          <ThemedText style={styles.likeLabelText}>LIKE</ThemedText>
        </Animated.View>
      )}

      {/* NOPE stamp */}
      {isTopCard && (
        <Animated.View style={[styles.nopeLabel, nopeOpacity]}>
          <ThemedText style={styles.nopeLabelText}>NOPE</ThemedText>
        </Animated.View>
      )}

      {/* SUPER stamp */}
      {isTopCard && (
        <Animated.View style={[styles.superLabel, superOpacity]}>
          <Feather name="star" size={18} color="#FFD700" />
          <ThemedText style={styles.superLabelText}>SUPER</ThemedText>
        </Animated.View>
      )}

      {/* Info button */}
      {onPressInfo && (
        <Pressable
          onPress={onPressInfo}
          style={styles.infoBtn}
          hitSlop={12}
        >
          <Feather name="info" size={18} color="rgba(255,255,255,0.75)" />
        </Pressable>
      )}

      {/* Info panel — overlaid at bottom */}
      <View style={styles.infoPanel}>
        {/* Name + age */}
        <View style={styles.nameRow}>
          <ThemedText style={styles.nickname}>{profile.nickname}</ThemedText>
          {profile.age ? (
            <ThemedText style={styles.age}>{profile.age}</ThemedText>
          ) : null}
        </View>

        {/* Region / mic / languages */}
        <View style={styles.tagsRow}>
          <View style={styles.tag}>
            <Feather name="map-pin" size={12} color="rgba(255,255,255,0.7)" />
            <ThemedText style={styles.tagText}>{profile.region.toUpperCase()}</ThemedText>
          </View>
          {profile.micEnabled && (
            <View style={[styles.tag, styles.tagGreen]}>
              <Feather name="mic" size={12} color="#00FF88" />
              <ThemedText style={[styles.tagText, { color: "#00FF88" }]}>Mic</ThemedText>
            </View>
          )}
          {profile.languages && profile.languages.length > 0 && (
            <View style={styles.tag}>
              <Feather name="globe" size={12} color="rgba(255,255,255,0.7)" />
              <ThemedText style={styles.tagText}>
                {profile.languages.slice(0, 2).join(" · ")}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Game badges */}
        {userGames.length > 0 && (
          <View style={styles.gamesRow}>
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
        )}

        {/* Bio */}
        {profile.bio ? (
          <ThemedText style={styles.bio} numberOfLines={2}>
            {profile.bio}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    backgroundColor: "#0F1525",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  superLikedBanner: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,215,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    zIndex: 10,
  },
  superLikedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFD700",
    letterSpacing: 0.3,
  },
  infoBtn: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  statusContainer: {
    position: "absolute",
    top: 16,
    right: 16,
    gap: 6,
    alignItems: "flex-end",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    gap: 5,
    backgroundColor: "rgba(10,14,26,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  onlineBadge: {
    borderColor: "rgba(0,255,136,0.3)",
  },
  availableBadge: {
    borderColor: "rgba(184,87,255,0.3)",
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#00FF88",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  likeLabel: {
    position: "absolute",
    top: 44,
    left: 20,
    borderWidth: 2.5,
    borderColor: "#00FF88",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 6,
    transform: [{ rotate: "-12deg" }],
    backgroundColor: "rgba(0,255,136,0.12)",
  },
  likeLabelText: {
    color: "#00FF88",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 3,
  },
  nopeLabel: {
    position: "absolute",
    top: 44,
    right: 20,
    borderWidth: 2.5,
    borderColor: "#FF3366",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 6,
    transform: [{ rotate: "12deg" }],
    backgroundColor: "rgba(255,51,102,0.12)",
  },
  nopeLabelText: {
    color: "#FF3366",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 3,
  },
  superLabel: {
    position: "absolute",
    bottom: 180,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2.5,
    borderColor: "#FFD700",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "rgba(255,215,0,0.12)",
  },
  superLabelText: {
    color: "#FFD700",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 3,
  },
  infoPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing["2xl"],
    paddingBottom: Spacing["2xl"],
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
  },
  nickname: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  age: {
    fontSize: 20,
    fontWeight: "400",
    color: "rgba(255,255,255,0.8)",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagGreen: {
    backgroundColor: "rgba(0,255,136,0.1)",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.3,
  },
  gamesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  bio: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 18,
  },
});
