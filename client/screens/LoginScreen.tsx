import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { useAuth } from "@/lib/auth-context";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius } from "@/constants/theme";

const { width: W, height: H } = Dimensions.get("window");

// ─── Floating orb ───────────────────────────────────────────────────────────
function FloatingOrb({
  color,
  size,
  x,
  y,
  duration,
  delay,
}: {
  color: string;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
}) {
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 800 }));
    ty.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-18, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(18, { duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.orb,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color, left: x, top: y },
        style,
      ]}
      pointerEvents="none"
    />
  );
}

// ─── Particle dot ────────────────────────────────────────────────────────────
function Particle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1200 }),
          withTiming(0.15, { duration: 1200 }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[styles.particle, { left: x, top: y }, style]}
      pointerEvents="none"
    />
  );
}

// ─── Animated input ───────────────────────────────────────────────────────────
function AnimatedInput({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  rightElement,
}: {
  icon: keyof typeof Feather.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  rightElement?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderAnim = useSharedValue(0);

  useEffect(() => {
    borderAnim.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused]);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: interpolate(borderAnim.value, [0, 1], [0, 1]) === 1
      ? theme.primary
      : theme.border,
    shadowOpacity: interpolate(borderAnim.value, [0, 1], [0, 0.3]),
  }));

  return (
    <Animated.View
      style={[
        styles.inputBox,
        { backgroundColor: `${theme.backgroundDefault}CC` },
        containerStyle,
      ]}
    >
      <Feather
        name={icon}
        size={18}
        color={focused ? theme.primary : theme.textSecondary}
        style={styles.inputIcon}
      />
      <TextInput
        style={[styles.inputText, { color: theme.text }]}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "none"}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {rightElement}
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
const ORBS = [
  { color: "rgba(0,217,255,0.13)", size: 280, x: -80, y: 60, duration: 4200, delay: 0 },
  { color: "rgba(184,87,255,0.12)", size: 240, x: W - 140, y: H * 0.25, duration: 5100, delay: 300 },
  { color: "rgba(0,255,136,0.08)", size: 200, x: W * 0.2, y: H * 0.6, duration: 3800, delay: 600 },
];

const PARTICLES = [
  { x: W * 0.15, y: H * 0.12, delay: 0 },
  { x: W * 0.75, y: H * 0.08, delay: 400 },
  { x: W * 0.88, y: H * 0.45, delay: 800 },
  { x: W * 0.05, y: H * 0.55, delay: 200 },
  { x: W * 0.6, y: H * 0.75, delay: 600 },
  { x: W * 0.3, y: H * 0.82, delay: 1000 },
  { x: W * 0.92, y: H * 0.72, delay: 1400 },
  { x: W * 0.45, y: H * 0.05, delay: 700 },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Logo glow pulse
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);

  // Entrance animations
  const heroOpacity = useSharedValue(0);
  const heroY = useSharedValue(24);
  const formOpacity = useSharedValue(0);
  const formY = useSharedValue(32);

  // Tab indicator slide
  const tabSlide = useSharedValue(0);

  useEffect(() => {
    // Glow pulse
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.18, { duration: 1800 }),
        withTiming(0.55, { duration: 1800 }),
      ),
      -1,
      true,
    );

    // Entrance
    heroOpacity.value = withTiming(1, { duration: 700 });
    heroY.value = withSpring(0, { damping: 20, stiffness: 80 });
    formOpacity.value = withDelay(250, withTiming(1, { duration: 700 }));
    formY.value = withDelay(250, withSpring(0, { damping: 20, stiffness: 80 }));
  }, []);

  useEffect(() => {
    tabSlide.value = withSpring(isLogin ? 0 : 1, { damping: 18, stiffness: 160 });
  }, [isLogin]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroY.value }],
  }));

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formY.value }],
  }));

  const tabIndicatorStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(tabSlide.value, [0, 1], [0, (W - Spacing.xl * 2 - 8) / 2]) },
    ],
  }));

  const handleSubmit = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError(t("auth.fillAllFields"));
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError(t("auth.passwordsMismatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.passwordMinLength"));
      return;
    }
    setLoading(true);
    try {
      const result = isLogin
        ? await login(email.trim(), password)
        : await register(email.trim(), password);
      if (!result.success) setError(result.error || t("common.error"));
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setError("");
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.backgroundRoot }]}>
      {/* Background orbs */}
      {ORBS.map((orb, i) => <FloatingOrb key={i} {...orb} />)}

      {/* Particle dots */}
      {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + Spacing["2xl"],
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        {/* ── Hero ── */}
        <Animated.View style={[styles.hero, heroStyle]}>
          <View style={styles.logoWrap}>
            {/* Glow ring */}
            <Animated.View
              style={[
                styles.logoGlow,
                { backgroundColor: theme.primary },
                glowStyle,
              ]}
            />
            {/* Inner ring */}
            <View style={[styles.logoRing, { borderColor: `${theme.primary}40` }]}>
              <Image
                source={require("../../assets/images/icon.png")}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
          </View>

          <ThemedText style={[styles.title, { color: theme.text }]}>
            {t("auth.title")}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t("auth.subtitle")}
          </ThemedText>
        </Animated.View>

        {/* ── Form card ── */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: `${theme.backgroundDefault}E6`,
              borderColor: theme.border,
            },
            formStyle,
          ]}
        >
          {/* Tab switcher */}
          <View style={[styles.tabs, { backgroundColor: theme.backgroundSecondary }]}>
            <Animated.View style={[styles.tabIndicator, { backgroundColor: theme.primary }, tabIndicatorStyle]} />
            <Pressable style={styles.tab} onPress={() => switchTab(true)}>
              <ThemedText style={[
                styles.tabText,
                { color: isLogin ? "#fff" : theme.textSecondary },
              ]}>
                {t("auth.signIn")}
              </ThemedText>
            </Pressable>
            <Pressable style={styles.tab} onPress={() => switchTab(false)}>
              <ThemedText style={[
                styles.tabText,
                { color: !isLogin ? "#fff" : theme.textSecondary },
              ]}>
                {t("auth.signUp")}
              </ThemedText>
            </Pressable>
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            <AnimatedInput
              icon="mail"
              placeholder={t("auth.email")}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <AnimatedInput
              icon="lock"
              placeholder={t("auth.password")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightElement={
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={theme.textSecondary}
                  />
                </Pressable>
              }
            />

            {!isLogin && (
              <AnimatedInput
                icon="lock"
                placeholder={t("auth.confirmPassword")}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            )}

            {/* Error */}
            {error ? (
              <View style={[styles.errorRow, { backgroundColor: `${theme.danger}15`, borderColor: `${theme.danger}30` }]}>
                <Feather name="alert-circle" size={15} color={theme.danger} />
                <ThemedText style={[styles.errorText, { color: theme.danger }]}>{error}</ThemedText>
              </View>
            ) : null}

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.submitBtn,
                {
                  backgroundColor: theme.primary,
                  shadowColor: theme.primary,
                  opacity: pressed ? 0.85 : loading ? 0.6 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.submitText}>
                  {isLogin ? t("auth.signIn") : t("auth.createAccount")}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: formOpacity }]}>
          <ThemedText style={[styles.footerText, { color: theme.textSecondary }]}>
            {t("auth.footer")}
          </ThemedText>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "center",
    gap: Spacing["2xl"],
  },

  // Particles
  orb: {
    position: "absolute",
  },
  particle: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
  },

  // Hero
  hero: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  logoGlow: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  logoRing: {
    width: 104,
    height: 104,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 98,
    height: 98,
    borderRadius: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 21,
  },

  // Card
  card: {
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.xl,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    borderRadius: BorderRadius.full,
    padding: 4,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    width: "50%",
    bottom: 4,
    borderRadius: BorderRadius.full,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Fields
  fields: {
    gap: Spacing.md,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    height: 52,
    shadowColor: "#00D9FF",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 0,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
  },
  eyeBtn: {
    padding: Spacing.xs,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  submitBtn: {
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.4,
  },

  // Footer
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
