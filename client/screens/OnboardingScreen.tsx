import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth, type Profile } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { SelectableChip } from "@/components/SelectableChip";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, GameColors } from "@/constants/theme";
import {
  GAMES,
  RANKS,
  ROLES,
  PLAYSTYLES,
  PLATFORMS,
  REGIONS,
  LANGUAGES,
  DAYS_OF_WEEK,
  TIME_SLOTS,
} from "@/lib/game-data";

const STEPS = ["Profile", "Games", "Schedule", "Finish"];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { user, setProfile } = useAuth();
  const { theme } = useTheme();

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

  const toggleGame = (gameId: string) => {
    setSelectedGames((prev) =>
      prev.includes(gameId)
        ? prev.filter((g) => g !== gameId)
        : [...prev, gameId],
    );
  };

  const toggleLanguage = (langId: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(langId)
        ? prev.filter((l) => l !== langId)
        : [...prev, langId],
    );
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const toggleTimeSlot = (slot: string) => {
    setSelectedTimeSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  };

  const setGameRank = (gameId: string, rank: string) => {
    setGameRanks((prev) => ({ ...prev, [gameId]: rank }));
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return nickname.trim().length >= 2 && region;
      case 1:
        return selectedGames.length > 0;
      case 2:
        return selectedDays.length > 0 && selectedTimeSlots.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
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

      const createdProfile = await apiRequest<Profile>(
        "POST",
        "/api/profile",
        profileData,
      );

      const gamesData = selectedGames.map((gameId) => ({
        gameId,
        rank: gameRanks[gameId] || null,
        roles: gameRoles[gameId] || [],
        playstyle,
        platform,
        isPrimary: gameId === selectedGames[0],
      }));

      try {
        await apiRequest("POST", `/api/user-games/${user.id}`, {
          games: gamesData,
        });
      } catch (gamesError) {
        console.error("Failed to save games:", gamesError);
        Alert.alert("Warning", "Profile created but games could not be saved. You can add them later in settings.");
      }

      const windows = selectedDays.flatMap((day) =>
        selectedTimeSlots.map((slot) => {
          const timeSlot = TIME_SLOTS.find((t) => t.id === slot);
          return {
            dayOfWeek: day,
            startTime: timeSlot?.start || "00:00",
            endTime: timeSlot?.end || "23:59",
          };
        }),
      );

      try {
        await apiRequest("POST", `/api/availability/${user.id}`, { windows });
      } catch (availError) {
        console.error("Failed to save availability:", availError);
        Alert.alert("Warning", "Profile created but schedule could not be saved. You can set it later.");
      }

      setProfile(createdProfile);
    } catch (error: any) {
      const msg = error?.message || "Something went wrong";
      Alert.alert("Error", `Failed to create profile: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <ThemedText type="h2" style={styles.stepTitle}>
              Create Your Profile
            </ThemedText>
            <ThemedText style={styles.stepSubtitle}>
              Tell us about yourself so teammates can find you
            </ThemedText>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Nickname *</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Your gaming name"
                placeholderTextColor={theme.textSecondary}
                value={nickname}
                onChangeText={setNickname}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Region *</ThemedText>
              <View style={styles.chipGrid}>
                {REGIONS.map((r) => (
                  <SelectableChip
                    key={r.id}
                    label={r.label}
                    selected={region === r.id}
                    onPress={() => setRegion(r.id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Languages</ThemedText>
              <View style={styles.chipGrid}>
                {LANGUAGES.slice(0, 6).map((lang) => (
                  <SelectableChip
                    key={lang.id}
                    label={lang.label}
                    selected={selectedLanguages.includes(lang.id)}
                    onPress={() => toggleLanguage(lang.id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabel}>
                  <Feather name="mic" size={20} color={theme.text} />
                  <ThemedText style={styles.label}>Microphone</ThemedText>
                </View>
                <Pressable
                  onPress={() => setMicEnabled(!micEnabled)}
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: micEnabled
                        ? theme.success
                        : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      { transform: [{ translateX: micEnabled ? 20 : 0 }] },
                    ]}
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>
                Discord Tag (optional)
              </ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="username#1234"
                placeholderTextColor={theme.textSecondary}
                value={discordTag}
                onChangeText={setDiscordTag}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Bio (optional)</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.text }]}
                placeholder="Tell others about your gaming style..."
                placeholderTextColor={theme.textSecondary}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <ThemedText type="h2" style={styles.stepTitle}>
              Select Your Games
            </ThemedText>
            <ThemedText style={styles.stepSubtitle}>
              Choose the games you want to find teammates for
            </ThemedText>

            <View style={styles.gamesGrid}>
              {GAMES.map((game) => {
                const isSelected = selectedGames.includes(game.id);
                const gameColor = GameColors[game.id] || theme.primary;
                return (
                  <Pressable
                    key={game.id}
                    onPress={() => toggleGame(game.id)}
                    style={[
                      styles.gameCard,
                      {
                        backgroundColor: isSelected
                          ? gameColor
                          : theme.backgroundSecondary,
                        borderColor: gameColor,
                      },
                    ]}
                  >
                    <Feather
                      name={
                        game.id === "valorant"
                          ? "crosshair"
                          : game.id === "cs2"
                            ? "target"
                            : game.id === "dota2"
                              ? "shield"
                              : game.id === "fortnite"
                                ? "box"
                                : "award"
                      }
                      size={32}
                      color={isSelected ? "#FFFFFF" : gameColor}
                    />
                    <ThemedText
                      style={[
                        styles.gameCardText,
                        { color: isSelected ? "#FFFFFF" : theme.text },
                      ]}
                    >
                      {game.name}
                    </ThemedText>
                    {isSelected ? (
                      <View style={styles.checkMark}>
                        <Feather name="check" size={16} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {selectedGames.length > 0 ? (
              <>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Playstyle</ThemedText>
                  <View style={styles.chipGrid}>
                    {PLAYSTYLES.map((ps) => (
                      <SelectableChip
                        key={ps.id}
                        label={ps.label}
                        selected={playstyle === ps.id}
                        onPress={() => setPlaystyle(ps.id)}
                        icon={ps.icon as any}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Platform</ThemedText>
                  <View style={styles.chipGrid}>
                    {PLATFORMS.map((p) => (
                      <SelectableChip
                        key={p.id}
                        label={p.label}
                        selected={platform === p.id}
                        onPress={() => setPlatform(p.id)}
                      />
                    ))}
                  </View>
                </View>
              </>
            ) : null}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <ThemedText type="h2" style={styles.stepTitle}>
              Set Your Schedule
            </ThemedText>
            <ThemedText style={styles.stepSubtitle}>
              When are you usually available to play?
            </ThemedText>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Days Available</ThemedText>
              <View style={styles.daysRow}>
                {DAYS_OF_WEEK.map((day) => (
                  <Pressable
                    key={day.id}
                    onPress={() => toggleDay(day.id)}
                    style={[
                      styles.dayButton,
                      {
                        backgroundColor: selectedDays.includes(day.id)
                          ? theme.primary
                          : theme.backgroundSecondary,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.dayText,
                        {
                          color: selectedDays.includes(day.id)
                            ? "#FFFFFF"
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {day.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Time Slots</ThemedText>
              <View style={styles.timeSlotsGrid}>
                {TIME_SLOTS.map((slot) => (
                  <Pressable
                    key={slot.id}
                    onPress={() => toggleTimeSlot(slot.id)}
                    style={[
                      styles.timeSlotCard,
                      {
                        backgroundColor: selectedTimeSlots.includes(slot.id)
                          ? theme.primary
                          : theme.backgroundSecondary,
                        borderColor: selectedTimeSlots.includes(slot.id)
                          ? theme.primary
                          : theme.border,
                      },
                    ]}
                  >
                    <Feather
                      name={
                        slot.id === "morning"
                          ? "sunrise"
                          : slot.id === "afternoon"
                            ? "sun"
                            : slot.id === "evening"
                              ? "sunset"
                              : "moon"
                      }
                      size={24}
                      color={
                        selectedTimeSlots.includes(slot.id)
                          ? "#FFFFFF"
                          : theme.textSecondary
                      }
                    />
                    <ThemedText
                      style={{
                        color: selectedTimeSlots.includes(slot.id)
                          ? "#FFFFFF"
                          : theme.text,
                        fontWeight: "600",
                      }}
                    >
                      {slot.label}
                    </ThemedText>
                    <ThemedText
                      style={{
                        fontSize: 12,
                        color: selectedTimeSlots.includes(slot.id)
                          ? "rgba(255,255,255,0.8)"
                          : theme.textSecondary,
                      }}
                    >
                      {slot.start} - {slot.end}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={[styles.stepContent, styles.finishStep]}>
            <View style={styles.finishIcon}>
              <Feather name="check-circle" size={80} color={theme.success} />
            </View>
            <ThemedText type="h2" style={styles.stepTitle}>
              You&apos;re All Set!
            </ThemedText>
            <ThemedText style={[styles.stepSubtitle, { textAlign: "center" }]}>
              Start swiping to find your perfect gaming teammates. Good luck and
              have fun!
            </ThemedText>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.progressContainer}>
          {STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    index <= step ? theme.primary : theme.backgroundSecondary,
                },
              ]}
            />
          ))}
        </View>
        <ThemedText style={styles.stepIndicator}>
          Step {step + 1} of {STEPS.length}
        </ThemedText>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {renderStep()}
      </KeyboardAwareScrollViewCompat>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}
      >
        {step > 0 ? (
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Feather name="arrow-left" size={20} color={theme.text} />
            <ThemedText style={styles.backText}>Back</ThemedText>
          </Pressable>
        ) : (
          <View />
        )}
        <Button
          onPress={handleNext}
          disabled={!canProceed() || loading}
          style={styles.nextButton}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : step === STEPS.length - 1 ? (
            "Start Matching"
          ) : (
            "Continue"
          )}
        </Button>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: "center",
  },
  progressContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  progressDot: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  stepIndicator: {
    fontSize: 14,
    color: "#A0A8B8",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  stepContent: {
    gap: Spacing.xl,
  },
  stepTitle: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  stepSubtitle: {
    color: "#A0A8B8",
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  formGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#1A1F2E",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#2A3040",
    paddingHorizontal: Spacing.lg,
    height: 52,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  gamesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    justifyContent: "center",
  },
  gameCard: {
    width: "45%",
    aspectRatio: 1.2,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    position: "relative",
  },
  gameCardText: {
    fontSize: 14,
    fontWeight: "600",
  },
  checkMark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 12,
    fontWeight: "600",
  },
  timeSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  timeSlotCard: {
    width: "47%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  finishStep: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing["5xl"],
  },
  finishIcon: {
    marginBottom: Spacing.xl,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#2A3040",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  backText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  nextButton: {
    paddingHorizontal: Spacing["3xl"],
  },
});
