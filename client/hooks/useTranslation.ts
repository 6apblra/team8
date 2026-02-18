import { useCallback } from "react";
import i18n from "@/lib/i18n";
import { useSettings } from "@/lib/settings-context";

export function useTranslation() {
  const { settings } = useSettings();

  // Re-render when language changes by depending on settings.language
  const t = useCallback(
    (key: string, options?: Record<string, string | number>) => {
      // Ensure i18n.locale is in sync (it's set in settings-context, but this ensures reactivity)
      return i18n.t(key, options);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.language],
  );

  return { t, locale: i18n.locale };
}
