import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from "react";
import {
  FALLBACK_LOCALE,
  getTranslations,
  resolveBrowserLocale,
} from "./index";
import type { SupportedLocale, TranslationKey } from "./types";

type I18nContextValue = {
  locale: SupportedLocale;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const locale = useMemo(() => resolveBrowserLocale(), []);
  const translations = useMemo(() => getTranslations(locale), [locale]);
  const fallbackTranslations = useMemo(
    () => getTranslations(FALLBACK_LOCALE),
    [],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey) =>
      translations[key] ?? fallbackTranslations[key] ?? key,
    [fallbackTranslations, translations],
  );

  const value = useMemo(() => ({ locale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
