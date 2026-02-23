import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

export interface ReactionSummary {
  emoji: string;
  count: number;
  userIds: string[];
}

interface MessageBubbleProps {
  content: string;
  isMine: boolean;
  timestamp?: Date;
  isFirst?: boolean;
  isLast?: boolean;
  isRead?: boolean;
  reactions?: ReactionSummary[];
  myUserId?: string;
  onLongPress?: () => void;
}

export function MessageBubble({
  content,
  isMine,
  timestamp,
  isFirst = true,
  isLast = true,
  isRead = false,
  reactions = [],
  myUserId,
  onLongPress,
}: MessageBubbleProps) {
  const { theme } = useTheme();

  const formatTime = (date: Date | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Bubble shape: fully rounded except the "tail" corner
  const bubbleRadius = 18;
  const tailRadius = 4;

  const mineBorderRadius = {
    borderTopLeftRadius: bubbleRadius,
    borderTopRightRadius: isFirst ? bubbleRadius : tailRadius,
    borderBottomLeftRadius: bubbleRadius,
    borderBottomRightRadius: isLast ? tailRadius : bubbleRadius,
  };

  const otherBorderRadius = {
    borderTopLeftRadius: isFirst ? bubbleRadius : tailRadius,
    borderTopRightRadius: bubbleRadius,
    borderBottomLeftRadius: isLast ? tailRadius : bubbleRadius,
    borderBottomRightRadius: bubbleRadius,
  };

  return (
    <View
      style={[
        styles.container,
        isMine ? styles.containerMine : styles.containerOther,
        { marginBottom: reactions.length > 0 ? 16 : isLast ? Spacing.sm : 2 },
      ]}
    >
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        style={[
          styles.bubble,
          isMine
            ? [styles.bubbleMine, mineBorderRadius, { backgroundColor: theme.primary }]
            : [styles.bubbleOther, otherBorderRadius, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }],
        ]}
      >
        <ThemedText
          style={[
            styles.content,
            isMine ? styles.contentMine : [styles.contentOther, { color: theme.text }],
          ]}
        >
          {content}
        </ThemedText>

        {/* Timestamp + read receipt, bottom-right */}
        {timestamp && isLast && (
          <View style={styles.timeRow}>
            <ThemedText
              style={[
                styles.time,
                isMine ? styles.timeMine : [styles.timeOther, { color: theme.textSecondary }],
              ]}
            >
              {formatTime(timestamp)}
            </ThemedText>
            {isMine && (
              <View style={styles.receiptWrap}>
                <Feather
                  name="check"
                  size={11}
                  color={isRead ? theme.primary : "rgba(255,255,255,0.55)"}
                />
                {isRead && (
                  <Feather
                    name="check"
                    size={11}
                    color={theme.primary}
                    style={{ marginLeft: -6 }}
                  />
                )}
              </View>
            )}
          </View>
        )}
      </Pressable>

      {/* Reaction chips */}
      {reactions.length > 0 && (
        <View style={[styles.reactionsRow, isMine ? styles.reactionsRowMine : styles.reactionsRowOther]}>
          {reactions.map((r) => {
            const byMe = myUserId ? r.userIds.includes(myUserId) : false;
            return (
              <View
                key={r.emoji}
                style={[
                  styles.reactionChip,
                  {
                    backgroundColor: byMe ? `${theme.primary}22` : theme.backgroundSecondary,
                    borderColor: byMe ? `${theme.primary}60` : theme.border,
                  },
                ]}
              >
                <ThemedText style={styles.reactionEmoji}>{r.emoji}</ThemedText>
                {r.count > 1 && (
                  <ThemedText style={[styles.reactionCount, { color: byMe ? theme.primary : theme.textSecondary }]}>
                    {r.count}
                  </ThemedText>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// Animated typing dots
export function TypingBubble() {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, styles.containerOther, { marginBottom: Spacing.sm }]}>
      <View style={[
        styles.bubble,
        styles.bubbleOther,
        {
          borderBottomLeftRadius: 4,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          borderBottomRightRadius: 18,
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
          paddingVertical: 14,
          paddingHorizontal: 18,
        },
      ]}>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
          <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
          <View style={[styles.dot, { backgroundColor: theme.textSecondary }]} />
        </View>
      </View>
    </View>
  );
}

// Date separator
export function DateSeparator({ date }: { date: Date }) {
  const { theme } = useTheme();

  const formatDate = (d: Date) => {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <View style={styles.dateSeparator}>
      <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
      <ThemedText style={[styles.dateText, { color: theme.textSecondary, backgroundColor: theme.backgroundRoot }]}>
        {formatDate(date)}
      </ThemedText>
      <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: "78%",
  },
  containerMine: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  containerOther: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  bubbleMine: {
    shadowColor: "#00D9FF",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleOther: {
    borderWidth: 1,
  },
  content: {
    fontSize: 15,
    lineHeight: 21,
  },
  contentMine: {
    color: "#FFFFFF",
  },
  contentOther: {},
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 3,
  },
  time: {
    fontSize: 10,
    textAlign: "right",
  },
  timeMine: {
    color: "rgba(255,255,255,0.55)",
  },
  timeOther: {},
  receiptWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: -8,
    paddingHorizontal: 4,
  },
  reactionsRowMine: {
    justifyContent: "flex-end",
  },
  reactionsRowOther: {
    justifyContent: "flex-start",
  },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: "700",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    opacity: 0.6,
  },
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dateLine: {
    flex: 1,
    height: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: Spacing.sm,
    letterSpacing: 0.3,
  },
});
