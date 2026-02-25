import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Switch,
  Dimensions,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api-client";
import { useToast } from "@/lib/toast-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GameBadge } from "@/components/GameBadge";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius, GameColors } from "@/constants/theme";
import { PLAYSTYLES } from "@/lib/game-data";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: W } = Dimensions.get("window");
const BANNER_HEIGHT = 160;
const AVATAR_SIZE = 96;

const PLAYING_NOW_DURATIONS = [
  { label: "30m", minutes: 30 },
  { label: "1h",  minutes: 60 },
  { label: "1.5h", minutes: 90 },
  { label: "2h",  minutes: 120 },
  { label: "3h",  minutes: 180 },
];

interface UserGame {
  gameId: string;
  rank?: string | null;
  roles?: string[];
  playstyle?: string | null;
  platform?: string | null;
  isPrimary?: boolean;
}

interface ProfileData {
  profile: {
    nickname: string;
    avatarUrl?: string | null;
    age?: number | null;
    bio?: string | null;
    region: string;
    languages?: string[];
    micEnabled?: boolean;
    discordTag?: string | null;
    steamId?: string | null;
    riotId?: string | null;
    isAvailableNow?: boolean;
    availableUntil?: string | null;
  };
  userGames: UserGame[];
  availability: { dayOfWeek: number; startTime: string; endTime: string }[];
}

// ── Animated glow ring around avatar ───────────────────────────────────────
function AvatarGlow({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.14, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: 1800 }),
        withTiming(0.5, { duration: 1800 }),
      ),
      -1,
      true,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.avatarGlow,
        { backgroundColor: color },
        style,
      ]}
      pointerEvents="none"
    />
  );
}

// ── Live pulse dot ───────────────────────────────────────────────────────────
function PulseDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.8, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      true,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pulseDotWrap}>
      <Animated.View style={[styles.pulseDotRing, { backgroundColor: `${color}40` }, style]} />
      <View style={[styles.pulseDotCore, { backgroundColor: color }]} />
    </View>
  );
}

// ── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  title,
  color,
  action,
}: {
  title: string;
  color: string;
  action?: { label: string; onPress: () => void };
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionDot, { backgroundColor: color }]} />
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>{title}</ThemedText>
      </View>
      {action && (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => [styles.sectionAction, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="edit-2" size={13} color={color} />
          <ThemedText style={[styles.sectionActionText, { color }]}>{action.label}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

// ── Settings row ─────────────────────────────────────────────────────────────
function SettingRow({
  icon,
  iconBg,
  label,
  labelColor,
  onPress,
  last,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  label: string;
  labelColor?: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={[styles.settingIconWrap, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={16} color="#fff" />
        </View>
        <ThemedText style={[styles.settingLabel, { color: labelColor ?? theme.text }]}>
          {label}
        </ThemedText>
        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
      </Pressable>
      {!last && <View style={[styles.settingDivider, { backgroundColor: theme.border, marginLeft: 52 }]} />}
    </>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({
  icon,
  label,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={[styles.statChip, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
      <Feather name={icon} size={13} color={color} />
      <ThemedText style={[styles.statChipText, { color }]}>{label}</ThemedText>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile, logout } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isAvailableNow, setIsAvailableNow] = useState(false);
  const [availableUntil, setAvailableUntil] = useState<Date | null>(null);
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  // Staggered entrance
  const heroAnim = useSharedValue(0);
  const section1Anim = useSharedValue(0);
  const section2Anim = useSharedValue(0);
  const section3Anim = useSharedValue(0);

  useEffect(() => {
    heroAnim.value = withSpring(1, { damping: 20, stiffness: 80 });
    section1Anim.value = withDelay(120, withSpring(1, { damping: 20, stiffness: 80 }));
    section2Anim.value = withDelay(220, withSpring(1, { damping: 20, stiffness: 80 }));
    section3Anim.value = withDelay(320, withSpring(1, { damping: 20, stiffness: 80 }));
  }, []);

  const makeEntranceStyle = (anim: { value: number }) =>
    useAnimatedStyle(() => ({
      opacity: anim.value,
      transform: [{ translateY: (1 - anim.value) * 20 }],
    }));

  const heroStyle = makeEntranceStyle(heroAnim);
  const s1Style = makeEntranceStyle(section1Anim);
  const s2Style = makeEntranceStyle(section2Anim);
  const s3Style = makeEntranceStyle(section3Anim);

  const { data: profileData } = useQuery<ProfileData>({
    queryKey: ["/api/profile", user?.id],
    enabled: !!user?.id && !!profile,
  });

  const { data: reviewStats } = useQuery<{
    averageRating: number;
    totalReviews: number;
    tagCounts: Record<string, number>;
  }>({
    queryKey: ["reviewStats", user?.id],
    enabled: !!user?.id,
    queryFn: () => apiRequest("GET", `/api/reviews/stats/${user!.id}`),
  });

  useEffect(() => {
    if (profileData?.profile) {
      const { isAvailableNow: available, availableUntil: until } = profileData.profile;
      setIsAvailableNow(!!available);
      setAvailableUntil(until ? new Date(until) : null);
    }
  }, [profileData]);

  useEffect(() => {
    if (!isAvailableNow || !availableUntil) { setRemainingMinutes(null); return; }
    const update = () => {
      const diff = availableUntil.getTime() - Date.now();
      if (diff <= 0) { setIsAvailableNow(false); setAvailableUntil(null); setRemainingMinutes(null); }
      else setRemainingMinutes(Math.ceil(diff / 60000));
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [isAvailableNow, availableUntil]);

  const setAvailableMutation = useMutation({
    mutationFn: (mins: number) =>
      apiRequest<{ success: boolean; availableUntil: string }>("POST", "/api/available-now", { durationMinutes: mins }),
    onSuccess: (data) => {
      setIsAvailableNow(true);
      setAvailableUntil(new Date(data.availableUntil));
      setShowDurationPicker(false);
      queryClient.invalidateQueries({ queryKey: ["/api/profile", user?.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      setShowDurationPicker(false);
      showToast({
        type: "error",
        title: t("profile.playingNowErrorTitle"),
        body: t("profile.playingNowErrorBody"),
      });
    },
  });

  const clearAvailableMutation = useMutation({
    mutationFn: () => apiRequest<{ success: boolean }>("DELETE", "/api/available-now"),
    onSuccess: () => {
      setIsAvailableNow(false);
      setAvailableUntil(null);
      queryClient.invalidateQueries({ queryKey: ["/api/profile", user?.id] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onError: () => {
      showToast({
        type: "error",
        title: t("profile.playingNowErrorTitle"),
        body: t("profile.playingNowErrorBody"),
      });
    },
  });

  const handleLogout = () => {
    Alert.alert(t("profile.signOut"), t("profile.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("profile.signOut"), style: "destructive", onPress: logout },
    ]);
  };

  const displayProfile = profileData?.profile || profile;
  const userGames = profileData?.userGames || [];
  const avatarUrl = displayProfile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${user?.id}`;

  const regionLabel = displayProfile?.region
    ? t(`gameData.regions.${displayProfile.region}`)
    : displayProfile?.region;

  const languageLabels =
    displayProfile?.languages?.map((l: string) => t(`gameData.languages.${l}`)).join(", ") ||
    t("profile.notSet");

  const primaryGame = userGames.find((g) => g.isPrimary) ?? userGames[0];
  const bannerColor = primaryGame ? (GameColors[primaryGame.gameId] || theme.primary) : theme.primary;

  const playstyleKey = userGames.find((g) => g.playstyle)?.playstyle;
  const psData = PLAYSTYLES.find((p) => p.id === playstyleKey);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: headerHeight, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero banner ── */}
        <Animated.View style={heroStyle}>
          {/* Gradient banner */}
          <LinearGradient
            colors={[`${bannerColor}55`, `${bannerColor}22`, "transparent"]}
            style={[styles.banner, { height: BANNER_HEIGHT }]}
          />

          {/* Avatar area */}
          <View style={styles.avatarSection}>
            <Pressable onPress={() => navigation.navigate("EditProfile")} style={styles.avatarWrap}>
              <AvatarGlow color={bannerColor} />
              <View style={[styles.avatarRing, { borderColor: `${bannerColor}60` }]}>
                <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
              </View>
              {/* Edit badge */}
              <View style={[styles.editBadge, { backgroundColor: theme.primary, borderColor: theme.backgroundRoot }]}>
                <Feather name="camera" size={12} color="#fff" />
              </View>
            </Pressable>

            <View style={styles.nameBlock}>
              <View style={styles.nameRow}>
                <ThemedText style={[styles.nickname, { color: theme.text }]}>
                  {displayProfile?.nickname || "Player"}
                </ThemedText>
                {displayProfile?.age ? (
                  <ThemedText style={[styles.age, { color: theme.textSecondary }]}>
                    {displayProfile.age}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText style={[styles.email, { color: theme.textSecondary }]}>
                {user?.email}
              </ThemedText>
            </View>
          </View>

          {/* Stat chips */}
          <View style={styles.statsRow}>
            {regionLabel ? (
              <StatChip icon="map-pin" label={String(regionLabel)} color={theme.primary} />
            ) : null}
            {displayProfile?.micEnabled && (
              <StatChip icon="mic" label={t("profile.micOn")} color={theme.success} />
            )}
            {userGames.length > 0 && (
              <StatChip icon="monitor" label={`${userGames.length} games`} color={theme.secondary} />
            )}
            {isAvailableNow && (
              <StatChip icon="zap" label="Ready to Play" color={theme.success} />
            )}
          </View>

          {/* Bio */}
          {displayProfile?.bio ? (
            <View style={[styles.bioCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <Feather name="message-square" size={14} color={theme.textSecondary} style={{ marginTop: 2 }} />
              <ThemedText style={[styles.bioText, { color: theme.text }]}>
                {displayProfile.bio}
              </ThemedText>
            </View>
          ) : null}
        </Animated.View>

        <View style={styles.sections}>
          {/* ── Games ── */}
          <Animated.View style={[styles.section, s1Style]}>
            <SectionHeader
              title={t("profile.games")}
              color={theme.secondary}
              action={{ label: t("common.edit"), onPress: () => navigation.navigate("EditGames") }}
            />
            {psData && playstyleKey && (
              <View style={[styles.playstyleChip, { backgroundColor: `${theme.primary}12`, borderColor: `${theme.primary}30` }]}>
                <Feather name={psData.icon as any} size={14} color={theme.primary} />
                <ThemedText style={[styles.playstyleText, { color: theme.primary }]}>
                  {t(`gameData.playstyles.${playstyleKey}`)}
                </ThemedText>
              </View>
            )}
            {userGames.length > 0 ? (
              <View style={styles.gamesGrid}>
                {userGames.map((game, i) => (
                  <View
                    key={i}
                    style={[
                      styles.gameCard,
                      {
                        backgroundColor: theme.backgroundDefault,
                        borderColor: theme.border,
                        borderLeftColor: GameColors[game.gameId] || theme.primary,
                      },
                    ]}
                  >
                    <GameBadge
                      game={game.gameId}
                      rank={game.rank || undefined}
                      role={game.roles?.[0]}
                      size="medium"
                    />
                    {game.isPrimary && (
                      <View style={[styles.primaryBadge, { backgroundColor: `${theme.secondary}20` }]}>
                        <ThemedText style={[styles.primaryText, { color: theme.secondary }]}>main</ThemedText>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <Pressable
                onPress={() => navigation.navigate("EditGames")}
                style={[styles.addGamesBtn, { borderColor: theme.border }]}
              >
                <Feather name="plus-circle" size={22} color={theme.primary} />
                <ThemedText style={[styles.addGamesText, { color: theme.primary }]}>
                  {t("profile.addGames")}
                </ThemedText>
              </Pressable>
            )}
          </Animated.View>

          {/* ── Activity & Details ── */}
          <Animated.View style={[styles.section, s2Style]}>
            <SectionHeader title={t("profile.activityStatus")} color={isAvailableNow ? theme.success : theme.primary} />
            <View style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <View style={styles.availableRow}>
                <View style={styles.availableLeft}>
                  {isAvailableNow ? (
                    <PulseDot color={theme.success} />
                  ) : (
                    <View style={[styles.inactiveDot, { backgroundColor: theme.textSecondary }]} />
                  )}
                  <View style={styles.availableTexts}>
                    <ThemedText style={[styles.availableTitle, { color: theme.text }]}>
                      {t("profile.readyToPlay")}
                    </ThemedText>
                    <ThemedText style={[styles.availableDesc, { color: theme.textSecondary }]}>
                      {isAvailableNow ? t("profile.readyToPlayActive") : t("profile.readyToPlayInactive")}
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={isAvailableNow}
                  onValueChange={() => {
                    if (setAvailableMutation.isPending || clearAvailableMutation.isPending) return;
                    if (isAvailableNow) {
                      clearAvailableMutation.mutate();
                    } else {
                      setShowDurationPicker(true);
                    }
                  }}
                  disabled={setAvailableMutation.isPending || clearAvailableMutation.isPending}
                  trackColor={{ false: theme.backgroundSecondary, true: `${theme.success}80` }}
                  thumbColor={isAvailableNow ? theme.success : theme.textSecondary}
                />
              </View>
              {isAvailableNow && remainingMinutes !== null && (
                <View style={[styles.timerRow, { borderTopColor: theme.border }]}>
                  <Feather name="clock" size={13} color={theme.success} />
                  <ThemedText style={[styles.timerText, { color: theme.success }]}>
                    {remainingMinutes >= 60
                      ? t("profile.activeForHM", {
                          hours: String(Math.floor(remainingMinutes / 60)),
                          minutes: String(remainingMinutes % 60),
                        })
                      : t("profile.activeForM", { minutes: String(remainingMinutes) })}
                  </ThemedText>
                </View>
              )}
            </View>

            <SectionHeader title={t("profile.details")} color={theme.primary} />
            <View style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <View style={styles.detailRow}>
                <View style={[styles.detailIconWrap, { backgroundColor: `${theme.primary}20` }]}>
                  <Feather name="globe" size={15} color={theme.primary} />
                </View>
                <ThemedText style={[styles.detailLabel, { color: theme.text }]}>
                  {t("profile.languagesLabel")}
                </ThemedText>
                <ThemedText style={[styles.detailValue, { color: theme.textSecondary }]}>
                  {languageLabels}
                </ThemedText>
              </View>
              {displayProfile?.discordTag ? (
                <>
                  <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
                  <View style={styles.detailRow}>
                    <View style={[styles.detailIconWrap, { backgroundColor: "rgba(88,101,242,0.2)" }]}>
                      <Feather name="message-square" size={15} color="#5865F2" />
                    </View>
                    <ThemedText style={[styles.detailLabel, { color: theme.text }]}>
                      {t("profile.discord")}
                    </ThemedText>
                    <ThemedText style={[styles.detailValue, { color: "#5865F2" }]}>
                      {displayProfile.discordTag}
                    </ThemedText>
                  </View>
                </>
              ) : null}
            </View>
          </Animated.View>

          {/* ── Reviews ── */}
          {reviewStats && reviewStats.totalReviews > 0 && (
            <Animated.View style={[styles.section, s3Style]}>
              <SectionHeader title={t("reviews.title")} color={theme.warning} />
              <View style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.sm }}>
                  <Feather name="star" size={20} color="#FFB800" />
                  <ThemedText style={{ fontSize: 22, fontWeight: "700", color: theme.text }}>
                    {reviewStats.averageRating.toFixed(1)}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>
                    {t("reviews.title")} · {reviewStats.totalReviews}
                  </ThemedText>
                </View>
                {Object.entries(reviewStats.tagCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([tag, count]) => (
                    <View key={tag} style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginTop: 4 }}>
                      <Feather name="check-circle" size={14} color={theme.success} />
                      <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
                        {t(`reviews.tags_${tag}`)} · {count}
                      </ThemedText>
                    </View>
                  ))}
              </View>
            </Animated.View>
          )}

          {/* ── Settings ── */}
          <Animated.View style={[styles.section, s3Style]}>
            <SectionHeader title={t("profile.settingsSection")} color={theme.primary} />
            <View style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, padding: 0, overflow: "hidden" }]}>
              <SettingRow icon="edit" iconBg={theme.primary} label={t("profile.editProfile")} onPress={() => navigation.navigate("EditProfile")} />
              <SettingRow icon="sliders" iconBg={theme.secondary} label={t("profile.filters")} onPress={() => navigation.navigate("Filters")} />
              <SettingRow icon="settings" iconBg={theme.backgroundTertiary || "#303648"} label={t("profile.settings")} onPress={() => navigation.navigate("Settings")} />
              <SettingRow icon="log-out" iconBg={theme.danger} label={t("profile.signOut")} labelColor={theme.danger} onPress={handleLogout} last />
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Duration picker modal */}
      <Modal
        visible={showDurationPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDurationPicker(false)}
      >
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setShowDurationPicker(false)}
        >
          <Pressable style={[styles.pickerSheet, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.pickerHandle, { backgroundColor: theme.border }]} />
            <ThemedText style={[styles.pickerTitle, { color: theme.text }]}>
              {t("profile.setDuration")}
            </ThemedText>
            <ThemedText style={[styles.pickerSub, { color: theme.textSecondary }]}>
              {t("profile.setDurationSubtitle")}
            </ThemedText>
            <View style={styles.pickerGrid}>
              {PLAYING_NOW_DURATIONS.map((d) => (
                <Pressable
                  key={d.minutes}
                  onPress={() => setAvailableMutation.mutate(d.minutes)}
                  disabled={setAvailableMutation.isPending}
                  style={({ pressed }) => [
                    styles.pickerBtn,
                    {
                      backgroundColor: `${theme.success}18`,
                      borderColor: theme.success,
                      opacity: setAvailableMutation.isPending ? 0.5 : pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  {setAvailableMutation.isPending ? (
                    <ActivityIndicator color={theme.success} size="small" />
                  ) : (
                    <>
                      <Feather name="zap" size={18} color={theme.success} />
                      <ThemedText style={{ color: theme.success, fontWeight: "700", fontSize: 16 }}>
                        {d.label}
                      </ThemedText>
                    </>
                  )}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1 },

  // Banner + hero
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.xl,
    paddingTop: BANNER_HEIGHT - AVATAR_SIZE / 2,
    gap: Spacing.lg,
  },
  avatarWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGlow: {
    position: "absolute",
    width: AVATAR_SIZE + 28,
    height: AVATAR_SIZE + 28,
    borderRadius: (AVATAR_SIZE + 28) / 2,
  },
  avatarRing: {
    width: AVATAR_SIZE + 4,
    height: AVATAR_SIZE + 4,
    borderRadius: (AVATAR_SIZE + 4) / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  nameBlock: {
    flex: 1,
    paddingBottom: 4,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
  },
  nickname: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  age: {
    fontSize: 17,
    fontWeight: "400",
  },
  email: {
    fontSize: 13,
  },

  // Stats chips
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Bio
  bioCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  bioText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontStyle: "italic",
  },

  // Sections
  sections: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing["2xl"],
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Cards
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },

  // Games
  playstyleChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  playstyleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  gamesGrid: {
    gap: Spacing.sm,
  },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  primaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  primaryText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  addGamesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addGamesText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Activity
  availableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  availableLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  pulseDotWrap: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseDotRing: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  pulseDotCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  inactiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.4,
  },
  availableTexts: { flex: 1 },
  availableTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  availableDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
    borderTopWidth: 1,
  },
  timerText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Details
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    flex: 1,
    fontSize: 15,
  },
  detailValue: {
    fontSize: 14,
  },
  detailDivider: {
    height: 1,
    marginVertical: Spacing.sm,
    marginLeft: 48,
  },

  // Settings
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  settingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
  },
  settingDivider: {
    height: 1,
  },

  // Duration picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing["3xl"],
    gap: Spacing.lg,
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.sm,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  pickerSub: {
    fontSize: 14,
    textAlign: "center",
    marginTop: -Spacing.sm,
  },
  pickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  pickerBtn: {
    width: "30%",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
});
