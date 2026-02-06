import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface MatchCardProps {
  nickname: string;
  avatarUrl?: string | null;
  lastMessage?: string;
  timestamp?: Date | null;
  unreadCount?: number;
  gameIcon?: string;
  onPress: () => void;
}

const AVATAR_PLACEHOLDERS = [
  "https://api.dicebear.com/7.x/avataaars/png?seed=match1",
  "https://api.dicebear.com/7.x/avataaars/png?seed=match2",
];

export function MatchCard({
  nickname,
  avatarUrl,
  lastMessage,
  timestamp,
  unreadCount = 0,
  gameIcon,
  onPress,
}: MatchCardProps) {
  const { theme } = useTheme();

  const formatTime = (date: Date | null | undefined) => {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return "now";
  };

  const avatar =
    avatarUrl ||
    AVATAR_PLACEHOLDERS[Math.floor(Math.random() * AVATAR_PLACEHOLDERS.length)];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: avatar }}
          style={styles.avatar}
          contentFit="cover"
        />
        <View style={[styles.onlineDot, { backgroundColor: theme.success }]} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText style={styles.nickname}>{nickname}</ThemedText>
          {timestamp ? (
            <ThemedText style={styles.time}>{formatTime(timestamp)}</ThemedText>
          ) : null}
        </View>
        {lastMessage ? (
          <ThemedText style={styles.message} numberOfLines={1}>
            {lastMessage}
          </ThemedText>
        ) : (
          <ThemedText style={[styles.message, { color: theme.primary }]}>
            New match! Say hello
          </ThemedText>
        )}
      </View>

      {unreadCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.badgeText}>{unreadCount}</ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#1A1F2E",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nickname: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  time: {
    fontSize: 12,
    color: "#A0A8B8",
  },
  message: {
    fontSize: 14,
    color: "#A0A8B8",
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
