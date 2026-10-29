import { useTranslation } from "react-i18next";

import { useLocale } from "@/lib/i18n/provider";
import { enabledLocales, type LocaleCode } from "@/locales/config";

/** Lists enabled languages only. With a single enabled language there is nothing to switch, so it renders nothing. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { t } = useTranslation("common");
  const { locale, setLocale } = useLocale();
  const options = enabledLocales();
  if (options.length < 2) return null;
  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className="text-muted-foreground">{t("language.label")}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as LocaleCode)}
        className="h-9 border border-input bg-background px-2 text-sm"
      >
        {options.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
