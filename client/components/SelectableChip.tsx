import React from "react";
import { StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface SelectableChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  color?: string;
}

export function SelectableChip({
  label,
  selected,
  onPress,
  icon,
  color,
}: SelectableChipProps) {
  const { theme } = useTheme();
  const activeColor = color || theme.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.chip,
        {
          backgroundColor: selected ? activeColor : theme.backgroundSecondary,
          borderColor: selected ? activeColor : theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {icon ? (
        <Feather
          name={icon}
          size={16}
          color={selected ? "#FFFFFF" : theme.textSecondary}
        />
      ) : null}
      <ThemedText
        style={[
          styles.text,
          { color: selected ? "#FFFFFF" : theme.textSecondary },
        ]}
      >
        {label}
      </ThemedText>
      {selected ? (
        <Feather name="check" size={14} color="#FFFFFF" />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
  },
});
