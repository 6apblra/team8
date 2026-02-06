import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { SelectableChip } from "@/components/SelectableChip";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { REGIONS, LANGUAGES } from "@/lib/game-data";

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { user, profile, setProfile } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [region, setRegion] = useState(profile?.region || "");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    (profile?.languages as string[]) || ["en"]
  );
  const [micEnabled, setMicEnabled] = useState(profile?.micEnabled ?? true);
  const [discordTag, setDiscordTag] = useState(profile?.discordTag || "");

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/profile/${user?.id}`, data);
      return response.json();
    },
    onSuccess: (updatedProfile) => {
      setProfile(updatedProfile);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      navigation.goBack();
    },
    onError: (error) => {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    },
  });

  const toggleLanguage = (langId: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(langId) ? prev.filter((l) => l !== langId) : [...prev, langId]
    );
  };

  const handleSave = () => {
    if (!nickname.trim()) {
      Alert.alert("Error", "Nickname is required");
      return;
    }
    if (!region) {
      Alert.alert("Error", "Please select a region");
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
        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Nickname *</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Your gaming name"
            placeholderTextColor={theme.textSecondary}
            value={nickname}
            onChangeText={setNickname}
          />
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Region *</ThemedText>
          <View style={styles.chipGrid}>
            {REGIONS.map((r) => (
              <SelectableChip
                key={r.id}
                label={r.label}
                selected={region === r.id}
                onPress={() => setRegion(r.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Languages</ThemedText>
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

        <View style={styles.formGroup}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Feather name="mic" size={20} color={theme.text} />
              <ThemedText style={styles.label}>Microphone</ThemedText>
            </View>
            <Pressable
              onPress={() => setMicEnabled(!micEnabled)}
              style={[
                styles.toggle,
                { backgroundColor: micEnabled ? theme.success : theme.backgroundSecondary },
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
          <ThemedText style={styles.label}>Discord Tag</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="username#1234"
            placeholderTextColor={theme.textSecondary}
            value={discordTag}
            onChangeText={setDiscordTag}
          />
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Bio</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea, { color: theme.text }]}
            placeholder="Tell others about your gaming style..."
            placeholderTextColor={theme.textSecondary}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
          />
        </View>

        <Button onPress={handleSave} disabled={updateMutation.isPending} style={styles.saveButton}>
          {updateMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : "Save Changes"}
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
    color: "#FFFFFF",
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#1A1F2E",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#2A3040",
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
  saveButton: {
    marginTop: Spacing.lg,
  },
});
