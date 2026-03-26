import enUS from "./locales/en-US";
import ru from "./locales/ru";
import zhCN from "./locales/zh-CN";
import type { SupportedLocale, Translations } from "./types";

export const FALLBACK_LOCALE: SupportedLocale = "en-US";

const localeMap: Record<SupportedLocale, Translations> = {
  "en-US": enUS,
  ru,
  "zh-CN": zhCN,
};

export function resolveBrowserLocale(): SupportedLocale {
  const preferred = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const language of preferred) {
    const normalized = language.toLowerCase();

    if (normalized.startsWith("ru")) {
      return "ru";
    }

    if (normalized.startsWith("zh")) {
      return "zh-CN";
    }

    if (normalized.startsWith("en")) {
      return "en-US";
    }
  }

  return FALLBACK_LOCALE;
}

export function getTranslations(locale: SupportedLocale): Translations {
  return localeMap[locale] ?? localeMap[FALLBACK_LOCALE];
}
