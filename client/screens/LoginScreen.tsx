import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const theme = Colors.dark;

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const result = isLogin
        ? await login(email.trim(), password)
        : await register(email.trim(), password);

      if (!result.success) {
        setError(result.error || "An error occurred");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing["3xl"], paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText type="h1" style={styles.title}>
            TeamUp
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Find your perfect gaming teammates
          </ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Feather name="mail" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.text, flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
          </View>

          {!isLogin ? (
            <View style={styles.inputContainer}>
              <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Confirm Password"
                placeholderTextColor={theme.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color={theme.danger} />
              <ThemedText style={[styles.errorText, { color: theme.danger }]}>{error}</ThemedText>
            </View>
          ) : null}

          <Button onPress={handleSubmit} disabled={loading} style={styles.button}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : isLogin ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>

          <Pressable onPress={() => setIsLogin(!isLogin)} style={styles.toggleButton}>
            <ThemedText style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <ThemedText style={[styles.toggleText, { color: theme.primary }]}>
                {isLogin ? "Sign Up" : "Sign In"}
              </ThemedText>
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </ThemedText>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
    marginBottom: Spacing.lg,
  },
  title: {
    color: "#FFFFFF",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    color: "#A0A8B8",
    fontSize: 16,
  },
  form: {
    gap: Spacing.lg,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1F2E",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#2A3040",
    paddingHorizontal: Spacing.lg,
    height: 56,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  errorText: {
    fontSize: 14,
  },
  button: {
    marginTop: Spacing.sm,
  },
  toggleButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  toggleText: {
    fontSize: 14,
    color: "#A0A8B8",
  },
  footer: {
    marginTop: Spacing["4xl"],
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
});
