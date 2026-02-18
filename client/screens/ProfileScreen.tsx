import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { GameBadge } from "@/components/GameBadge";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius } from "@/constants/theme";
import { REGIONS, LANGUAGES } from "@/lib/game-data";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile, logout } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isAvailableNow, setIsAvailableNow] = useState(false);
  const [availableUntil, setAvailableUntil] = useState<Date | null>(null);
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);

  const { data: profileData } = useQuery<ProfileData>({
    queryKey: ["/api/profile", user?.id],
    enabled: !!user?.id && !!profile,
  });

  useEffect(() => {
    if (profileData?.profile) {
      const { isAvailableNow: available, availableUntil: until } =
        profileData.profile;
      setIsAvailableNow(!!available);
      setAvailableUntil(until ? new Date(until) : null);
    }
  }, [profileData]);

  useEffect(() => {
    if (!isAvailableNow || !availableUntil) {
      setRemainingMinutes(null);
      return;
    }
    const updateRemaining = () => {
      const now = new Date();
      const diff = availableUntil.getTime() - now.getTime();
      if (diff <= 0) {
        setIsAvailableNow(false);
        setAvailableUntil(null);
        setRemainingMinutes(null);
      } else {
        setRemainingMinutes(Math.ceil(diff / 60000));
      }
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 60000);
    return () => clearInterval(interval);
  }, [isAvailableNow, availableUntil]);

  const setAvailableMutation = useMutation({
    mutationFn: async (durationMinutes: number) => {
      return apiRequest<{ success: boolean; availableUntil: string }>(
        "POST",
        "/api/available-now",
        { durationMinutes },
      );
    },
    onSuccess: (data) => {
      setIsAvailableNow(true);
      setAvailableUntil(new Date(data.availableUntil));
      queryClient.invalidateQueries({ queryKey: ["/api/profile", user?.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      console.error("Set available error:", error);
    },
  });

  const clearAvailableMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ success: boolean }>("DELETE", "/api/available-now");
    },
    onSuccess: () => {
      setIsAvailableNow(false);
      setAvailableUntil(null);
      queryClient.invalidateQueries({ queryKey: ["/api/profile", user?.id] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onError: (error) => {
      console.error("Clear available error:", error);
    },
  });

  const toggleAvailableNow = () => {
    if (isAvailableNow) {
      clearAvailableMutation.mutate();
    } else {
      setAvailableMutation.mutate(60);
    }
  };

  const handleLogout = () => {
    Alert.alert(t("profile.signOut"), t("profile.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.signOut"),
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  const handleEditProfile = () => {
    navigation.navigate("EditProfile");
  };

  const displayProfile = profileData?.profile || profile;
  const userGames = profileData?.userGames || [];

  const avatarUrl =
    displayProfile?.avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/png?seed=${user?.id}`;

  const regionLabel = displayProfile?.region
    ? t(`gameData.regions.${displayProfile.region}`)
    : displayProfile?.region;
  const languageLabels =
    displayProfile?.languages
      ?.map((l: string) => t(`gameData.languages.${l}`))
      .join(", ") || t("profile.notSet");

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.header}>
          <Pressable onPress={handleEditProfile}>
            <Image
              source={{ uri: avatarUrl }}
              style={[styles.avatar, { backgroundColor: theme.backgroundDefault }]}
              contentFit="cover"
            />
            <View style={[styles.editBadge, { borderColor: theme.backgroundRoot }]}>
              <Feather name="edit-2" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
          <ThemedText type="h2" style={[styles.nickname, { color: theme.text }]}>
            {displayProfile?.nickname || "Player"}
          </ThemedText>

          {userGames.find((g) => g.isPrimary) && (
            <View style={{ marginTop: 4 }}>
              <GameBadge
                game={userGames.find((g) => g.isPrimary)!.gameId}
                size="small"
                rank={userGames.find((g) => g.isPrimary)!.rank || undefined}
              />
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Feather name="map-pin" size={16} color={theme.textSecondary} />
              <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>{regionLabel}</ThemedText>
            </View>
            {displayProfile?.micEnabled ? (
              <View style={styles.infoItem}>
                <Feather name="mic" size={16} color={theme.success} />
                <ThemedText style={[styles.infoText, { color: theme.success }]}>
                  {t("profile.micOn")}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        {displayProfile?.bio ? (
          <Card elevation={1} style={styles.bioCard}>
            <ThemedText style={[styles.bioText, { color: theme.text }]}>{displayProfile.bio}</ThemedText>
          </Card>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.text }]}>
              {t("profile.games")}
            </ThemedText>
            <Pressable
              onPress={() => navigation.navigate("EditGames")}
              style={({ pressed }) => [
                styles.editButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="edit-2" size={16} color={theme.primary} />
              <ThemedText
                style={[styles.editButtonText, { color: theme.primary }]}
              >
                {t("common.edit")}
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.gamesGrid}>
            {userGames.length > 0 ? (
              userGames.map((game, index) => (
                <GameBadge
                  key={index}
                  game={game.gameId}
                  rank={game.rank || undefined}
                  role={game.roles?.[0]}
                  size="medium"
                />
              ))
            ) : (
              <Pressable
                onPress={() => navigation.navigate("EditGames")}
                style={[styles.addGamesButton, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
              >
                <Feather name="plus-circle" size={24} color={theme.primary} />
                <ThemedText
                  style={[styles.addGamesText, { color: theme.primary }]}
                >
                  {t("profile.addGames")}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.text }]}>
            {t("profile.details")}
          </ThemedText>
          <Card elevation={1}>
            <View style={styles.detailRow}>
              <Feather name="globe" size={18} color={theme.textSecondary} />
              <ThemedText style={[styles.detailLabel, { color: theme.text }]}>{t("profile.languagesLabel")}</ThemedText>
              <ThemedText style={[styles.detailValue, { color: theme.textSecondary }]}>
                {languageLabels}
              </ThemedText>
            </View>
            {displayProfile?.discordTag ? (
              <View style={styles.detailRow}>
                <Feather
                  name="message-square"
                  size={18}
                  color={theme.textSecondary}
                />
                <ThemedText style={[styles.detailLabel, { color: theme.text }]}>{t("profile.discord")}</ThemedText>
                <ThemedText style={[styles.detailValue, { color: theme.textSecondary }]}>
                  {displayProfile.discordTag}
                </ThemedText>
              </View>
            ) : null}
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.text }]}>
            {t("profile.activityStatus")}
          </ThemedText>
          <Card elevation={1}>
            <View style={styles.availableRow}>
              <View style={styles.availableInfo}>
                <View style={styles.availableHeader}>
                  <Feather
                    name="zap"
                    size={20}
                    color={
                      isAvailableNow ? theme.secondary : theme.textSecondary
                    }
                  />
                  <ThemedText style={[styles.settingLabel, { flex: 0, color: theme.text }]}>
                    {t("profile.readyToPlay")}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.availableDescription, { color: theme.textSecondary }]}>
                  {isAvailableNow
                    ? t("profile.readyToPlayActive")
                    : t("profile.readyToPlayInactive")}
                </ThemedText>
              </View>
              <Switch
                value={isAvailableNow}
                onValueChange={toggleAvailableNow}
                trackColor={{ false: "#3A3F47", true: theme.secondary }}
                thumbColor="#FFFFFF"
              />
            </View>
            {isAvailableNow && remainingMinutes !== null ? (
              <View style={[styles.availableTimer, { borderTopColor: theme.border }]}>
                <Feather name="clock" size={14} color={theme.textSecondary} />
                <ThemedText style={[styles.timerText, { color: theme.textSecondary }]}>
                  {remainingMinutes >= 60
                    ? t("profile.activeForHM", { hours: String(Math.floor(remainingMinutes / 60)), minutes: String(remainingMinutes % 60) })
                    : t("profile.activeForM", { minutes: String(remainingMinutes) })}
                </ThemedText>
              </View>
            ) : null}
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.text }]}>
            {t("profile.settingsSection")}
          </ThemedText>
          <Card elevation={1}>
            <Pressable
              onPress={handleEditProfile}
              style={({ pressed }: { pressed: boolean }) => [
                styles.settingRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="edit" size={18} color={theme.text} />
              <ThemedText style={[styles.settingLabel, { color: theme.text }]}>{t("profile.editProfile")}</ThemedText>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
            <View style={[styles.settingDivider, { backgroundColor: theme.border }]} />
            <Pressable
              onPress={() => navigation.navigate("Filters")}
              style={({ pressed }: { pressed: boolean }) => [
                styles.settingRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="sliders" size={18} color={theme.text} />
              <ThemedText style={[styles.settingLabel, { color: theme.text }]}>{t("profile.filters")}</ThemedText>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
            <View style={[styles.settingDivider, { backgroundColor: theme.border }]} />
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              style={({ pressed }: { pressed: boolean }) => [
                styles.settingRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="settings" size={18} color={theme.text} />
              <ThemedText style={[styles.settingLabel, { color: theme.text }]}>{t("profile.settings")}</ThemedText>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
            <View style={[styles.settingDivider, { backgroundColor: theme.border }]} />
            <Pressable
              onPress={handleLogout}
              style={({ pressed }: { pressed: boolean }) => [
                styles.settingRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="log-out" size={18} color={theme.danger} />
              <ThemedText
                style={[styles.settingLabel, { color: theme.danger }]}
              >
                {t("profile.signOut")}
              </ThemedText>
              <Feather
                name="chevron-right"
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
          </Card>
        </View>
      </ScrollView>
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
  header: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00D9FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  nickname: {
    marginTop: Spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: 14,
  },
  bioCard: {
    padding: Spacing.lg,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
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
  emptyText: {
    fontSize: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
  },
  settingDivider: {
    height: 1,
    marginLeft: 34,
  },
  availableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  availableInfo: {
    flex: 1,
    gap: 4,
  },
  availableHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  availableDescription: {
    fontSize: 13,
    marginLeft: 28,
  },
  availableTimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    marginTop: Spacing.sm,
  },
  timerText: {
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  addGamesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addGamesText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
