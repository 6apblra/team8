import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "@teamup_settings";

export type ThemeMode = "system" | "light" | "dark";

interface Settings {
  themeMode: ThemeMode;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
}

interface SettingsContextType {
  settings: Settings;
  setThemeMode: (mode: ThemeMode) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  isLoading: boolean;
}

const defaultSettings: Settings = {
  themeMode: "system",
  hapticsEnabled: true,
  soundEnabled: true,
};

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
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
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

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setThemeMode,
        setHapticsEnabled,
        setSoundEnabled,
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
