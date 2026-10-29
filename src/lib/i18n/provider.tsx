import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { I18nextProvider } from "react-i18next";

import { writeLanguageCookie } from "@/lib/i18n/locale";
import { createI18n } from "@/lib/i18n";
import type { LocaleCode } from "@/locales/config";

type LocaleValue = { locale: LocaleCode; setLocale: (code: LocaleCode) => void };

const LocaleContext = createContext<LocaleValue | null>(null);

export function LocaleProvider({
  initial,
  children,
}: {
  initial: LocaleCode;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<LocaleCode>(initial);
  // One instance per provider mount: created synchronously, so SSR and first client render match.
  const i18nRef = useRef<ReturnType<typeof createI18n> | null>(null);
  if (!i18nRef.current) i18nRef.current = createI18n(initial);
  const i18n = i18nRef.current;

  const setLocale = useCallback(
    (code: LocaleCode) => {
      writeLanguageCookie(code);
      void i18n.changeLanguage(code);
      if (typeof document !== "undefined") document.documentElement.lang = code;
      setLocaleState(code);
    },
    [i18n],
  );

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return (
    <LocaleContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}
