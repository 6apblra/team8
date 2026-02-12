import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useSettings } from "@/lib/settings-context";

export function useTheme() {
  const systemColorScheme = useColorScheme();

  let themeMode: "light" | "dark" = "dark";

  try {
    const { settings } = useSettings();
    if (settings.themeMode === "system") {
      themeMode = systemColorScheme === "light" ? "light" : "dark";
    } else {
      themeMode = settings.themeMode;
    }
  } catch {
    // Settings provider not available, use system
    themeMode = systemColorScheme === "light" ? "light" : "dark";
  }

  const isDark = themeMode === "dark";
  const theme = Colors[themeMode];

  return {
    theme,
    isDark,
  };
}
