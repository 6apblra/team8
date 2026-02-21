import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  interpolateColor,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth-context";
import { useSettings, ThemeMode, LanguageMode } from "@/lib/settings-context";
import { setHapticsEnabled } from "@/lib/haptics";
import { apiRequest } from "@/lib/api-client";
import { useTranslation } from "@/hooks/useTranslation";
import { Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Animated toggle ──────────────────────────────────────────────────────────

function AnimatedToggle({
  value,
  onToggle,
  theme,
}: {
  value: boolean;
  onToggle: (v: boolean) => void;
  theme: any;
}) {
  const knob = useSharedValue(value ? 20 : 0);
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: knob.value }] }));

  const handleToggle = () => {
    const next = !value;
    knob.value = withSpring(next ? 20 : 0, { damping: 15, stiffness: 250 });
    onToggle(next);
  };

  return (
    <Pressable onPress={handleToggle}>
      <View
        style={[
          togStyles.track,
          {
            backgroundColor: value ? theme.primary : theme.backgroundTertiary,
            borderColor: value ? theme.primary : theme.border,
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

// ─── Setting row ──────────────────────────────────────────────────────────────

interface SettingRowProps {
  icon: keyof typeof Feather.glyphMap;
  iconBgColor?: string;
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
  isLast?: boolean;
}

function SettingRow({
  icon,
  iconBgColor,
  title,
  subtitle,
  value,
  onValueChange,
  onPress,
  rightElement,
  danger,
  isLast,
}: SettingRowProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = danger ? theme.danger : theme.primary;
  const textColor = danger ? theme.danger : theme.text;
  const bgColor = iconBgColor || (danger ? `${theme.danger}20` : `${theme.primary}18`);

  const content = (
    <View style={[srStyles.row, { borderBottomColor: isLast ? "transparent" : `${theme.border}60` }]}>
      <View style={[srStyles.iconBg, { backgroundColor: bgColor }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={srStyles.textBlock}>
        <ThemedText style={[srStyles.title, { color: textColor }]}>{title}</ThemedText>
        {subtitle && (
          <ThemedText style={[srStyles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {onValueChange !== undefined && value !== undefined ? (
        <AnimatedToggle value={value} onToggle={onValueChange} theme={theme} />
      ) : rightElement ? (
        rightElement
      ) : onPress ? (
        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        style={pressStyle}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return content;
}

const srStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { flex: 1 },
  title: { fontSize: 16, fontWeight: "500" },
  subtitle: { fontSize: 12, marginTop: 2 },
});

// ─── Theme / Language option ──────────────────────────────────────────────────

function SelectOption({
  label,
  icon,
  selected,
  onSelect,
  theme,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  selected: boolean;
  onSelect: () => void;
  theme: any;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onSelect}
      onPressIn={() => { scale.value = withSpring(0.93, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      style={[
        animStyle,
        soStyles.option,
        {
          backgroundColor: selected ? theme.primary : theme.backgroundSecondary,
          borderColor: selected ? theme.primary : theme.border,
          shadowColor: selected ? theme.primary : "transparent",
          shadowOpacity: selected ? 0.4 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: selected ? 4 : 0,
        },
      ]}
    >
      <Feather name={icon} size={22} color={selected ? "#FFFFFF" : theme.textSecondary} />
      <ThemedText
        style={[soStyles.label, { color: selected ? "#FFFFFF" : theme.text, fontWeight: selected ? "700" : "500" }]}
      >
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

const soStyles = StyleSheet.create({
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  label: { fontSize: 12 },
});

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label, theme }: { label: string; theme: any }) {
  return (
    <ThemedText
      style={{
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.2,
        textTransform: "uppercase",
        color: theme.textSecondary,
        marginLeft: Spacing.xs,
        marginBottom: 2,
      }}
    >
      {label}
    </ThemedText>
  );
}

// ─── Password field ───────────────────────────────────────────────────────────

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  theme,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder: string;
  theme: any;
}) {
  const focused = useSharedValue(0);
  const containerStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focused.value, [0, 1], [theme.border, theme.primary]),
    shadowOpacity: interpolate(focused.value, [0, 1], [0, 0.3]),
    shadowRadius: interpolate(focused.value, [0, 1], [0, 8]),
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    elevation: interpolate(focused.value, [0, 1], [0, 3]),
  }));

  return (
    <View style={pfStyles.group}>
      <ThemedText style={[pfStyles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
      <Animated.View
        style={[
          pfStyles.inputRow,
          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
          containerStyle,
        ]}
      >
        <TextInput
          style={[pfStyles.input, { color: theme.text }]}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          onFocus={() => { focused.value = withTiming(1, { duration: 200 }); }}
          onBlur={() => { focused.value = withTiming(0, { duration: 200 }); }}
        />
        <Pressable onPress={onToggleShow} style={pfStyles.eyeBtn}>
          <Feather name={show ? "eye-off" : "eye"} size={18} color={theme.textSecondary} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const pfStyles = StyleSheet.create({
  group: { gap: Spacing.xs },
  label: { fontSize: 13, fontWeight: "500" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    height: 50,
  },
  input: { flex: 1, fontSize: 15 },
  eyeBtn: { padding: Spacing.xs },
});

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t("common.error"), t("auth.fillAllFields"));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t("common.error"), t("settings.passwordsMismatch"));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t("common.error"), t("settings.passwordMinLength"));
      return;
    }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/change-password", { currentPassword, newPassword });
      Alert.alert(t("common.success"), t("settings.passwordChanged"));
      onClose();
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || t("settings.failedChangePassword"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[modalStyles.handle, { backgroundColor: theme.border }]} />
          <View style={modalStyles.header}>
            <ThemedText style={[modalStyles.title, { color: theme.text }]}>
              {t("settings.changePassword")}
            </ThemedText>
            <Pressable
              onPress={onClose}
              style={[modalStyles.closeBtn, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="x" size={18} color={theme.text} />
            </Pressable>
          </View>

          <PasswordField
            label={t("settings.currentPassword")}
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggleShow={() => setShowCurrent(!showCurrent)}
            placeholder={t("settings.enterCurrentPassword")}
            theme={theme}
          />
          <PasswordField
            label={t("settings.newPassword")}
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggleShow={() => setShowNew(!showNew)}
            placeholder={t("settings.enterNewPassword")}
            theme={theme}
          />
          <View style={pfStyles.group}>
            <ThemedText style={[pfStyles.label, { color: theme.textSecondary }]}>
              {t("settings.confirmNewPassword")}
            </ThemedText>
            <Animated.View
              style={[
                pfStyles.inputRow,
                { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
              ]}
            >
              <TextInput
                style={[pfStyles.input, { color: theme.text }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showNew}
                placeholder={t("settings.confirmNewPasswordPlaceholder")}
                placeholderTextColor={theme.textSecondary}
              />
            </Animated.View>
          </View>

          <Pressable onPress={handleSubmit} disabled={loading}>
            <LinearGradient
              colors={[theme.primary, `${theme.primary}BB`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={modalStyles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={modalStyles.submitText}>
                  {t("settings.changePassword")}
                </ThemedText>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Delete Account Modal ─────────────────────────────────────────────────────

function DeleteAccountModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleDelete = async () => {
    if (!password) {
      Alert.alert(t("common.error"), t("settings.enterPassword"));
      return;
    }
    Alert.alert(
      t("settings.deleteAccountTitle"),
      t("settings.cannotBeUndone"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await apiRequest("DELETE", "/api/auth/account", { password });
              Alert.alert(t("settings.accountDeleted"), t("settings.accountDeletedMessage"));
              logout();
            } catch (error: any) {
              Alert.alert(t("common.error"), error.message || t("settings.failedDeleteAccount"));
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
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[modalStyles.handle, { backgroundColor: theme.border }]} />
          <View style={modalStyles.header}>
            <ThemedText style={[modalStyles.title, { color: theme.danger }]}>
              {t("settings.deleteAccountTitle")}
            </ThemedText>
            <Pressable
              onPress={onClose}
              style={[modalStyles.closeBtn, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Feather name="x" size={18} color={theme.text} />
            </Pressable>
          </View>

          <View style={[modalStyles.warningBox, { backgroundColor: `${theme.danger}15`, borderColor: `${theme.danger}40` }]}>
            <Feather name="alert-triangle" size={20} color={theme.danger} />
            <ThemedText style={[modalStyles.warningText, { color: theme.danger }]}>
              {t("settings.deleteAccountWarning")}
            </ThemedText>
          </View>

          <PasswordField
            label={t("settings.enterPasswordToConfirm")}
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggleShow={() => setShowPassword(!showPassword)}
            placeholder={t("settings.enterPassword")}
            theme={theme}
          />

          <Pressable onPress={handleDelete} disabled={loading}>
            <LinearGradient
              colors={[theme.danger, `${theme.danger}BB`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={modalStyles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="trash-2" size={16} color="#FFFFFF" />
                  <ThemedText style={modalStyles.submitText}>
                    {t("settings.deleteAccount")}
                  </ThemedText>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "700" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  warningText: { flex: 1, fontSize: 14, fontWeight: "500" },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 52,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  submitText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    settings,
    setThemeMode,
    setHapticsEnabled: setHapticsEnabledSetting,
    setSoundEnabled,
    setLanguage,
  } = useSettings();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleHapticsToggle = (enabled: boolean) => {
    setHapticsEnabledSetting(enabled);
    setHapticsEnabled(enabled);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <View style={styles.section}>
          <SectionHeader label={t("settings.appearance")} theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.cardLabelRow, { borderBottomColor: `${theme.border}60` }]}>
              <Feather name="droplet" size={15} color={theme.textSecondary} />
              <ThemedText style={[styles.cardLabel, { color: theme.textSecondary }]}>
                {t("settings.theme")}
              </ThemedText>
            </View>
            <View style={styles.optionsRow}>
              <SelectOption
                label={t("settings.themeAuto")}
                icon="smartphone"
                selected={settings.themeMode === "system"}
                onSelect={() => setThemeMode("system")}
                theme={theme}
              />
              <SelectOption
                label={t("settings.themeLight")}
                icon="sun"
                selected={settings.themeMode === "light"}
                onSelect={() => setThemeMode("light")}
                theme={theme}
              />
              <SelectOption
                label={t("settings.themeDark")}
                icon="moon"
                selected={settings.themeMode === "dark"}
                onSelect={() => setThemeMode("dark")}
                theme={theme}
              />
            </View>
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <SectionHeader label={t("settings.language")} theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.cardLabelRow, { borderBottomColor: `${theme.border}60` }]}>
              <Feather name="globe" size={15} color={theme.textSecondary} />
              <ThemedText style={[styles.cardLabel, { color: theme.textSecondary }]}>
                {t("settings.language")}
              </ThemedText>
            </View>
            <View style={styles.optionsRow}>
              <SelectOption
                label={t("settings.languageAuto")}
                icon="smartphone"
                selected={settings.language === "system"}
                onSelect={() => setLanguage("system")}
                theme={theme}
              />
              <SelectOption
                label={t("settings.languageEn")}
                icon="globe"
                selected={settings.language === "en"}
                onSelect={() => setLanguage("en")}
                theme={theme}
              />
              <SelectOption
                label={t("settings.languageRu")}
                icon="globe"
                selected={settings.language === "ru"}
                onSelect={() => setLanguage("ru")}
                theme={theme}
              />
            </View>
          </View>
        </View>

        {/* Feedback */}
        <View style={styles.section}>
          <SectionHeader label={t("settings.feedback")} theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <SettingRow
              icon="smartphone"
              iconBgColor={`${theme.primary}18`}
              title={t("settings.haptic")}
              subtitle={t("settings.hapticSubtitle")}
              value={settings.hapticsEnabled}
              onValueChange={handleHapticsToggle}
            />
            <SettingRow
              icon="volume-2"
              iconBgColor={`${theme.secondary}18`}
              title={t("settings.sound")}
              subtitle={t("settings.soundSubtitle")}
              value={settings.soundEnabled}
              onValueChange={setSoundEnabled}
              isLast
            />
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <SectionHeader label={t("settings.account")} theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <SettingRow
              icon="mail"
              iconBgColor={`${theme.primary}18`}
              title={t("settings.email")}
              rightElement={
                <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>
                  {user?.email}
                </ThemedText>
              }
            />
            <SettingRow
              icon="lock"
              iconBgColor={`${theme.warning}20`}
              title={t("settings.changePassword")}
              onPress={() => setShowPasswordModal(true)}
            />
            <SettingRow
              icon="trash-2"
              title={t("settings.deleteAccount")}
              subtitle={t("settings.deleteAccountSubtitle")}
              onPress={() => setShowDeleteModal(true)}
              danger
              isLast
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <SectionHeader label={t("settings.about")} theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <SettingRow
              icon="info"
              iconBgColor={`${theme.primary}18`}
              title={t("settings.version")}
              rightElement={
                <View style={[styles.versionBadge, { backgroundColor: `${theme.primary}18` }]}>
                  <ThemedText style={{ fontSize: 13, fontWeight: "700", color: theme.primary }}>
                    1.0.0
                  </ThemedText>
                </View>
              }
              isLast
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
  container: { flex: 1 },
  content: {
    padding: Spacing.xl,
    gap: Spacing.xl,
    paddingBottom: Spacing["3xl"],
  },
  section: { gap: Spacing.sm },
  card: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  cardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardLabel: { fontSize: 13, fontWeight: "600" },
  optionsRow: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  versionBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
});
