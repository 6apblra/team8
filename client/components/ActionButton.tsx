import React from "react";
import { StyleSheet, Pressable, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { BorderRadius, Colors } from "@/constants/theme";

interface ActionButtonProps {
  icon: keyof typeof Feather.glyphMap;
  color: string;
  backgroundColor?: string;
  size?: "small" | "medium" | "large";
  onPress: () => void;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ActionButton({
  icon,
  color,
  backgroundColor,
  size = "medium",
  onPress,
  style,
}: ActionButtonProps) {
  const scale = useSharedValue(1);

  const sizeConfig = {
    small: { button: 48, icon: 20 },
    medium: { button: 60, icon: 28 },
    large: { button: 72, icon: 32 },
  };

  const { button: buttonSize, icon: iconSize } = sizeConfig[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.button,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor: backgroundColor || Colors.dark.backgroundSecondary,
          borderColor: color,
        },
        animatedStyle,
        style,
      ]}
    >
      <Feather name={icon} size={iconSize} color={color} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
});
