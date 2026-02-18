import { I18n } from "i18n-js";
import en from "@/locales/en";
import ru from "@/locales/ru";

const i18n = new I18n({ en, ru });

i18n.defaultLocale = "en";
i18n.locale = "en";
i18n.enableFallback = true;

export default i18n;
