import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Platform,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth-context";
import { useSettings, ThemeMode } from "@/lib/settings-context";
import { setHapticsEnabled } from "@/lib/haptics";
import { apiRequest } from "@/lib/api-client";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SettingRowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  onPress,
  rightElement,
  danger,
}: SettingRowProps) {
  const { theme } = useTheme();

  const iconColor = danger ? theme.danger : theme.primary;
  const textColor = danger ? theme.danger : theme.text;

  const content = (
    <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
      <View
        style={[styles.iconContainer, { backgroundColor: theme.backgroundTertiary }]}
      >
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText style={[styles.settingTitle, { color: textColor }]}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {onValueChange !== undefined && value !== undefined ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{
            false: theme.backgroundTertiary,
            true: theme.primary,
          }}
          thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
          ios_backgroundColor={theme.backgroundTertiary}
        />
      ) : rightElement ? (
        rightElement
      ) : onPress ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {content}
      </Pressable>
    );
  }

  return content;
}

interface ThemeOptionProps {
  mode: ThemeMode;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  selected: boolean;
  onSelect: () => void;
}

function ThemeOption({ mode, label, icon, selected, onSelect }: ThemeOptionProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.themeOption,
        {
          backgroundColor: selected ? theme.primary : theme.backgroundSecondary,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
    >
      <Feather
        name={icon}
        size={24}
        color={selected ? "#FFFFFF" : theme.textSecondary}
      />
      <ThemedText
        style={[
          styles.themeOptionText,
          { color: selected ? "#FFFFFF" : theme.text },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

interface PasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

function ChangePasswordModal({ visible, onClose }: PasswordModalProps) {
  const { theme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      Alert.alert("Success", "Password changed successfully");
      onClose();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h4">Change Password</ThemedText>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Current Password
            </ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
                placeholder="Enter current password"
                placeholderTextColor={theme.textSecondary}
              />
              <Pressable onPress={() => setShowCurrent(!showCurrent)}>
                <Feather name={showCurrent ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
              New Password
            </ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                placeholder="Enter new password"
                placeholderTextColor={theme.textSecondary}
              />
              <Pressable onPress={() => setShowNew(!showNew)}>
                <Feather name={showNew ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Confirm New Password
            </ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showNew}
                placeholder="Confirm new password"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.submitButtonText}>Change Password</ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DeleteAccountModal({ visible, onClose }: PasswordModalProps) {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleDelete = async () => {
    if (!password) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    Alert.alert(
      "Delete Account",
      "This action cannot be undone. All your data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await apiRequest("DELETE", "/api/auth/account", { password });
              Alert.alert("Account Deleted", "Your account has been deleted.");
              logout();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete account");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h4">Delete Account</ThemedText>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={[styles.warningBox, { backgroundColor: `${theme.danger}20` }]}>
            <Feather name="alert-triangle" size={24} color={theme.danger} />
            <ThemedText style={[styles.warningText, { color: theme.danger }]}>
              This will permanently delete your account, profile, matches, and messages.
            </ThemedText>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Enter your password to confirm
            </ThemedText>
            <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSecondary }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Enter password"
                placeholderTextColor={theme.textSecondary}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleDelete}
            disabled={loading}
            style={[styles.submitButton, { backgroundColor: theme.danger }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.submitButtonText}>Delete Account</ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { settings, setThemeMode, setHapticsEnabled: setHapticsEnabledSetting, setSoundEnabled } =
    useSettings();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleHapticsToggle = (enabled: boolean) => {
    setHapticsEnabledSetting(enabled);
    setHapticsEnabled(enabled);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Appearance
          </ThemedText>
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={styles.cardTitle}>Theme</ThemedText>
            <View style={styles.themeOptions}>
              <ThemeOption
                mode="system"
                label="Auto"
                icon="smartphone"
                selected={settings.themeMode === "system"}
                onSelect={() => setThemeMode("system")}
              />
              <ThemeOption
                mode="light"
                label="Light"
                icon="sun"
                selected={settings.themeMode === "light"}
                onSelect={() => setThemeMode("light")}
              />
              <ThemeOption
                mode="dark"
                label="Dark"
                icon="moon"
                selected={settings.themeMode === "dark"}
                onSelect={() => setThemeMode("dark")}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Feedback
          </ThemedText>
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <SettingRow
              icon="smartphone"
              title="Haptic Feedback"
              subtitle="Vibration on interactions"
              value={settings.hapticsEnabled}
              onValueChange={handleHapticsToggle}
            />
            <SettingRow
              icon="volume-2"
              title="Sound Effects"
              subtitle="Play sounds for actions"
              value={settings.soundEnabled}
              onValueChange={setSoundEnabled}
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Account
          </ThemedText>
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <SettingRow
              icon="mail"
              title="Email"
              rightElement={
                <ThemedText style={{ color: theme.textSecondary }}>{user?.email}</ThemedText>
              }
            />
            <SettingRow
              icon="lock"
              title="Change Password"
              onPress={() => setShowPasswordModal(true)}
            />
            <SettingRow
              icon="trash-2"
              title="Delete Account"
              subtitle="Permanently delete your account"
              onPress={() => setShowDeleteModal(true)}
              danger
            />
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            About
          </ThemedText>
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <SettingRow
              icon="info"
              title="Version"
              rightElement={
                <ThemedText style={{ color: theme.textSecondary }}>1.0.0</ThemedText>
              }
            />
          </View>
        </View>
      </ScrollView>

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  themeOptions: {
    flexDirection: "row",
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  themeOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    gap: Spacing.xs,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  submitButton: {
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
  },
});
