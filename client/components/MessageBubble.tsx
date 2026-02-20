import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface MessageBubbleProps {
  content: string;
  isMine: boolean;
  timestamp?: Date;
  isFirst?: boolean; // first in a group from same sender
  isLast?: boolean;  // last in a group from same sender
}

export function MessageBubble({
  content,
  isMine,
  timestamp,
  isFirst = true,
  isLast = true,
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
        { marginBottom: isLast ? Spacing.sm : 2 },
      ]}
    >
      <View
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

        {/* Timestamp inside bubble, bottom-right */}
        {timestamp && isLast && (
          <ThemedText
            style={[
              styles.time,
              isMine ? styles.timeMine : [styles.timeOther, { color: theme.textSecondary }],
            ]}
          >
            {formatTime(timestamp)}
          </ThemedText>
        )}
      </View>
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
  time: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
  },
  timeMine: {
    color: "rgba(255,255,255,0.55)",
  },
  timeOther: {},
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
