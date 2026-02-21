import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  interpolateColor,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useAuth, type Profile } from "@/lib/auth-context";
import { apiRequest, getBaseUrl } from "@/lib/api-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SelectableChip } from "@/components/SelectableChip";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius } from "@/constants/theme";
import { REGIONS, LANGUAGES } from "@/lib/game-data";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Animated input with focus glow ──────────────────────────────────────────

function AnimatedInput({
  theme,
  multiline,
  ...props
}: { theme: any; multiline?: boolean; [key: string]: any }) {
  const focused = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focused.value, [0, 1], [theme.border, theme.primary]),
    shadowOpacity: interpolate(focused.value, [0, 1], [0, 0.35]),
    shadowRadius: interpolate(focused.value, [0, 1], [0, 10]),
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    elevation: interpolate(focused.value, [0, 1], [0, 4]),
  }));

  return (
    <Animated.View
      style={[
        inputStyles.container,
        { backgroundColor: theme.backgroundDefault },
        containerStyle,
      ]}
    >
      <TextInput
        {...props}
        style={[inputStyles.input, { color: theme.text }, multiline && inputStyles.multiline]}
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        onFocus={() => { focused.value = withTiming(1, { duration: 200 }); }}
        onBlur={() => { focused.value = withTiming(0, { duration: 200 }); }}
      />
    </Animated.View>
  );
}

const inputStyles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
  },
  input: { height: 52, fontSize: 16 },
  multiline: { height: 100, paddingTop: Spacing.md, textAlignVertical: "top" },
});

// ─── Animated toggle ──────────────────────────────────────────────────────────

function AnimatedToggle({
  value,
  onToggle,
  activeColor,
  theme,
}: {
  value: boolean;
  onToggle: () => void;
  activeColor: string;
  theme: any;
}) {
  const knob = useSharedValue(value ? 20 : 0);
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knob.value }],
  }));

  const handleToggle = () => {
    knob.value = withSpring(value ? 0 : 20, { damping: 15, stiffness: 250 });
    onToggle();
  };

  return (
    <Pressable onPress={handleToggle}>
      <View
        style={[
          togStyles.track,
          {
            backgroundColor: value ? activeColor : theme.backgroundTertiary,
            borderColor: value ? activeColor : theme.border,
          },
        ]}
      >
        <Animated.View style={[togStyles.knob, knobStyle]} />
      </View>
    </Pressable>
  );
}

const togStyles = StyleSheet.create({
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
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
});

// ─── Avatar with glow ring ────────────────────────────────────────────────────

function AvatarSection({
  avatarUri,
  uploadingAvatar,
  onPick,
  theme,
}: {
  avatarUri: string | null;
  uploadingAvatar: boolean;
  onPick: () => void;
  theme: any;
}) {
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  React.useEffect(() => {
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1400 }),
        withTiming(0.15, { duration: 1400 }),
      ),
      -1,
      true,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={avStyles.container}>
      <AnimatedPressable
        onPress={onPick}
        disabled={uploadingAvatar}
        onPressIn={() => { scale.value = withSpring(0.94, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        style={[avStyles.pressable, pressStyle]}
      >
        <Animated.View
          style={[
            avStyles.glow,
            { backgroundColor: theme.primary },
            glowStyle,
          ]}
        />
        <View style={[avStyles.ring, { borderColor: theme.primary }]}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={avStyles.avatar} contentFit="cover" />
          ) : (
            <View style={[avStyles.avatar, avStyles.placeholder, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="user" size={42} color={theme.textSecondary} />
            </View>
          )}
        </View>
        <View style={[avStyles.badge, { backgroundColor: theme.primary }]}>
          {uploadingAvatar ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="camera" size={14} color="#FFFFFF" />
          )}
        </View>
      </AnimatedPressable>
    </View>
  );
}

const avStyles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: Spacing.md },
  pressable: { alignItems: "center", justifyContent: "center" },
  glow: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
  },
  ring: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2.5,
    padding: 3,
  },
  avatar: { width: "100%", height: "100%", borderRadius: 52 },
  placeholder: { alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label, theme }: { label: string; theme: any }) {
  return (
    <ThemedText
      style={{
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
        color: theme.textSecondary,
        marginBottom: 2,
      }}
    >
      {label}
    </ThemedText>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { user, profile, setProfile } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [region, setRegion] = useState(profile?.region || "");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    (profile?.languages as string[]) || ["en"],
  );
  const [micEnabled, setMicEnabled] = useState(profile?.micEnabled ?? true);
  const [discordTag, setDiscordTag] = useState(profile?.discordTag || "");
  const [avatarUri, setAvatarUri] = useState<string | null>(
    profile?.avatarUrl ? `${getBaseUrl()}${profile.avatarUrl}` : null,
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const token = await (await import("@/lib/api-client")).getToken();
      const formData = new FormData();
      const uri = asset.uri;
      const ext = uri.split(".").pop() || "jpg";
      formData.append("avatar", {
        uri,
        name: `avatar.${ext}`,
        type: `image/${ext === "jpg" ? "jpeg" : ext}`,
      } as any);

      const res = await fetch(`${getBaseUrl()}/api/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setAvatarUri(`${getBaseUrl()}${data.avatarUrl}`);
      if (data.profile) setProfile(data.profile);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    } catch {
      Alert.alert(t("common.error"), t("editProfile.failedUpload"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const method = profile ? "PUT" : "POST";
      const endpoint = profile ? `/api/profile/${user?.id}` : "/api/profile";
      return apiRequest<Profile>(method, endpoint, data);
    },
    onSuccess: (updatedProfile) => {
      setProfile(updatedProfile);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert(t("common.error"), t("editProfile.failedUpdate"));
    },
  });

  const toggleLanguage = (langId: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(langId) ? prev.filter((l) => l !== langId) : [...prev, langId],
    );
  };

  const handleSave = () => {
    if (!nickname.trim()) {
      Alert.alert(t("common.error"), t("editProfile.nicknameRequired"));
      return;
    }
    if (!region) {
      Alert.alert(t("common.error"), t("editProfile.selectRegion"));
      return;
    }
    updateMutation.mutate({
      nickname: nickname.trim(),
      bio: bio.trim() || null,
      region,
      languages: selectedLanguages,
      micEnabled,
      discordTag: discordTag.trim() || null,
    });
  };

  const isPending = updateMutation.isPending;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.sm,
            paddingBottom: insets.bottom + 100,
          },
        ]}
      >
        <AvatarSection
          avatarUri={avatarUri}
          uploadingAvatar={uploadingAvatar}
          onPick={pickAvatar}
          theme={theme}
        />

        <View style={styles.field}>
          <SectionLabel label={t("onboarding.nickname")} theme={theme} />
          <AnimatedInput
            theme={theme}
            placeholder={t("onboarding.nicknamePlaceholder")}
            value={nickname}
            onChangeText={setNickname}
          />
        </View>

        <View style={styles.field}>
          <SectionLabel label={t("onboarding.region")} theme={theme} />
          <View style={styles.chipGrid}>
            {REGIONS.map((r) => (
              <SelectableChip
                key={r.id}
                label={t(`gameData.regions.${r.id}`)}
                selected={region === r.id}
                onPress={() => setRegion(r.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <SectionLabel label={t("onboarding.languages")} theme={theme} />
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

        <View
          style={[
            styles.toggleCard,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
          ]}
        >
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelRow}>
              <View
                style={[
                  styles.toggleIconBg,
                  { backgroundColor: micEnabled ? `${theme.success}20` : `${theme.primary}15` },
                ]}
              >
                <Feather
                  name="mic"
                  size={18}
                  color={micEnabled ? theme.success : theme.textSecondary}
                />
              </View>
              <View>
                <ThemedText style={{ fontSize: 15, fontWeight: "600", color: theme.text }}>
                  {t("onboarding.microphone")}
                </ThemedText>
                <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
                  {micEnabled ? "Voice chat enabled" : "Voice chat off"}
                </ThemedText>
              </View>
            </View>
            <AnimatedToggle
              value={micEnabled}
              onToggle={() => setMicEnabled(!micEnabled)}
              activeColor={theme.success}
              theme={theme}
            />
          </View>
        </View>

        <View style={styles.field}>
          <SectionLabel label="Discord Tag" theme={theme} />
          <AnimatedInput
            theme={theme}
            placeholder={t("onboarding.discordPlaceholder")}
            value={discordTag}
            onChangeText={setDiscordTag}
          />
        </View>

        <View style={styles.field}>
          <SectionLabel label="Bio" theme={theme} />
          <AnimatedInput
            theme={theme}
            placeholder={t("onboarding.bioPlaceholder")}
            value={bio}
            onChangeText={setBio}
            multiline
          />
        </View>
      </KeyboardAwareScrollViewCompat>

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
        <Pressable onPress={handleSave} disabled={isPending} style={styles.saveBtn}>
          <LinearGradient
            colors={
              isPending
                ? [`${theme.primary}50`, `${theme.primary}35`]
                : [theme.primary, `${theme.primary}BB`]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveGradient}
          >
            {isPending ? (
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
  field: { gap: Spacing.xs },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  toggleCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  toggleIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
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
