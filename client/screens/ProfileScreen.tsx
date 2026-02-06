import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, ScrollView, Switch } from "react-native";
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
import { apiRequest } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { GameBadge } from "@/components/GameBadge";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { REGIONS, LANGUAGES, PLAYSTYLES } from "@/lib/game-data";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

interface UserGame {
  gameId: string;
  rank?: string | null;
  roles?: string[];
  playstyle?: string | null;
  platform?: string | null;
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
  availability: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, profile, logout } = useAuth();
  const { theme } = useTheme();
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
      const { isAvailableNow: available, availableUntil: until } = profileData.profile;
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
      return apiRequest("POST", "/api/available-now", { durationMinutes });
    },
    onSuccess: (data: any) => {
      setIsAvailableNow(true);
      setAvailableUntil(new Date(data.availableUntil));
      queryClient.invalidateQueries({ queryKey: ["/api/profile", user?.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const clearAvailableMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/available-now", {});
    },
    onSuccess: () => {
      setIsAvailableNow(false);
      setAvailableUntil(null);
      queryClient.invalidateQueries({ queryKey: ["/api/profile", user?.id] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
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

  const regionLabel = REGIONS.find((r) => r.id === displayProfile?.region)?.label || displayProfile?.region;
  const languageLabels =
    displayProfile?.languages
      ?.map((l: string) => LANGUAGES.find((lang) => lang.id === l)?.label || l)
      .join(", ") || "Not set";

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
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
            <View style={styles.editBadge}>
              <Feather name="edit-2" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
          <ThemedText type="h2" style={styles.nickname}>
            {displayProfile?.nickname || "Player"}
          </ThemedText>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Feather name="map-pin" size={16} color={theme.textSecondary} />
              <ThemedText style={styles.infoText}>{regionLabel}</ThemedText>
            </View>
            {displayProfile?.micEnabled ? (
              <View style={styles.infoItem}>
                <Feather name="mic" size={16} color={theme.success} />
                <ThemedText style={[styles.infoText, { color: theme.success }]}>Mic On</ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        {displayProfile?.bio ? (
          <Card elevation={1} style={styles.bioCard}>
            <ThemedText style={styles.bioText}>{displayProfile.bio}</ThemedText>
          </Card>
        ) : null}

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Games
          </ThemedText>
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
              <ThemedText style={styles.emptyText}>No games added yet</ThemedText>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Details
          </ThemedText>
          <Card elevation={1}>
            <View style={styles.detailRow}>
              <Feather name="globe" size={18} color={theme.textSecondary} />
              <ThemedText style={styles.detailLabel}>Languages</ThemedText>
              <ThemedText style={styles.detailValue}>{languageLabels}</ThemedText>
            </View>
            {displayProfile?.discordTag ? (
              <View style={styles.detailRow}>
                <Feather name="message-square" size={18} color={theme.textSecondary} />
                <ThemedText style={styles.detailLabel}>Discord</ThemedText>
                <ThemedText style={styles.detailValue}>{displayProfile.discordTag}</ThemedText>
              </View>
            ) : null}
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Activity Status
          </ThemedText>
          <Card elevation={1}>
            <View style={styles.availableRow}>
              <View style={styles.availableInfo}>
                <View style={styles.availableHeader}>
                  <Feather name="zap" size={20} color={isAvailableNow ? theme.secondary : theme.textSecondary} />
                  <ThemedText style={[styles.settingLabel, { flex: 0 }]}>Ready to Play</ThemedText>
                </View>
                <ThemedText style={styles.availableDescription}>
                  {isAvailableNow
                    ? "Others can see you're looking for teammates now"
                    : "Let others know you're available to play"
                  }
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
              <View style={styles.availableTimer}>
                <Feather name="clock" size={14} color={theme.textSecondary} />
                <ThemedText style={styles.timerText}>
                  {remainingMinutes >= 60
                    ? `Active for ${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`
                    : `Active for ${remainingMinutes}m`}
                </ThemedText>
              </View>
            ) : null}
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Settings
          </ThemedText>
          <Card elevation={1}>
            <Pressable
              onPress={handleEditProfile}
              style={({ pressed }: { pressed: boolean }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="edit" size={18} color={theme.text} />
              <ThemedText style={styles.settingLabel}>Edit Profile</ThemedText>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>
            <View style={styles.settingDivider} />
            <Pressable
              onPress={() => navigation.navigate("Filters")}
              style={({ pressed }: { pressed: boolean }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="sliders" size={18} color={theme.text} />
              <ThemedText style={styles.settingLabel}>Filters</ThemedText>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>
            <View style={styles.settingDivider} />
            <Pressable
              onPress={handleLogout}
              style={({ pressed }: { pressed: boolean }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="log-out" size={18} color={theme.danger} />
              <ThemedText style={[styles.settingLabel, { color: theme.danger }]}>
                Sign Out
              </ThemedText>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
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
    backgroundColor: "#1A1F2E",
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
    borderColor: "#0A0E1A",
  },
  nickname: {
    color: "#FFFFFF",
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
    color: "#A0A8B8",
    fontSize: 14,
  },
  bioCard: {
    padding: Spacing.lg,
  },
  bioText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 22,
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
  emptyText: {
    color: "#A0A8B8",
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
    color: "#FFFFFF",
    fontSize: 14,
  },
  detailValue: {
    color: "#A0A8B8",
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
    color: "#FFFFFF",
    fontSize: 16,
  },
  settingDivider: {
    height: 1,
    backgroundColor: "#2A3040",
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
    color: "#A0A8B8",
    fontSize: 13,
    marginLeft: 28,
  },
  availableTimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#2A3040",
    marginTop: Spacing.sm,
  },
  timerText: {
    color: "#A0A8B8",
    fontSize: 13,
  },
});
