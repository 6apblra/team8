import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface MessageBubbleProps {
  content: string;
  isMine: boolean;
  timestamp?: Date;
}

export function MessageBubble({
  content,
  isMine,
  timestamp,
}: MessageBubbleProps) {
  const { theme } = useTheme();

  const formatTime = (date: Date | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View
      style={[
        styles.container,
        isMine ? styles.containerMine : styles.containerOther,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isMine
            ? { backgroundColor: theme.primary }
            : { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <ThemedText
          style={[
            styles.content,
            isMine ? styles.textMine : [styles.textOther, { color: theme.text }],
          ]}
        >
          {content}
        </ThemedText>
      </View>
      {timestamp ? (
        <ThemedText style={[styles.time, { color: theme.textSecondary }]}>{formatTime(timestamp)}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: "80%",
    marginVertical: 2,
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  content: {
    fontSize: 16,
  },
  textMine: {
    color: "#FFFFFF",
  },
  textOther: {},
  time: {
    fontSize: 11,
    marginTop: 4,
    paddingHorizontal: 4,
  },
});
