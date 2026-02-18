import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { SelectableChip } from "@/components/SelectableChip";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, GameColors } from "@/constants/theme";
import { GAMES, REGIONS, LANGUAGES, PLAYSTYLES } from "@/lib/game-data";

export const FILTERS_KEY = "@teamup_filters";

export interface SavedFilters {
  games: string[];
  regions: string[];
  languages: string[];
  micRequired: boolean;
  playstyles: string[];
  availableNowOnly: boolean;
}

export default function FiltersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [micRequired, setMicRequired] = useState(false);
  const [selectedPlaystyles, setSelectedPlaystyles] = useState<string[]>([]);
  const [availableNowOnly, setAvailableNowOnly] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const stored = await AsyncStorage.getItem(FILTERS_KEY);
        if (stored) {
          const filters: SavedFilters = JSON.parse(stored);
          setSelectedGames(filters.games || []);
          setSelectedRegions(filters.regions || []);
          setSelectedLanguages(filters.languages || []);
          setMicRequired(filters.micRequired || false);
          setSelectedPlaystyles(filters.playstyles || []);
          setAvailableNowOnly(filters.availableNowOnly || false);
        }
      } catch (error) {
        console.error("Failed to load filters:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadFilters();
  }, []);

  const toggleGame = (id: string) => {
    setSelectedGames((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const toggleRegion = (id: string) => {
    setSelectedRegions((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const toggleLanguage = (id: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id],
    );
  };

  const togglePlaystyle = (id: string) => {
    setSelectedPlaystyles((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleApply = async () => {
    const filters = {
      games: selectedGames,
      regions: selectedRegions,
      languages: selectedLanguages,
      micRequired,
      playstyles: selectedPlaystyles,
      availableNowOnly,
    };
    await AsyncStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    navigation.goBack();
  };

  const handleReset = () => {
    setSelectedGames([]);
    setSelectedRegions([]);
    setSelectedLanguages([]);
    setMicRequired(false);
    setSelectedPlaystyles([]);
    setAvailableNowOnly(false);
  };

  const hasFilters =
    selectedGames.length > 0 ||
    selectedRegions.length > 0 ||
    availableNowOnly ||
    selectedLanguages.length > 0 ||
    micRequired ||
    selectedPlaystyles.length > 0;

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
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.section}>
          <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.text }]}>
            {t("filters.games")}
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
                    size={24}
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
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.text }]}>
            {t("filters.region")}
          </ThemedText>
          <View style={styles.chipGrid}>
            {REGIONS.map((region) => (
              <SelectableChip
                key={region.id}
                label={t(`gameData.regions.${region.id}`)}
                selected={selectedRegions.includes(region.id)}
                onPress={() => toggleRegion(region.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.text }]}>
            {t("filters.languages")}
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

        <View style={styles.section}>
          <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.text }]}>
            {t("filters.playstyle")}
          </ThemedText>
          <View style={styles.chipGrid}>
            {PLAYSTYLES.map((ps) => (
              <SelectableChip
                key={ps.id}
                label={t(`gameData.playstyles.${ps.id}`)}
                selected={selectedPlaystyles.includes(ps.id)}
                onPress={() => togglePlaystyle(ps.id)}
                icon={ps.icon as any}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.toggleRow, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }]}>
            <View style={styles.toggleLabel}>
              <Feather name="mic" size={20} color={theme.text} />
              <ThemedText style={[styles.toggleText, { color: theme.text }]}>
                {t("filters.micRequired")}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => setMicRequired(!micRequired)}
              style={[
                styles.toggle,
                {
                  backgroundColor: micRequired
                    ? theme.success
                    : theme.backgroundTertiary,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  { transform: [{ translateX: micRequired ? 20 : 0 }] },
                ]}
              />
            </Pressable>
          </View>

          <View style={[styles.toggleRow, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }]}>
            <View style={styles.toggleLabel}>
              <Feather
                name="zap"
                size={20}
                color={availableNowOnly ? theme.secondary : theme.text}
              />
              <View style={styles.toggleLabelContent}>
                <ThemedText style={[styles.toggleText, { color: theme.text }]}>
                  {t("filters.availableNowOnly")}
                </ThemedText>
                <ThemedText style={[styles.toggleSubtext, { color: theme.textSecondary }]}>
                  {t("filters.availableNowSubtext")}
                </ThemedText>
              </View>
            </View>
            <Pressable
              onPress={() => setAvailableNowOnly(!availableNowOnly)}
              style={[
                styles.toggle,
                {
                  backgroundColor: availableNowOnly
                    ? theme.secondary
                    : theme.backgroundTertiary,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  { transform: [{ translateX: availableNowOnly ? 20 : 0 }] },
                ]}
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: theme.backgroundRoot, borderTopColor: theme.border }]}
      >
        {hasFilters ? (
          <Pressable onPress={handleReset} style={styles.resetButton}>
            <Feather name="x" size={18} color={theme.textSecondary} />
            <ThemedText style={[styles.resetText, { color: theme.textSecondary }]}>{t("common.reset")}</ThemedText>
          </Pressable>
        ) : (
          <View />
        )}
        <Button onPress={handleApply} style={styles.applyButton}>
          {t("filters.applyFilters")}
        </Button>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginLeft: 4,
  },
  gamesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  gameCardText: {
    fontSize: 14,
    fontWeight: "500",
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
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  toggleLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  toggleText: {
    fontSize: 16,
  },
  toggleLabelContent: {
    gap: 2,
  },
  toggleSubtext: {
    fontSize: 12,
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
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  resetText: {
    fontSize: 16,
  },
  applyButton: {
    paddingHorizontal: Spacing["3xl"],
  },
});
