import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  FlatList,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SelectableChip } from "@/components/SelectableChip";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, GameColors } from "@/constants/theme";
import { GAMES, RANKS, ROLES, CHARACTERS, PLAYSTYLES, PLATFORMS, GAME_ICONS } from "@/lib/game-data";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { width: SCREEN_W } = Dimensions.get("window");

interface UserGame {
  id?: string;
  userId?: string;
  gameId: string;
  rank?: string | null;
  roles?: string[];
  character?: string | null;
  playstyle?: string | null;
  platform?: string | null;
  isPrimary?: boolean;
}



// ─── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({
  total,
  current,
  color,
}: {
  total: number;
  current: number;
  color: string;
}) {
  return (
    <View style={stepStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            stepStyles.dot,
            {
              backgroundColor: i <= current ? color : `${color}30`,
              width: i === current ? 20 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 5, alignItems: "center" },
  dot: { height: 8, borderRadius: 4 },
});

// ─── Animated game card (step 0) ──────────────────────────────────────────────

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
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.95, { damping: 18, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 300 }); }}
      style={[
        animStyle,
        gcStyles.card,
        {
          backgroundColor: isSelected ? gameColor : theme.backgroundSecondary,
          borderColor: isSelected ? gameColor : `${gameColor}50`,
          shadowColor: isSelected ? gameColor : "transparent",
          shadowOpacity: isSelected ? 0.45 : 0,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 3 },
          elevation: isSelected ? 6 : 0,
        },
      ]}
    >
      <Feather
        name={(GAME_ICONS[game.id] || "award") as any}
        size={30}
        color={isSelected ? "#FFFFFF" : gameColor}
      />
      <ThemedText style={[gcStyles.name, { color: isSelected ? "#FFFFFF" : theme.text }]}>
        {game.name}
      </ThemedText>
      {isSelected && (
        <View style={gcStyles.check}>
          <Feather name="check" size={11} color="#FFFFFF" />
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Per-game detail step ──────────────────────────────────────────────────────

function GameDetailStep({
  gameId,
  gameColor,
  gameName,
  rank,
  roles,
  character,
  playstyle,
  platform,
  onRankChange,
  onRoleToggle,
  onCharacterChange,
  onPlaystyleChange,
  onPlatformChange,
  theme,
  t,
}: {
  gameId: string;
  gameColor: string;
  gameName: string;
  rank?: string | null;
  roles: string[];
  character?: string | null;
  playstyle?: string | null;
  platform?: string | null;
  onRankChange: (v: string | null) => void;
  onRoleToggle: (v: string) => void;
  onCharacterChange: (v: string | null) => void;
  onPlaystyleChange: (v: string) => void;
  onPlatformChange: (v: string) => void;
  theme: any;
  t: any;
}) {
  const rankList = RANKS[gameId as keyof typeof RANKS] || [];
  const rolesList = ROLES[gameId as keyof typeof ROLES] || [];
  const charList = CHARACTERS[gameId] || [];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[gdStepStyles.scroll, { paddingBottom: 120 }]}
    >
      {/* Game header */}
      <View style={[gdStepStyles.gameHeader, { backgroundColor: `${gameColor}15`, borderColor: `${gameColor}40` }]}>
        <View style={[gdStepStyles.iconBg, { backgroundColor: `${gameColor}25` }]}>
          <Feather name={(GAME_ICONS[gameId] || "award") as any} size={26} color={gameColor} />
        </View>
        <ThemedText style={[gdStepStyles.gameName, { color: theme.text }]}>{gameName}</ThemedText>
      </View>

      {/* Rank */}
      {rankList.length > 0 && (
        <View style={gdStepStyles.section}>
          <View style={gdStepStyles.sectionHeader}>
            <Feather name="trending-up" size={14} color={gameColor} />
            <ThemedText style={[gdStepStyles.sectionLabel, { color: theme.textSecondary }]}>
              {t("editGames.rank")}
            </ThemedText>
            {rank && (
              <Pressable onPress={() => onRankChange(null)}>
                <ThemedText style={{ fontSize: 11, color: theme.textSecondary, textDecorationLine: "underline" }}>
                  {t("common.reset")}
                </ThemedText>
              </Pressable>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing.sm, paddingRight: Spacing.lg }}
          >
            {rankList.map((r) => (
              <SelectableChip
                key={r}
                label={r}
                selected={rank === r}
                onPress={() => onRankChange(rank === r ? null : r)}
                color={gameColor}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Favourite character / agent */}
      {charList.length > 0 && (
        <View style={gdStepStyles.section}>
          <View style={gdStepStyles.sectionHeader}>
            <Feather name="user" size={14} color={gameColor} />
            <ThemedText style={[gdStepStyles.sectionLabel, { color: theme.textSecondary }]}>
              {t("editGames.character")}
            </ThemedText>
            {character && (
              <Pressable onPress={() => onCharacterChange(null)}>
                <ThemedText style={{ fontSize: 11, color: theme.textSecondary, textDecorationLine: "underline" }}>
                  {t("common.reset")}
                </ThemedText>
              </Pressable>
            )}
          </View>
          <View style={gdStepStyles.chipWrap}>
            {charList.map((c) => (
              <SelectableChip
                key={c}
                label={c}
                selected={character === c}
                onPress={() => onCharacterChange(character === c ? null : c)}
                color={gameColor}
              />
            ))}
          </View>
        </View>
      )}

      {/* Roles */}
      {rolesList.length > 0 && (
        <View style={gdStepStyles.section}>
          <View style={gdStepStyles.sectionHeader}>
            <Feather name="users" size={14} color={gameColor} />
            <ThemedText style={[gdStepStyles.sectionLabel, { color: theme.textSecondary }]}>
              {t("editGames.rolesMultiple")}
            </ThemedText>
          </View>
          <View style={gdStepStyles.chipWrap}>
            {rolesList.map((role) => (
              <SelectableChip
                key={role}
                label={role}
                selected={roles.includes(role)}
                onPress={() => onRoleToggle(role)}
                color={gameColor}
              />
            ))}
          </View>
        </View>
      )}

      {/* Playstyle */}
      <View style={gdStepStyles.section}>
        <View style={gdStepStyles.sectionHeader}>
          <Feather name="zap" size={14} color={gameColor} />
          <ThemedText style={[gdStepStyles.sectionLabel, { color: theme.textSecondary }]}>
            {t("editGames.playstyle")}
          </ThemedText>
        </View>
        <View style={gdStepStyles.chipWrap}>
          {PLAYSTYLES.map((ps) => (
            <SelectableChip
              key={ps.id}
              label={t(`gameData.playstyles.${ps.id}`)}
              selected={playstyle === ps.id}
              onPress={() => onPlaystyleChange(ps.id)}
              icon={ps.icon as any}
              color={gameColor}
            />
          ))}
        </View>
      </View>

      {/* Platform */}
      <View style={gdStepStyles.section}>
        <View style={gdStepStyles.sectionHeader}>
          <Feather name="monitor" size={14} color={gameColor} />
          <ThemedText style={[gdStepStyles.sectionLabel, { color: theme.textSecondary }]}>
            {t("editGames.platform")}
          </ThemedText>
        </View>
        <View style={gdStepStyles.chipWrap}>
          {PLATFORMS.map((p) => (
            <SelectableChip
              key={p.id}
              label={t(`gameData.platforms.${p.id}`)}
              selected={platform === p.id}
              onPress={() => onPlatformChange(p.id)}
              color={gameColor}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const gdStepStyles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.xl, gap: Spacing.xl, paddingTop: Spacing.md },
  gameHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gameName: { fontSize: 20, fontWeight: "700" },
  section: { gap: Spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  sectionLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EditGamesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // step: 0 = game selection, 1..N = per-game detail pages
  const [step, setStep] = useState(0);

  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [gameRanks, setGameRanks] = useState<Record<string, string | null>>({});
  const [gameRoles, setGameRoles] = useState<Record<string, string[]>>({});
  const [gameCharacters, setGameCharacters] = useState<Record<string, string | null>>({});
  const [gamePlaystyles, setGamePlaystyles] = useState<Record<string, string>>({});
  const [gamePlatforms, setGamePlatforms] = useState<Record<string, string>>({});

  // Page slide animation
  const slideX = useSharedValue(0);
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  const { data: currentGames, isLoading } = useQuery<UserGame[]>({
    queryKey: ["/api/user-games", user?.id],
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (currentGames && currentGames.length > 0) {
      const gameIds = currentGames.map((g) => g.gameId);
      setSelectedGames(gameIds);
      const ranks: Record<string, string | null> = {};
      const roles: Record<string, string[]> = {};
      const chars: Record<string, string | null> = {};
      const playstyles: Record<string, string> = {};
      const platforms: Record<string, string> = {};
      currentGames.forEach((g) => {
        ranks[g.gameId] = g.rank ?? null;
        roles[g.gameId] = g.roles ?? [];
        chars[g.gameId] = (g as any).character ?? null;
        if (g.playstyle) playstyles[g.gameId] = g.playstyle;
        if (g.platform) platforms[g.gameId] = g.platform;
      });
      setGameRanks(ranks);
      setGameRoles(roles);
      setGameCharacters(chars);
      setGamePlaystyles(playstyles);
      setGamePlatforms(platforms);
    }
  }, [currentGames]);

  const updateMutation = useMutation({
    mutationFn: async (games: Omit<UserGame, "id" | "userId">[]) => {
      return apiRequest("POST", "/api/user-games", { games });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/user-games"] });
      if (user?.id) queryClient.invalidateQueries({ queryKey: ["/api/user-games", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert(t("common.error"), t("editGames.failedUpdate"));
    },
  });

  const animateTo = (direction: "forward" | "back", callback: () => void) => {
    const out = direction === "forward" ? -SCREEN_W * 0.15 : SCREEN_W * 0.15;
    slideX.value = withTiming(out, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(callback)();
        slideX.value = direction === "forward" ? SCREEN_W * 0.15 : -SCREEN_W * 0.15;
        slideX.value = withSpring(0, { damping: 22, stiffness: 220 });
      }
    });
  };

  const goForward = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateTo("forward", () => setStep((s) => s + 1));
  };

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 0) {
      navigation.goBack();
    } else {
      animateTo("back", () => setStep((s) => s - 1));
    }
  };

  const toggleGame = (gameId: string) => {
    setSelectedGames((prev) =>
      prev.includes(gameId) ? prev.filter((g) => g !== gameId) : [...prev, gameId],
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    if (selectedGames.length === 0) {
      Alert.alert(t("common.error"), t("editGames.selectAtLeastOne"));
      return;
    }
    const gamesData = selectedGames.map((gameId, index) => ({
      gameId,
      rank: gameRanks[gameId] ?? null,
      roles: gameRoles[gameId] || [],
      character: gameCharacters[gameId] ?? null,
      playstyle: gamePlaystyles[gameId] || "competitive",
      platform: gamePlatforms[gameId] || "pc",
      isPrimary: index === 0,
    }));
    updateMutation.mutate(gamesData);
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  // Total steps: 0 (select games) + 1 per selected game
  const totalSteps = 1 + selectedGames.length;
  const currentGameId = step > 0 ? selectedGames[step - 1] : null;
  const currentGameColor = currentGameId ? (GameColors[currentGameId] || theme.primary) : theme.primary;
  const isLastStep = step === totalSteps - 1;

  const canProceed = step === 0 ? selectedGames.length > 0 : true;

  return (
    <ThemedView style={styles.container}>
      {/* Progress bar */}
      <View style={[styles.progressBar, { paddingTop: headerHeight + 8, backgroundColor: theme.backgroundRoot }]}>
        <StepIndicator
          total={totalSteps}
          current={step}
          color={currentGameId ? currentGameColor : theme.primary}
        />
      </View>

      {/* Content */}
      <Animated.View style={[{ flex: 1 }, slideStyle]}>
        {step === 0 ? (
          /* ── Step 0: game selection ── */
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingTop: Spacing.lg, paddingBottom: 120 },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: theme.primary }]} />
              <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                {t("editGames.selectYourGames")}
              </ThemedText>
            </View>
            <ThemedText style={[styles.sectionSub, { color: theme.textSecondary }]}>
              {t("editGames.selectGamesSubtitle")}
            </ThemedText>

            <View style={styles.gamesGrid}>
              {GAMES.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  isSelected={selectedGames.includes(game.id)}
                  onPress={() => toggleGame(game.id)}
                  gameColor={GameColors[game.id] || theme.primary}
                  theme={theme}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          /* ── Step 1..N: per-game detail ── */
          <GameDetailStep
            key={currentGameId!}
            gameId={currentGameId!}
            gameColor={currentGameColor}
            gameName={GAMES.find((g) => g.id === currentGameId)?.name || currentGameId!}
            rank={gameRanks[currentGameId!]}
            roles={gameRoles[currentGameId!] || []}
            character={gameCharacters[currentGameId!]}
            playstyle={gamePlaystyles[currentGameId!] || "competitive"}
            platform={gamePlatforms[currentGameId!] || "pc"}
            onRankChange={(v) => setGameRanks((p) => ({ ...p, [currentGameId!]: v }))}
            onRoleToggle={(role) =>
              setGameRoles((p) => {
                const cur = p[currentGameId!] || [];
                return {
                  ...p,
                  [currentGameId!]: cur.includes(role)
                    ? cur.filter((r) => r !== role)
                    : [...cur, role],
                };
              })
            }
            onCharacterChange={(v) => setGameCharacters((p) => ({ ...p, [currentGameId!]: v }))}
            onPlaystyleChange={(v) => setGamePlaystyles((p) => ({ ...p, [currentGameId!]: v }))}
            onPlatformChange={(v) => setGamePlatforms((p) => ({ ...p, [currentGameId!]: v }))}
            theme={theme}
            t={t}
          />
        )}
      </Animated.View>

      {/* Footer nav */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.sm,
            borderTopColor: `${theme.border}50`,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        {/* Back / skip row */}
        <View style={styles.footerRow}>
          <Pressable onPress={goBack} style={styles.backBtn} hitSlop={12}>
            <Feather name="chevron-left" size={20} color={theme.textSecondary} />
            <ThemedText style={{ color: theme.textSecondary, fontSize: 15 }}>
              {step === 0 ? t("common.cancel") : t("common.back")}
            </ThemedText>
          </Pressable>

          {/* Step counter */}
          {selectedGames.length > 0 && (
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
              {step === 0
                ? t("editGames.gamesSelected", { count: selectedGames.length })
                : `${step} / ${selectedGames.length}`}
            </ThemedText>
          )}

          {/* Next / Save */}
          {isLastStep ? (
            <Pressable
              onPress={handleSave}
              disabled={updateMutation.isPending || !canProceed}
              style={[styles.nextBtn, { backgroundColor: theme.primary, opacity: !canProceed ? 0.4 : 1 }]}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#fff" />
                  <ThemedText style={styles.nextBtnText}>{t("common.save")}</ThemedText>
                </>
              )}
            </Pressable>
          ) : (
            <Pressable
              onPress={goForward}
              disabled={!canProceed}
              style={[styles.nextBtn, { backgroundColor: currentGameColor, opacity: !canProceed ? 0.4 : 1 }]}
            >
              <ThemedText style={styles.nextBtnText}>{t("editGames.next")}</ThemedText>
              <Feather name="chevron-right" size={16} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressBar: {
    alignItems: "center",
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionDot: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700" },
  sectionSub: { fontSize: 14, marginTop: -Spacing.sm },
  gamesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  nextBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
