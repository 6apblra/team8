import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
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
import { Button } from "@/components/Button";
import { SelectableChip } from "@/components/SelectableChip";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, GameColors } from "@/constants/theme";
import { GAMES, RANKS, ROLES, PLAYSTYLES, PLATFORMS } from "@/lib/game-data";

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

export default function EditGamesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();
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
      // Server expects POST /api/user-games (userId taken from session/token)
      return apiRequest("POST", "/user-games", { games });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/user-games"] });
      // Invalidate specific user query to be sure
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: ["/api/user-games", user.id],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });

      // Automatically close screen on success for better UX
      navigation.goBack();
    },
    onError: (error) => {
      console.error("Update games error:", error);
      Alert.alert("Error", "Failed to update games. Please try again.");
    },
  });

  const toggleGame = (gameId: string) => {
    setSelectedGames((prev) =>
      prev.includes(gameId)
        ? prev.filter((g) => g !== gameId)
        : [...prev, gameId],
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleRole = (gameId: string, role: string) => {
    setGameRoles((prev) => {
      const current = prev[gameId] || [];
      const updated = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role];
      return { ...prev, [gameId]: updated };
    });
  };

  const handleSave = () => {
    console.log("Save button pressed");
    console.log("Selected games:", selectedGames);
    if (selectedGames.length === 0) {
      Alert.alert("Error", "Please select at least one game");
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
    console.log("Sending games data:", JSON.stringify(gamesData, null, 2));

    updateMutation.mutate(gamesData);
  };

  const getGameIcon = (gameId: string) => {
    switch (gameId) {
      case "valorant":
        return "crosshair";
      case "cs2":
        return "target";
      case "dota2":
        return "shield";
      case "fortnite":
        return "box";
      case "lol":
        return "award"; // League of Legends
      case "wot":
        return "menu"; // World of Tanks (using menu/list as approximation or shield)
      case "apex":
        return "triangle"; // Apex Legends
      default:
        return "award";
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
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
            paddingBottom: insets.bottom + Spacing.xl + 80,
          },
        ]}
      >
        <ThemedText style={styles.sectionTitle}>Select Your Games</ThemedText>
        <ThemedText style={styles.sectionSubtitle}>
          Choose games you want to find teammates for
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
                  name={getGameIcon(game.id) as any}
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
                {isSelected && (
                  <View style={styles.checkMark}>
                    <Feather name="check" size={16} color="#FFFFFF" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {selectedGames.length > 0 && (
          <>
            <View style={styles.divider} />

            <ThemedText style={styles.sectionTitle}>Game Details</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              Set your rank and roles for each game
            </ThemedText>

            {selectedGames.map((gameId) => {
              const game = GAMES.find((g) => g.id === gameId);
              const gameColor = GameColors[gameId] || theme.primary;
              const isExpanded = expandedGame === gameId;
              const ranks = RANKS[gameId as keyof typeof RANKS] || [];
              const roles = ROLES[gameId as keyof typeof ROLES] || [];

              return (
                <View key={gameId} style={styles.gameDetailCard}>
                  <Pressable
                    onPress={() => setExpandedGame(isExpanded ? null : gameId)}
                    style={[
                      styles.gameDetailHeader,
                      { borderLeftColor: gameColor },
                    ]}
                  >
                    <Feather
                      name={getGameIcon(gameId) as any}
                      size={24}
                      color={gameColor}
                    />
                    <ThemedText style={styles.gameDetailName}>
                      {game?.name}
                    </ThemedText>
                    <View style={styles.gameDetailMeta}>
                      {gameRanks[gameId] && (
                        <ThemedText style={styles.rankBadge}>
                          {gameRanks[gameId]}
                        </ThemedText>
                      )}
                      <Feather
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={theme.textSecondary}
                      />
                    </View>
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.gameDetailContent}>
                      <View style={styles.formGroup}>
                        <ThemedText style={styles.label}>Rank</ThemedText>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.horizontalChips}
                        >
                          {ranks.map((rank) => (
                            <SelectableChip
                              key={rank}
                              label={rank}
                              selected={gameRanks[gameId] === rank}
                              onPress={() =>
                                setGameRanks((prev) => ({
                                  ...prev,
                                  [gameId]: rank,
                                }))
                              }
                            />
                          ))}
                        </ScrollView>
                      </View>

                      <View style={styles.formGroup}>
                        <ThemedText style={styles.label}>
                          Roles (select multiple)
                        </ThemedText>
                        <View style={styles.chipGrid}>
                          {roles.map((role) => (
                            <SelectableChip
                              key={role}
                              label={role}
                              selected={(gameRoles[gameId] || []).includes(
                                role,
                              )}
                              onPress={() => toggleRole(gameId, role)}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.divider} />

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
        )}
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}
      >
        <Pressable
          onPress={() => {
            console.log("Direct onPress fired");
            handleSave();
          }}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: theme.primary,
              opacity: updateMutation.isPending ? 0.5 : pressed ? 0.8 : 1,
              height: 52,
              borderRadius: 26,
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText
              style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 16 }}
            >
              Save Changes
            </ThemedText>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#A0A8B8",
    marginTop: -Spacing.sm,
  },
  gamesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  gameCard: {
    width: "47%",
    aspectRatio: 1.3,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    padding: Spacing.md,
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
  divider: {
    height: 1,
    backgroundColor: "#2A3040",
    marginVertical: Spacing.md,
  },
  gameDetailCard: {
    backgroundColor: "#1A1F2E",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  gameDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
    borderLeftWidth: 4,
  },
  gameDetailName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  gameDetailMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  rankBadge: {
    fontSize: 12,
    color: "#A0A8B8",
    backgroundColor: "#2A3040",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  gameDetailContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.lg,
  },
  formGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  horizontalChips: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: "#0A0E1A",
    borderTopWidth: 1,
    borderTopColor: "#2A3040",
    zIndex: 9999, // Ensure it's on top
  },
  saveButton: {
    width: "100%",
  },
});
