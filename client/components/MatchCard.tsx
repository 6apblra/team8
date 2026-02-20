import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface MatchCardProps {
  nickname: string;
  avatarUrl?: string | null;
  lastMessage?: string;
  timestamp?: Date | null;
  unreadCount?: number;
  onPress: () => void;
}

const AVATAR_PLACEHOLDERS = [
  "https://api.dicebear.com/7.x/avataaars/png?seed=match1",
  "https://api.dicebear.com/7.x/avataaars/png?seed=match2",
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MatchCard({
  nickname,
  avatarUrl,
  lastMessage,
  timestamp,
  unreadCount = 0,
  onPress,
}: MatchCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const formatTime = (date: Date | null | undefined) => {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 6) return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (mins > 0) return `${mins}m`;
    return "now";
  };

  const avatar =
    avatarUrl ||
    AVATAR_PLACEHOLDERS[Math.floor(Math.random() * AVATAR_PLACEHOLDERS.length)];

  const isNew = !lastMessage;
  const hasUnread = unreadCount > 0;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 250 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 250 }); }}
      style={[
        animatedStyle,
        styles.container,
        {
          backgroundColor: hasUnread
            ? `${theme.primary}0D`
            : theme.backgroundDefault,
          borderColor: hasUnread
            ? `${theme.primary}30`
            : theme.border,
        },
      ]}
    >
      {/* Avatar with ring */}
      <View style={styles.avatarWrap}>
        {hasUnread || isNew ? (
          <View style={[
            styles.avatarRing,
            {
              borderColor: isNew ? theme.secondary : theme.primary,
              shadowColor: isNew ? theme.secondary : theme.primary,
            },
          ]}>
            <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
          </View>
        ) : (
          <Image source={{ uri: avatar }} style={[styles.avatar, styles.avatarNoRing]} contentFit="cover" />
        )}
      </View>

      {/* Text content */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText
            style={[
              styles.nickname,
              { color: theme.text, fontWeight: hasUnread ? "700" : "600" },
            ]}
            numberOfLines={1}
          >
            {nickname}
          </ThemedText>
          {timestamp && (
            <ThemedText style={[styles.time, { color: theme.textSecondary }]}>
              {formatTime(timestamp)}
            </ThemedText>
          )}
        </View>

        <View style={styles.messageRow}>
          {isNew ? (
            <>
              <Feather name="zap" size={13} color={theme.secondary} />
              <ThemedText style={[styles.newMatchText, { color: theme.secondary }]}>
                New match! Say hello
              </ThemedText>
            </>
          ) : (
            <ThemedText
              style={[
                styles.message,
                { color: hasUnread ? theme.text : theme.textSecondary,
                  fontWeight: hasUnread ? "500" : "400" },
              ]}
              numberOfLines={1}
            >
              {lastMessage}
            </ThemedText>
          )}
        </View>
      </View>

      {/* Unread badge */}
      {hasUnread && (
        <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.unreadText}>
            {unreadCount > 99 ? "99+" : String(unreadCount)}
          </ThemedText>
        </View>
      )}

      {/* Chevron for new match */}
      {isNew && (
        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  avatarWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarNoRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
  },
  nickname: {
    fontSize: 16,
    flex: 1,
  },
  time: {
    fontSize: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  message: {
    fontSize: 14,
    flex: 1,
  },
  newMatchText: {
    fontSize: 14,
    fontWeight: "600",
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
