import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import i18n from "@/lib/i18n";

const SETTINGS_KEY = "@teamup_settings";

export type ThemeMode = "system" | "light" | "dark";
export type LanguageMode = "system" | "en" | "ru";

interface Settings {
  themeMode: ThemeMode;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  language: LanguageMode;
}

interface SettingsContextType {
  settings: Settings;
  setThemeMode: (mode: ThemeMode) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setLanguage: (lang: LanguageMode) => void;
  isLoading: boolean;
}

const defaultSettings: Settings = {
  themeMode: "system",
  hapticsEnabled: true,
  soundEnabled: true,
  language: "system",
};

function resolveLocale(language: LanguageMode): string {
  if (language === "system") {
    const deviceLocale = getLocales()[0]?.languageCode ?? "en";
    return deviceLocale === "ru" ? "ru" : "en";
  }
  return language;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Settings>;
        const merged = { ...defaultSettings, ...parsed };
        setSettings(merged);
        i18n.locale = resolveLocale(merged.language);
      } else {
        i18n.locale = resolveLocale(defaultSettings.language);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      i18n.locale = resolveLocale(defaultSettings.language);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    const newSettings = { ...settings, themeMode: mode };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const setHapticsEnabled = (enabled: boolean) => {
    const newSettings = { ...settings, hapticsEnabled: enabled };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const setSoundEnabled = (enabled: boolean) => {
    const newSettings = { ...settings, soundEnabled: enabled };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const setLanguage = (lang: LanguageMode) => {
    i18n.locale = resolveLocale(lang);
    const newSettings = { ...settings, language: lang };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setThemeMode,
        setHapticsEnabled,
        setSoundEnabled,
        setLanguage,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
