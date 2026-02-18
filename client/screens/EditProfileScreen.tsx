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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useAuth, type Profile } from "@/lib/auth-context";
import { apiRequest, getBaseUrl } from "@/lib/api-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { SelectableChip } from "@/components/SelectableChip";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius } from "@/constants/theme";
import { REGIONS, LANGUAGES } from "@/lib/game-data";

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

      const response = await apiRequest<Profile>(method, endpoint, data);
      return response;
    },
    onSuccess: (updatedProfile) => {
      setProfile(updatedProfile);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      navigation.goBack();
    },
    onError: (error) => {
      console.error("Profile update error:", error);
      Alert.alert(t("common.error"), t("editProfile.failedUpdate"));
    },
  });

  const toggleLanguage = (langId: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(langId)
        ? prev.filter((l) => l !== langId)
        : [...prev, langId],
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

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.avatarSection}>
          <Pressable onPress={pickAvatar} disabled={uploadingAvatar}>
            <View style={styles.avatarContainer}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    styles.avatarPlaceholder,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <Feather name="user" size={40} color={theme.textSecondary} />
                </View>
              )}
              <View
                style={[
                  styles.avatarEditBadge,
                  { backgroundColor: theme.primary, borderColor: theme.backgroundRoot },
                ]}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="camera" size={14} color="#FFFFFF" />
                )}
              </View>
            </View>
          </Pressable>
          <ThemedText style={[styles.avatarHint, { color: theme.textSecondary }]}>{t("editProfile.tapToChangePhoto")}</ThemedText>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: theme.text }]}>{t("onboarding.nickname")}</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
            placeholder={t("onboarding.nicknamePlaceholder")}
            placeholderTextColor={theme.textSecondary}
            value={nickname}
            onChangeText={setNickname}
          />
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: theme.text }]}>{t("onboarding.region")}</ThemedText>
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

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: theme.text }]}>{t("onboarding.languages")}</ThemedText>
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

        <View style={styles.formGroup}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Feather name="mic" size={20} color={theme.text} />
              <ThemedText style={[styles.label, { color: theme.text }]}>{t("onboarding.microphone")}</ThemedText>
            </View>
            <Pressable
              onPress={() => setMicEnabled(!micEnabled)}
              style={[
                styles.toggle,
                {
                  backgroundColor: micEnabled
                    ? theme.success
                    : theme.backgroundSecondary,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  { transform: [{ translateX: micEnabled ? 20 : 0 }] },
                ]}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: theme.text }]}>Discord Tag</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
            placeholder={t("onboarding.discordPlaceholder")}
            placeholderTextColor={theme.textSecondary}
            value={discordTag}
            onChangeText={setDiscordTag}
          />
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={[styles.label, { color: theme.text }]}>Bio</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea, { color: theme.text, backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
            placeholder={t("onboarding.bioPlaceholder")}
            placeholderTextColor={theme.textSecondary}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
          />
        </View>

        <Button
          onPress={handleSave}
          disabled={updateMutation.isPending}
          style={styles.saveButton}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            t("common.save")
          )}
        </Button>
      </KeyboardAwareScrollViewCompat>
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
  formGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  input: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    height: 52,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
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
  },
  toggleLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
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
  avatarSection: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarHint: {
    fontSize: 12,
  },
  saveButton: {
    marginTop: Spacing.lg,
  },
});
