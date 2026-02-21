import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  interpolateColor,
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
import { GAMES, RANKS, ROLES, PLAYSTYLES, PLATFORMS } from "@/lib/game-data";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface UserGame {
  id?: string;
  userId?: string;
  gameId: string;
  rank?: string | null;
  roles?: string[];
  playstyle?: string | null;
  platform?: string | null;
  isPrimary?: boolean;
}

const GAME_ICONS: Record<string, string> = {
  valorant: "crosshair",
  cs2: "target",
  dota2: "shield",
  fortnite: "box",
  lol: "award",
  wot: "menu",
  apex: "triangle",
};

// ─── Animated game card ───────────────────────────────────────────────────────

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
        size={32}
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

// ─── Expandable game detail card ──────────────────────────────────────────────

function GameDetailCard({
  gameId,
  gameColor,
  gameName,
  gameIcon,
  rank,
  roles,
  isExpanded,
  onToggle,
  ranks,
  rolesList,
  onRankChange,
  onRoleToggle,
  theme,
  t,
}: {
  gameId: string;
  gameColor: string;
  gameName: string;
  gameIcon: string;
  rank?: string;
  roles: string[];
  isExpanded: boolean;
  onToggle: () => void;
  ranks: string[];
  rolesList: string[];
  onRankChange: (rank: string) => void;
  onRoleToggle: (role: string) => void;
  theme: any;
  t: any;
}) {
  const chevronRotate = useSharedValue(isExpanded ? 1 : 0);
  const contentHeight = useSharedValue(isExpanded ? 1 : 0);

  useEffect(() => {
    chevronRotate.value = withTiming(isExpanded ? 1 : 0, { duration: 250 });
    contentHeight.value = withTiming(isExpanded ? 1 : 0, { duration: 250 });
  }, [isExpanded]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(chevronRotate.value, [0, 1], [0, 180])}deg` }],
  }));

  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        pressStyle,
        gdStyles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: isExpanded ? gameColor : theme.border,
          shadowColor: isExpanded ? gameColor : "transparent",
          shadowOpacity: isExpanded ? 0.2 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: isExpanded ? 4 : 0,
        },
      ]}
    >
      <AnimatedPressable
        onPress={onToggle}
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        style={[gdStyles.header, { borderLeftColor: gameColor }]}
      >
        <View style={[gdStyles.iconBg, { backgroundColor: `${gameColor}20` }]}>
          <Feather name={gameIcon as any} size={20} color={gameColor} />
        </View>
        <ThemedText style={[gdStyles.name, { color: theme.text }]}>{gameName}</ThemedText>
        <View style={gdStyles.meta}>
          {rank && (
            <View style={[gdStyles.rankBadge, { backgroundColor: `${gameColor}20` }]}>
              <ThemedText style={{ fontSize: 11, fontWeight: "700", color: gameColor }}>
                {rank}
              </ThemedText>
            </View>
          )}
          <Animated.View style={chevronStyle}>
            <Feather name="chevron-down" size={20} color={theme.textSecondary} />
          </Animated.View>
        </View>
      </AnimatedPressable>

      {isExpanded && (
        <View style={gdStyles.content}>
          {ranks.length > 0 && (
            <View style={gdStyles.group}>
              <ThemedText style={[gdStyles.label, { color: theme.textSecondary }]}>
                {t("editGames.rank")}
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: Spacing.sm, paddingRight: Spacing.md }}
              >
                {ranks.map((r) => (
                  <SelectableChip
                    key={r}
                    label={r}
                    selected={rank === r}
                    onPress={() => onRankChange(r)}
                  />
                ))}
              </ScrollView>
            </View>
          )}
          {rolesList.length > 0 && (
            <View style={gdStyles.group}>
              <ThemedText style={[gdStyles.label, { color: theme.textSecondary }]}>
                {t("editGames.rolesMultiple")}
              </ThemedText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }}>
                {rolesList.map((role) => (
                  <SelectableChip
                    key={role}
                    label={role}
                    selected={roles.includes(role)}
                    onPress={() => onRoleToggle(role)}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const gdStyles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
    borderLeftWidth: 3,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { flex: 1, fontSize: 16, fontWeight: "600" },
  meta: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  rankBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.lg },
  group: { gap: Spacing.sm },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
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

  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [gameRanks, setGameRanks] = useState<Record<string, string>>({});
  const [gameRoles, setGameRoles] = useState<Record<string, string[]>>({});
  const [playstyle, setPlaystyle] = useState("competitive");
  const [platform, setPlatform] = useState("pc");
  const [expandedGame, setExpandedGame] = useState<string | null>(null);

  const { data: currentGames, isLoading } = useQuery<UserGame[]>({
    queryKey: ["/api/user-games", user?.id],
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (currentGames && currentGames.length > 0) {
      const gameIds = currentGames.map((g) => g.gameId);
      setSelectedGames(gameIds);
      const ranks: Record<string, string> = {};
      const roles: Record<string, string[]> = {};
      currentGames.forEach((g) => {
        if (g.rank) ranks[g.gameId] = g.rank;
        if (g.roles) roles[g.gameId] = g.roles;
        if (g.playstyle) setPlaystyle(g.playstyle);
        if (g.platform) setPlatform(g.platform);
      });
      setGameRanks(ranks);
      setGameRoles(roles);
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

  const toggleGame = (gameId: string) => {
    setSelectedGames((prev) =>
      prev.includes(gameId) ? prev.filter((g) => g !== gameId) : [...prev, gameId],
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleRole = (gameId: string, role: string) => {
    setGameRoles((prev) => {
      const current = prev[gameId] || [];
      return {
        ...prev,
        [gameId]: current.includes(role)
          ? current.filter((r) => r !== role)
          : [...current, role],
      };
    });
  };

  const handleSave = () => {
    if (selectedGames.length === 0) {
      Alert.alert(t("common.error"), t("editGames.selectAtLeastOne"));
      return;
    }
    const gamesData = selectedGames.map((gameId, index) => ({
      gameId,
      rank: gameRanks[gameId] || null,
      roles: gameRoles[gameId] || [],
      playstyle,
      platform,
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

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + 100,
          },
        ]}
      >
        {/* Section header */}
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

        {selectedGames.length > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: `${theme.border}60` }]} />

            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: theme.secondary }]} />
              <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
                {t("editGames.gameDetails")}
              </ThemedText>
            </View>
            <ThemedText style={[styles.sectionSub, { color: theme.textSecondary }]}>
              {t("editGames.gameDetailsSubtitle")}
            </ThemedText>

            {selectedGames.map((gameId) => {
              const game = GAMES.find((g) => g.id === gameId);
              const gameColor = GameColors[gameId] || theme.primary;
              return (
                <GameDetailCard
                  key={gameId}
                  gameId={gameId}
                  gameColor={gameColor}
                  gameName={game?.name || gameId}
                  gameIcon={GAME_ICONS[gameId] || "award"}
                  rank={gameRanks[gameId]}
                  roles={gameRoles[gameId] || []}
                  isExpanded={expandedGame === gameId}
                  onToggle={() => setExpandedGame(expandedGame === gameId ? null : gameId)}
                  ranks={RANKS[gameId as keyof typeof RANKS] || []}
                  rolesList={ROLES[gameId as keyof typeof ROLES] || []}
                  onRankChange={(rank) =>
                    setGameRanks((prev) => ({ ...prev, [gameId]: rank }))
                  }
                  onRoleToggle={(role) => toggleRole(gameId, role)}
                  theme={theme}
                  t={t}
                />
              );
            })}

            <View style={[styles.divider, { backgroundColor: `${theme.border}60` }]} />

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
                {t("editGames.playstyle")}
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
                {t("editGames.platform")}
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
      </ScrollView>

      {/* Footer */}
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
        <Pressable onPress={handleSave} disabled={updateMutation.isPending} style={styles.saveBtn}>
          <LinearGradient
            colors={
              updateMutation.isPending
                ? [`${theme.primary}50`, `${theme.primary}35`]
                : [theme.primary, `${theme.primary}BB`]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveGradient}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check" size={18} color="#FFFFFF" />
                <ThemedText style={styles.saveBtnText}>{t("common.save")}</ThemedText>
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
  divider: { height: 1 },
  field: { gap: Spacing.sm },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: { width: "100%" },
  saveGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 52,
    borderRadius: BorderRadius.full,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
