import React from "react";
import { StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface QuickMessageChipProps {
  message: string;
  onPress: () => void;
}

export function QuickMessageChip({ message, onPress }: QuickMessageChipProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.chip,
        { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <ThemedText style={styles.text}>{message}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  text: {
    fontSize: 14,
    color: "#FFFFFF",
  },
});
