import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Game pill chip ───────────────────────────────────────────────────────────

const GAME_ICONS: Record<string, string> = {
  valorant: "crosshair",
  cs2: "target",
  dota2: "shield",
  fortnite: "box",
  lol: "award",
  wot: "menu",
  apex: "triangle",
};

function GamePill({
  game,
  isSelected,
  onPress,
  gameColor,
}: {
  game: { id: string; name: string };
  isSelected: boolean;
  onPress: () => void;
  gameColor: string;
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
        gpStyles.pill,
        {
          backgroundColor: isSelected ? gameColor : "transparent",
          borderColor: gameColor,
          shadowColor: isSelected ? gameColor : "transparent",
          shadowOpacity: isSelected ? 0.4 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: isSelected ? 4 : 0,
        },
      ]}
    >
      <Feather
        name={(GAME_ICONS[game.id] || "award") as any}
        size={16}
        color={isSelected ? "#FFFFFF" : gameColor}
      />
      <ThemedText
        style={[gpStyles.label, { color: isSelected ? "#FFFFFF" : gameColor, fontWeight: isSelected ? "700" : "500" }]}
      >
        {game.name}
      </ThemedText>
    </AnimatedPressable>
  );
}

const gpStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  label: { fontSize: 13 },
});

// ─── Animated toggle card ─────────────────────────────────────────────────────

function ToggleCard({
  icon,
  title,
  subtitle,
  value,
  onToggle,
  activeColor,
  theme,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onToggle: () => void;
  activeColor: string;
  theme: any;
}) {
  const knob = useSharedValue(value ? 20 : 0);
  const cardBg = useSharedValue(value ? 1 : 0);

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: knob.value }] }));
  const cardStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(cardBg.value, [0, 1], [theme.border, activeColor]),
    shadowOpacity: interpolate(cardBg.value, [0, 1], [0, 0.15]),
    shadowRadius: interpolate(cardBg.value, [0, 1], [0, 8]),
    shadowColor: activeColor,
    shadowOffset: { width: 0, height: 2 },
    elevation: interpolate(cardBg.value, [0, 1], [0, 3]),
  }));

  const handleToggle = () => {
    const newVal = !value;
    knob.value = withSpring(newVal ? 20 : 0, { damping: 15, stiffness: 250 });
    cardBg.value = withSpring(newVal ? 1 : 0);
    onToggle();
  };

  return (
    <Animated.View
      style={[
        tcStyles.card,
        { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
        cardStyle,
      ]}
    >
      <Pressable onPress={handleToggle} style={tcStyles.inner}>
        <View style={[tcStyles.iconBg, { backgroundColor: value ? `${activeColor}20` : `${theme.primary}12` }]}>
          <Feather name={icon as any} size={18} color={value ? activeColor : theme.textSecondary} />
        </View>
        <View style={tcStyles.labelBlock}>
          <ThemedText style={[tcStyles.title, { color: theme.text }]}>{title}</ThemedText>
          {subtitle && (
            <ThemedText style={[tcStyles.subtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </ThemedText>
          )}
        </View>
        <View
          style={[
            tcStyles.track,
            { backgroundColor: value ? activeColor : theme.backgroundTertiary, borderColor: value ? activeColor : theme.border },
          ]}
        >
          <Animated.View style={[tcStyles.knob, knobStyle]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const tcStyles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  labelBlock: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "600" },
  subtitle: { fontSize: 12 },
  track: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    borderWidth: 1,
    justifyContent: "center",
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
});

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label, theme }: { label: string; theme: any }) {
  return (
    <View style={shStyles.row}>
      <View style={[shStyles.bar, { backgroundColor: theme.primary }]} />
      <ThemedText style={[shStyles.text, { color: theme.text }]}>{label}</ThemedText>
    </View>
  );
}

const shStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  bar: { width: 3, height: 18, borderRadius: 2 },
  text: { fontSize: 18, fontWeight: "700" },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

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

  useEffect(() => {
    AsyncStorage.getItem(FILTERS_KEY).then((stored) => {
      if (stored) {
        const f: SavedFilters = JSON.parse(stored);
        setSelectedGames(f.games || []);
        setSelectedRegions(f.regions || []);
        setSelectedLanguages(f.languages || []);
        setMicRequired(f.micRequired || false);
        setSelectedPlaystyles(f.playstyles || []);
        setAvailableNowOnly(f.availableNowOnly || false);
      }
    });
  }, []);

  const toggle = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, id: T) =>
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const hasFilters =
    selectedGames.length > 0 ||
    selectedRegions.length > 0 ||
    availableNowOnly ||
    selectedLanguages.length > 0 ||
    micRequired ||
    selectedPlaystyles.length > 0;

  const handleApply = async () => {
    await AsyncStorage.setItem(
      FILTERS_KEY,
      JSON.stringify({
        games: selectedGames,
        regions: selectedRegions,
        languages: selectedLanguages,
        micRequired,
        playstyles: selectedPlaystyles,
        availableNowOnly,
      }),
    );
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

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Games */}
        <View style={styles.section}>
          <SectionHeader label={t("filters.games")} theme={theme} />
          <View style={styles.pillsRow}>
            {GAMES.map((game) => (
              <GamePill
                key={game.id}
                game={game}
                isSelected={selectedGames.includes(game.id)}
                onPress={() => toggle(setSelectedGames, game.id)}
                gameColor={GameColors[game.id] || theme.primary}
              />
            ))}
          </View>
        </View>

        {/* Region */}
        <View style={styles.section}>
          <SectionHeader label={t("filters.region")} theme={theme} />
          <View style={styles.chipGrid}>
            {REGIONS.map((r) => (
              <SelectableChip
                key={r.id}
                label={t(`gameData.regions.${r.id}`)}
                selected={selectedRegions.includes(r.id)}
                onPress={() => toggle(setSelectedRegions, r.id)}
              />
            ))}
          </View>
        </View>

        {/* Languages */}
        <View style={styles.section}>
          <SectionHeader label={t("filters.languages")} theme={theme} />
          <View style={styles.chipGrid}>
            {LANGUAGES.slice(0, 6).map((lang) => (
              <SelectableChip
                key={lang.id}
                label={t(`gameData.languages.${lang.id}`)}
                selected={selectedLanguages.includes(lang.id)}
                onPress={() => toggle(setSelectedLanguages, lang.id)}
              />
            ))}
          </View>
        </View>

        {/* Playstyle */}
        <View style={styles.section}>
          <SectionHeader label={t("filters.playstyle")} theme={theme} />
          <View style={styles.chipGrid}>
            {PLAYSTYLES.map((ps) => (
              <SelectableChip
                key={ps.id}
                label={t(`gameData.playstyles.${ps.id}`)}
                selected={selectedPlaystyles.includes(ps.id)}
                onPress={() => toggle(setSelectedPlaystyles, ps.id)}
                icon={ps.icon as any}
              />
            ))}
          </View>
        </View>

        {/* Toggles */}
        <View style={styles.section}>
          <SectionHeader label={t("settings.feedback")} theme={theme} />
          <ToggleCard
            icon="mic"
            title={t("filters.micRequired")}
            value={micRequired}
            onToggle={() => setMicRequired(!micRequired)}
            activeColor={theme.success}
            theme={theme}
          />
          <ToggleCard
            icon="zap"
            title={t("filters.availableNowOnly")}
            subtitle={t("filters.availableNowSubtext")}
            value={availableNowOnly}
            onToggle={() => setAvailableNowOnly(!availableNowOnly)}
            activeColor={theme.secondary}
            theme={theme}
          />
        </View>
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
        {hasFilters ? (
          <Pressable onPress={handleReset} style={styles.resetBtn}>
            <View style={[styles.resetIconBg, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="x" size={16} color={theme.textSecondary} />
            </View>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 15, fontWeight: "600" }}>
              {t("common.reset")}
            </ThemedText>
          </Pressable>
        ) : (
          <View style={{ width: 80 }} />
        )}

        <Pressable onPress={handleApply} style={styles.applyBtn}>
          <LinearGradient
            colors={[theme.primary, `${theme.primary}BB`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.applyGradient}
          >
            <Feather name="sliders" size={16} color="#FFFFFF" />
            <ThemedText style={styles.applyText}>{t("filters.applyFilters")}</ThemedText>
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
    gap: Spacing.xl,
  },
  section: { gap: Spacing.md },
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  resetIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtn: {},
  applyGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
  },
  applyText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
