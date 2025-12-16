import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing, GameColors } from "@/constants/theme";

interface GameBadgeProps {
  game: string;
  rank?: string;
  role?: string;
  size?: "small" | "medium" | "large";
  onPress?: () => void;
  selected?: boolean;
}

const GAME_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  valorant: "crosshair",
  cs2: "target",
  dota2: "shield",
  fortnite: "box",
  lol: "award",
};

export function GameBadge({
  game,
  rank,
  role,
  size = "medium",
  onPress,
  selected,
}: GameBadgeProps) {
  const gameKey = game.toLowerCase().replace(/\s/g, "").replace("2", "2");
  const color = GameColors[gameKey] || "#00D9FF";
  const icon = GAME_ICONS[gameKey] || "circle";

  const sizeStyles = {
    small: { padding: Spacing.xs, iconSize: 14, fontSize: 12 },
    medium: { padding: Spacing.sm, iconSize: 18, fontSize: 14 },
    large: { padding: Spacing.md, iconSize: 24, fontSize: 16 },
  };

  const { padding, iconSize, fontSize } = sizeStyles[size];

  const content = (
    <View
      style={[
        styles.badge,
        {
          padding,
          backgroundColor: selected ? color : "rgba(255,255,255,0.1)",
          borderColor: color,
          borderWidth: selected ? 0 : 1,
        },
      ]}
    >
      <Feather name={icon} size={iconSize} color={selected ? "#FFFFFF" : color} />
      <View style={styles.textContainer}>
        <ThemedText
          style={[styles.gameName, { fontSize, color: selected ? "#FFFFFF" : color }]}
        >
          {game}
        </ThemedText>
        {rank ? (
          <ThemedText style={[styles.rank, { fontSize: fontSize - 2 }]}>
            {rank}
          </ThemedText>
        ) : null}
        {role ? (
          <ThemedText style={[styles.role, { fontSize: fontSize - 2 }]}>
            {role}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  textContainer: {
    flexDirection: "column",
  },
  gameName: {
    fontWeight: "600",
  },
  rank: {
    color: "#A0A8B8",
  },
  role: {
    color: "#A0A8B8",
  },
});
