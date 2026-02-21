import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  interpolateColor,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth, type Profile } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SelectableChip } from "@/components/SelectableChip";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, GameColors } from "@/constants/theme";
import {
  GAMES,
  PLAYSTYLES,
  PLATFORMS,
  REGIONS,
  LANGUAGES,
  DAYS_OF_WEEK,
  TIME_SLOTS,
} from "@/lib/game-data";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BAR_WIDTH = SCREEN_WIDTH - Spacing.xl * 2;
const STEP_KEYS = ["profile", "games", "schedule", "finish"] as const;
const TOTAL_STEPS = STEP_KEYS.length;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Animated text input with focus glow ────────────────────────────────────

function AnimatedInput({
  theme,
  multiline,
  ...props
}: {
  theme: any;
  multiline?: boolean;
  [key: string]: any;
}) {
  const focused = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focused.value, [0, 1], [theme.border, theme.primary]),
    shadowOpacity: interpolate(focused.value, [0, 1], [0, 0.4]),
    shadowRadius: interpolate(focused.value, [0, 1], [0, 10]),
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    elevation: interpolate(focused.value, [0, 1], [0, 4]),
  }));

  return (
    <Animated.View
      style={[
        inputStyles.container,
        { backgroundColor: theme.backgroundDefault },
        containerStyle,
      ]}
    >
      <TextInput
        {...props}
        style={[inputStyles.input, { color: theme.text }, multiline && inputStyles.multiline]}
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        onFocus={() => { focused.value = withTiming(1, { duration: 200 }); }}
        onBlur={() => { focused.value = withTiming(0, { duration: 200 }); }}
      />
    </Animated.View>
  );
}

const inputStyles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
  },
  input: { height: 52, fontSize: 16 },
  multiline: { height: 100, paddingTop: Spacing.md, textAlignVertical: "top" },
});

// ─── Animated game card ──────────────────────────────────────────────────────

const GAME_ICONS: Record<string, string> = {
  valorant: "crosshair",
  cs2: "target",
  dota2: "shield",
  fortnite: "box",
};

function GameCard({
  game,
  isSelected,
  onPress,
  gameColor,
  theme,
}: {
  game: { id: string; name: string };
  isSelected: boolean;
  onPress: () => void;
  gameColor: string;
  theme: any;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.91, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      style={[
        animStyle,
        gcStyles.card,
        {
          backgroundColor: isSelected ? gameColor : theme.backgroundSecondary,
          borderColor: gameColor,
          shadowColor: isSelected ? gameColor : "transparent",
          shadowOpacity: isSelected ? 0.55 : 0,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
          elevation: isSelected ? 8 : 0,
        },
      ]}
    >
      <Feather
        name={(GAME_ICONS[game.id] || "award") as any}
        size={34}
        color={isSelected ? "#FFFFFF" : gameColor}
      />
      <ThemedText style={[gcStyles.name, { color: isSelected ? "#FFFFFF" : theme.text }]}>
        {game.name}
      </ThemedText>
      {isSelected && (
        <View style={gcStyles.check}>
          <Feather name="check" size={12} color="#FFFFFF" />
        </View>
      )}
    </AnimatedPressable>
  );
}

const gcStyles = StyleSheet.create({
  card: {
    width: "46%",
    aspectRatio: 1.1,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    position: "relative",
  },
  name: { fontSize: 13, fontWeight: "700" },
  check: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Animated day button ─────────────────────────────────────────────────────

function DayButton({
  label,
  selected,
  onPress,
  theme,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: any;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.84, { damping: 14 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 14 }); }}
      style={[
        animStyle,
        dayStyles.btn,
        {
          backgroundColor: selected ? theme.primary : theme.backgroundSecondary,
          shadowColor: selected ? theme.primary : "transparent",
          shadowOpacity: selected ? 0.5 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: selected ? 4 : 0,
        },
      ]}
    >
      <ThemedText
        style={[
          dayStyles.text,
          { color: selected ? "#FFFFFF" : theme.textSecondary, fontWeight: selected ? "700" : "500" },
        ]}
      >
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

const dayStyles = StyleSheet.create({
  btn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 11 },
});

// ─── Animated time slot card ─────────────────────────────────────────────────

const SLOT_ICONS: Record<string, string> = {
  morning: "sunrise",
  afternoon: "sun",
  evening: "sunset",
  night: "moon",
};

function TimeSlotCard({
  slot,
  selected,
  onPress,
  label,
  theme,
}: {
  slot: { id: string; start: string; end: string };
  selected: boolean;
  onPress: () => void;
  label: string;
  theme: any;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.93, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      style={[
        animStyle,
        tsStyles.card,
        {
          backgroundColor: selected ? `${theme.primary}18` : theme.backgroundSecondary,
          borderColor: selected ? theme.primary : theme.border,
          shadowColor: selected ? theme.primary : "transparent",
          shadowOpacity: selected ? 0.3 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: selected ? 3 : 0,
        },
      ]}
    >
      <View
        style={[
          tsStyles.iconBg,
          { backgroundColor: selected ? theme.primary : `${theme.primary}20` },
        ]}
      >
        <Feather
          name={(SLOT_ICONS[slot.id] || "clock") as any}
          size={22}
          color={selected ? "#FFFFFF" : theme.primary}
        />
      </View>
      <ThemedText
        style={{ color: selected ? theme.primary : theme.text, fontWeight: "700", fontSize: 14 }}
      >
        {label}
      </ThemedText>
      <ThemedText
        style={{ fontSize: 11, color: selected ? theme.primary : theme.textSecondary, opacity: 0.8 }}
      >
        {slot.start} – {slot.end}
      </ThemedText>
    </AnimatedPressable>
  );
}

const tsStyles = StyleSheet.create({
  card: {
    width: "47%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 4,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
});

// ─── Success animation ───────────────────────────────────────────────────────

function SuccessAnimation({
  theme,
  t,
}: {
  theme: any;
  t: (key: string, params?: any) => string;
}) {
  const circleScale = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    circleScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    textOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    glowOpacity.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
    glowScale.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1.65, { duration: 1200, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: interpolate(textOpacity.value, [0, 1], [18, 0]) }],
  }));

  return (
    <View style={sucStyles.container}>
      <View style={sucStyles.iconWrapper}>
        <Animated.View
          style={[sucStyles.glow, { backgroundColor: theme.success }, glowStyle]}
        />
        <Animated.View
          style={[
            sucStyles.circle,
            { backgroundColor: `${theme.success}15`, borderColor: theme.success },
            circleStyle,
          ]}
        >
          <Feather name="check" size={54} color={theme.success} />
        </Animated.View>
      </View>
      <Animated.View style={[{ alignItems: "center", gap: Spacing.sm }, textStyle]}>
        <ThemedText type="h2" style={{ color: theme.text, textAlign: "center" }}>
          {t("onboarding.allSet")}
        </ThemedText>
        <ThemedText
          style={{
            color: theme.textSecondary,
            textAlign: "center",
            fontSize: 16,
            lineHeight: 24,
            paddingHorizontal: Spacing.xl,
          }}
        >
          {t("onboarding.allSetSubtitle")}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const sucStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing["3xl"],
    gap: Spacing.xl,
  },
  iconWrapper: { width: 130, height: 130, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 120, height: 120, borderRadius: 60 },
  circle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { user, setProfile } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [region, setRegion] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["en"]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [discordTag, setDiscordTag] = useState("");

  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [gameRanks, setGameRanks] = useState<Record<string, string>>({});
  const [gameRoles, setGameRoles] = useState<Record<string, string[]>>({});
  const [playstyle, setPlaystyle] = useState("competitive");
  const [platform, setPlatform] = useState("pc");

  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);

  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const timeSlotKeys = ["morning", "afternoon", "evening", "night"] as const;

  // Progress bar animation
  const progressAnim = useSharedValue(BAR_WIDTH / TOTAL_STEPS);
  useEffect(() => {
    progressAnim.value = withSpring(
      ((step + 1) / TOTAL_STEPS) * BAR_WIDTH,
      { damping: 20, stiffness: 180 },
    );
  }, [step]);

  const progressStyle = useAnimatedStyle(() => ({ width: progressAnim.value }));

  // Mic toggle knob animation
  const micKnob = useSharedValue(20);
  useEffect(() => {
    micKnob.value = withSpring(micEnabled ? 20 : 0, { damping: 15, stiffness: 250 });
  }, [micEnabled]);
  const micKnobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: micKnob.value }],
  }));

  // Handlers
  const toggleGame = (gameId: string) =>
    setSelectedGames((p) => (p.includes(gameId) ? p.filter((g) => g !== gameId) : [...p, gameId]));
  const toggleLanguage = (langId: string) =>
    setSelectedLanguages((p) =>
      p.includes(langId) ? p.filter((l) => l !== langId) : [...p, langId],
    );
  const toggleDay = (day: number) =>
    setSelectedDays((p) => (p.includes(day) ? p.filter((d) => d !== day) : [...p, day]));
  const toggleTimeSlot = (slot: string) =>
    setSelectedTimeSlots((p) => (p.includes(slot) ? p.filter((s) => s !== slot) : [...p, slot]));

  const canProceed = () => {
    switch (step) {
      case 0:
        return nickname.trim().length >= 2 && !!region;
      case 1:
        return selectedGames.length > 0;
      case 2:
        return selectedDays.length > 0 && selectedTimeSlots.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else handleComplete();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleComplete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profileData = {
        userId: user.id,
        nickname: nickname.trim(),
        bio: bio.trim() || null,
        region,
        languages: selectedLanguages,
        micEnabled,
        discordTag: discordTag.trim() || null,
      };
      const createdProfile = await apiRequest<Profile>("POST", "/api/profile", profileData);

      const gamesData = selectedGames.map((gameId) => ({
        gameId,
        rank: gameRanks[gameId] || null,
        roles: gameRoles[gameId] || [],
        playstyle,
        platform,
        isPrimary: gameId === selectedGames[0],
      }));
      try {
        await apiRequest("POST", `/api/user-games/${user.id}`, { games: gamesData });
      } catch {
        Alert.alert(t("common.warning"), t("onboarding.warningGames"));
      }

      const windows = selectedDays.flatMap((day) =>
        selectedTimeSlots.map((slot) => {
          const ts = TIME_SLOTS.find((s) => s.id === slot);
          return {
            dayOfWeek: day,
            startTime: ts?.start || "00:00",
            endTime: ts?.end || "23:59",
          };
        }),
      );
      try {
        await apiRequest("POST", `/api/availability/${user.id}`, { windows });
      } catch {
        Alert.alert(t("common.warning"), t("onboarding.warningSchedule"));
      }

      setProfile(createdProfile);
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        t("onboarding.errorCreateProfile", {
          message: error?.message || "Something went wrong",
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIconBadge, { backgroundColor: `${theme.primary}20` }]}>
                <Feather name="user" size={30} color={theme.primary} />
              </View>
              <ThemedText type="h2" style={{ color: theme.text, textAlign: "center" }}>
                {t("onboarding.createProfile")}
              </ThemedText>
              <ThemedText style={{ color: theme.textSecondary, textAlign: "center", fontSize: 15 }}>
                {t("onboarding.createProfileSubtitle")}
              </ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                {t("onboarding.nickname")}
              </ThemedText>
              <AnimatedInput
                theme={theme}
                placeholder={t("onboarding.nicknamePlaceholder")}
                value={nickname}
                onChangeText={setNickname}
              />
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                {t("onboarding.region")}
              </ThemedText>
              <View style={styles.chipGrid}>
                {REGIONS.map((r) => (
                  <SelectableChip
                    key={r.id}
                    label={t(`gameData.regions.${r.id}`)}
                    selected={region === r.id}
                    onPress={() => setRegion(r.id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                {t("onboarding.languages")}
              </ThemedText>
              <View style={styles.chipGrid}>
                {LANGUAGES.slice(0, 6).map((lang) => (
                  <SelectableChip
                    key={lang.id}
                    label={t(`gameData.languages.${lang.id}`)}
                    selected={selectedLanguages.includes(lang.id)}
                    onPress={() => toggleLanguage(lang.id)}
                  />
                ))}
              </View>
            </View>

            <View
              style={[
                styles.toggleCard,
                { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
              ]}
            >
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelRow}>
                  <View
                    style={[
                      styles.toggleIconBg,
                      {
                        backgroundColor: micEnabled
                          ? `${theme.success}20`
                          : `${theme.primary}15`,
                      },
                    ]}
                  >
                    <Feather
                      name="mic"
                      size={18}
                      color={micEnabled ? theme.success : theme.textSecondary}
                    />
                  </View>
                  <View>
                    <ThemedText style={{ fontSize: 15, fontWeight: "600", color: theme.text }}>
                      {t("onboarding.microphone")}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                      {micEnabled ? "Voice chat enabled" : "Voice chat off"}
                    </ThemedText>
                  </View>
                </View>
                <Pressable onPress={() => setMicEnabled(!micEnabled)}>
                  <View
                    style={[
                      styles.toggle,
                      {
                        backgroundColor: micEnabled
                          ? theme.success
                          : theme.backgroundDefault,
                        borderColor: micEnabled ? theme.success : theme.border,
                      },
                    ]}
                  >
                    <Animated.View style={[styles.toggleKnob, micKnobStyle]} />
                  </View>
                </Pressable>
              </View>
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                {t("onboarding.discordTag")}
              </ThemedText>
              <AnimatedInput
                theme={theme}
                placeholder={t("onboarding.discordPlaceholder")}
                value={discordTag}
                onChangeText={setDiscordTag}
              />
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                {t("onboarding.bioOptional")}
              </ThemedText>
              <AnimatedInput
                theme={theme}
                placeholder={t("onboarding.bioPlaceholder")}
                value={bio}
                onChangeText={setBio}
                multiline
              />
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIconBadge, { backgroundColor: `${theme.primary}20` }]}>
                <Feather name="award" size={30} color={theme.primary} />
              </View>
              <ThemedText type="h2" style={{ color: theme.text, textAlign: "center" }}>
                {t("onboarding.selectGames")}
              </ThemedText>
              <ThemedText style={{ color: theme.textSecondary, textAlign: "center", fontSize: 15 }}>
                {t("onboarding.selectGamesSubtitle")}
              </ThemedText>
            </View>

            <View style={styles.gamesGrid}>
              {GAMES.map((game) => {
                const isSelected = selectedGames.includes(game.id);
                const gameColor = GameColors[game.id] || theme.primary;
                return (
                  <GameCard
                    key={game.id}
                    game={game}
                    isSelected={isSelected}
                    onPress={() => toggleGame(game.id)}
                    gameColor={gameColor}
                    theme={theme}
                  />
                );
              })}
            </View>

            {selectedGames.length > 0 && (
              <>
                <View style={styles.field}>
                  <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                    {t("onboarding.playstyle")}
                  </ThemedText>
                  <View style={styles.chipGrid}>
                    {PLAYSTYLES.map((ps) => (
                      <SelectableChip
                        key={ps.id}
                        label={t(`gameData.playstyles.${ps.id}`)}
                        selected={playstyle === ps.id}
                        onPress={() => setPlaystyle(ps.id)}
                        icon={ps.icon as any}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.field}>
                  <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                    {t("onboarding.platform")}
                  </ThemedText>
                  <View style={styles.chipGrid}>
                    {PLATFORMS.map((p) => (
                      <SelectableChip
                        key={p.id}
                        label={t(`gameData.platforms.${p.id}`)}
                        selected={platform === p.id}
                        onPress={() => setPlatform(p.id)}
                      />
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIconBadge, { backgroundColor: `${theme.primary}20` }]}>
                <Feather name="calendar" size={30} color={theme.primary} />
              </View>
              <ThemedText type="h2" style={{ color: theme.text, textAlign: "center" }}>
                {t("onboarding.setSchedule")}
              </ThemedText>
              <ThemedText style={{ color: theme.textSecondary, textAlign: "center", fontSize: 15 }}>
                {t("onboarding.setScheduleSubtitle")}
              </ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                {t("onboarding.daysAvailable")}
              </ThemedText>
              <View style={styles.daysRow}>
                {DAYS_OF_WEEK.map((day, idx) => (
                  <DayButton
                    key={day.id}
                    label={t(`gameData.days.${dayKeys[idx]}`)}
                    selected={selectedDays.includes(day.id)}
                    onPress={() => toggleDay(day.id)}
                    theme={theme}
                  />
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                {t("onboarding.timeSlots")}
              </ThemedText>
              <View style={styles.timeSlotsGrid}>
                {TIME_SLOTS.map((slot, idx) => (
                  <TimeSlotCard
                    key={slot.id}
                    slot={slot}
                    selected={selectedTimeSlots.includes(slot.id)}
                    onPress={() => toggleTimeSlot(slot.id)}
                    label={t(`gameData.timeSlots.${timeSlotKeys[idx]}`)}
                    theme={theme}
                  />
                ))}
              </View>
            </View>
          </View>
        );

      case 3:
        return <SuccessAnimation theme={theme} t={t} />;

      default:
        return null;
    }
  };

  const canContinue = canProceed() && !loading;

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBg, { backgroundColor: `${theme.primary}20` }]} />
          <Animated.View
            style={[styles.progressFill, { backgroundColor: theme.primary }, progressStyle]}
          />
        </View>
        <View style={styles.stepMeta}>
          <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
            {t("onboarding.stepOf", {
              current: String(step + 1),
              total: String(TOTAL_STEPS),
            })}
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: theme.primary,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            {STEP_KEYS[step]}
          </ThemedText>
        </View>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {renderStep()}
      </KeyboardAwareScrollViewCompat>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.sm,
            borderTopColor: `${theme.border}50`,
          },
        ]}
      >
        {step > 0 ? (
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <View style={[styles.backIconBg, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="arrow-left" size={18} color={theme.text} />
            </View>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 15 }}>
              {t("common.back")}
            </ThemedText>
          </Pressable>
        ) : (
          <View style={{ width: 70 }} />
        )}

        <Pressable onPress={handleNext} disabled={!canContinue}>
          <LinearGradient
            colors={
              canContinue
                ? [theme.primary, `${theme.primary}BB`]
                : [`${theme.primary}50`, `${theme.primary}35`]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextBtn}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <ThemedText style={styles.nextBtnText}>
                  {step === TOTAL_STEPS - 1
                    ? t("onboarding.startMatching")
                    : t("onboarding.continue")}
                </ThemedText>
                {step < TOTAL_STEPS - 1 && (
                  <Feather name="arrow-right" size={18} color="#FFFFFF" />
                )}
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
  },
  progressBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 3,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  stepMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  stepContent: { gap: Spacing.lg },
  stepHeader: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  stepIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  field: { gap: Spacing.xs },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  toggleCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  toggleIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    borderWidth: 1,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  gamesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    justifyContent: "center",
  },
  daysRow: { flexDirection: "row", justifyContent: "space-between" },
  timeSlotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  backIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
  },
  nextBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
