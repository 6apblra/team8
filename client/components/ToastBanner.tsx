import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

export interface ToastData {
  id: string;
  type: "match" | "message" | "error";
  title: string;
  body: string;
  avatarUrl?: string | null;
  onPress?: () => void;
}

const AVATAR_PLACEHOLDER = "https://api.dicebear.com/7.x/avataaars/png?seed=toast";

export function ToastBanner({
  toast,
  onDismiss,
}: {
  toast: ToastData | null;
  onDismiss: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (toast) {
      translateY.value = withSpring(0, { damping: 24, stiffness: 240 });
      opacity.value = withTiming(1, { duration: 180 });
    } else {
      translateY.value = withSpring(-120, { damping: 24, stiffness: 240 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [toast?.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    toast?.onPress?.();
    onDismiss();
  };

  const isMatch = toast?.type === "match";
  const isError = toast?.type === "error";
  const accentColor = isMatch ? theme.secondary : isError ? theme.danger : theme.primary;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { top: insets.top + (Platform.OS === "android" ? 8 : 4) },
        animatedStyle,
      ]}
      pointerEvents={toast ? "box-none" : "none"}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: `${accentColor}40`,
            shadowColor: accentColor,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        {/* Avatar */}
        <View style={[styles.avatarWrap, { borderColor: `${accentColor}50` }]}>
          {isMatch ? (
            <View style={[styles.matchIconWrap, { backgroundColor: `${accentColor}20` }]}>
              <Feather name="heart" size={18} color={accentColor} />
            </View>
          ) : isError ? (
            <View style={[styles.matchIconWrap, { backgroundColor: `${accentColor}20` }]}>
              <Feather name="alert-circle" size={18} color={accentColor} />
            </View>
          ) : (
            <Image
              source={{ uri: toast?.avatarUrl || AVATAR_PLACEHOLDER }}
              style={styles.avatar}
              contentFit="cover"
            />
          )}
        </View>

        {/* Text */}
        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <ThemedText
              style={[styles.title, { color: theme.text }]}
              numberOfLines={1}
            >
              {toast?.title}
            </ThemedText>
            <ThemedText style={[styles.time, { color: theme.textSecondary }]}>
              now
            </ThemedText>
          </View>
          <ThemedText
            style={[styles.body, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {toast?.body}
          </ThemedText>
        </View>

        {/* Dismiss */}
        <Pressable onPress={onDismiss} hitSlop={12} style={styles.closeBtn}>
          <Feather name="x" size={14} color={theme.textSecondary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    gap: Spacing.md,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.md,
  },
  accentBar: {
    width: 3,
    alignSelf: "stretch",
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  matchIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  time: {
    fontSize: 11,
  },
  body: {
    fontSize: 13,
  },
  closeBtn: {
    padding: 4,
  },
});
