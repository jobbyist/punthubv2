import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n/provider";
import { enabledLocales, locales, type LocaleCode } from "@/locales/config";

/** Lists enabled languages only. With a single enabled language there is nothing to switch, so it renders nothing. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { t } = useTranslation("common");
  const { locale, setLocale } = useLocale();
  const { profile, refreshProfile } = useSession();
  const options = enabledLocales();
  if (options.length < 2) return null;
  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className="text-muted-foreground">{t("language.label")}</span>
      <select
        value={locale}
        onChange={(e) => {
          const code = e.target.value as LocaleCode;
          setLocale(code);
          // Signed-in members keep their choice on their profile. The dev pseudo-locale is never saved.
          if (profile && locales.some((l) => l.code === code)) {
            void supabase
              .from("profiles")
              .update({ language: code })
              .eq("id", profile.id)
              .then(() => refreshProfile());
          }
        }}
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
