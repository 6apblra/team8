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
import { Colors, Spacing, BorderRadius, GameColors } from "@/constants/theme";
import { GAMES, REGIONS, LANGUAGES, PLAYSTYLES } from "@/lib/game-data";

export const FILTERS_KEY = "@teamup_filters";

export interface SavedFilters {
  games: string[];
  regions: string[];
  languages: string[];
  micRequired: boolean;
  playstyles: string[];
}

export default function FiltersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const theme = Colors.dark;

  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [micRequired, setMicRequired] = useState(false);
  const [selectedPlaystyles, setSelectedPlaystyles] = useState<string[]>([]);
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
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleRegion = (id: string) => {
    setSelectedRegions((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const toggleLanguage = (id: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const togglePlaystyle = (id: string) => {
    setSelectedPlaystyles((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleApply = async () => {
    const filters = {
      games: selectedGames,
      regions: selectedRegions,
      languages: selectedLanguages,
      micRequired,
      playstyles: selectedPlaystyles,
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
  };

  const hasFilters =
    selectedGames.length > 0 ||
    selectedRegions.length > 0 ||
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
          <ThemedText type="h4" style={styles.sectionTitle}>
            Games
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
                      backgroundColor: isSelected ? gameColor : theme.backgroundSecondary,
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
          <ThemedText type="h4" style={styles.sectionTitle}>
            Region
          </ThemedText>
          <View style={styles.chipGrid}>
            {REGIONS.map((region) => (
              <SelectableChip
                key={region.id}
                label={region.label}
                selected={selectedRegions.includes(region.id)}
                onPress={() => toggleRegion(region.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Languages
          </ThemedText>
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

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Playstyle
          </ThemedText>
          <View style={styles.chipGrid}>
            {PLAYSTYLES.map((ps) => (
              <SelectableChip
                key={ps.id}
                label={ps.label}
                selected={selectedPlaystyles.includes(ps.id)}
                onPress={() => togglePlaystyle(ps.id)}
                icon={ps.icon as any}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Feather name="mic" size={20} color={theme.text} />
              <ThemedText style={styles.toggleText}>Microphone Required</ThemedText>
            </View>
            <Pressable
              onPress={() => setMicRequired(!micRequired)}
              style={[
                styles.toggle,
                { backgroundColor: micRequired ? theme.success : theme.backgroundSecondary },
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
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {hasFilters ? (
          <Pressable onPress={handleReset} style={styles.resetButton}>
            <Feather name="x" size={18} color={theme.textSecondary} />
            <ThemedText style={styles.resetText}>Reset</ThemedText>
          </Pressable>
        ) : (
          <View />
        )}
        <Button onPress={handleApply} style={styles.applyButton}>
          Apply Filters
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
    color: "#FFFFFF",
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
    backgroundColor: "#1A1F2E",
    borderRadius: BorderRadius.md,
  },
  toggleLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  toggleText: {
    fontSize: 16,
    color: "#FFFFFF",
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
    backgroundColor: "#0A0E1A",
    borderTopWidth: 1,
    borderTopColor: "#2A3040",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  resetText: {
    fontSize: 16,
    color: "#A0A8B8",
  },
  applyButton: {
    paddingHorizontal: Spacing["3xl"],
  },
});
