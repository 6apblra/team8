import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "@teamup_settings";

let hapticsEnabled = true;

// Load setting on module init
AsyncStorage.getItem(SETTINGS_KEY).then((stored) => {
  if (stored) {
    try {
      const settings = JSON.parse(stored);
      hapticsEnabled = settings.hapticsEnabled ?? true;
    } catch {
      // ignore
    }
  }
});

export function setHapticsEnabled(enabled: boolean) {
  hapticsEnabled = enabled;
}

export async function impactAsync(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium,
) {
  if (hapticsEnabled) {
    await Haptics.impactAsync(style);
  }
}

export async function notificationAsync(
  type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType
    .Success,
) {
  if (hapticsEnabled) {
    await Haptics.notificationAsync(type);
  }
}

export async function selectionAsync() {
  if (hapticsEnabled) {
    await Haptics.selectionAsync();
  }
}

export { Haptics };
