import { useId } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n/provider";
import {
  comingSoonLocales,
  enabledLocales,
  locales,
  previewLocales,
  type LocaleCode,
} from "@/locales/config";

/**
 * Lists enabled languages, then (for admins) languages still in review, then languages coming soon with a
 * badge. Only enabled languages are saved to a member's profile; a review language is a preview cookie.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { t } = useTranslation("common");
  const { locale, setLocale } = useLocale();
  const { profile, refreshProfile, isAdmin } = useSession();
  const id = useId();

  const enabled = enabledLocales();
  const preview = isAdmin ? previewLocales() : [];
  // A visitor already on a preview language (cookie set by an admin's choice) can still see it selected.
  const current = previewLocales().find((l) => l.code === locale && !preview.includes(l));
  const soon = comingSoonLocales();
  const selectable = [...enabled, ...preview, ...(current ? [current] : [])];
  if (selectable.length + soon.length < 2) return null;

  const isPreview = (code: string) => previewLocales().some((l) => l.code === code);

  return (
    <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <label htmlFor={id} className="text-muted-foreground">
        {t("language.label")}
      </label>
      <Select
        value={locale}
        onValueChange={(value) => {
          const code = value as LocaleCode;
          const previewing = isPreview(code);
          setLocale(code, { preview: previewing });
          // Signed-in members keep an enabled language on their profile. Review languages and the dev
          // pseudo-locale are never saved there.
          if (profile && !previewing && locales.some((l) => l.code === code && l.enabled)) {
            void supabase
              .from("profiles")
              .update({ language: code })
              .eq("id", profile.id)
              .then(() => refreshProfile());
          }
        }}
      >
        <SelectTrigger id={id} className="h-9 min-w-[11rem] gap-2 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {selectable.map((l) => (
            <SelectItem key={l.code} value={l.code} lang={l.code}>
              <span className="flex items-center gap-2">
                {l.nativeName}
                {isPreview(l.code) && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                    {t("language.inReview")}
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
          {soon.map((l) => (
            <SelectItem key={l.code} value={l.code} lang={l.code} disabled>
              <span className="flex items-center gap-2">
                {l.nativeName}
                <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                  {t("language.comingSoon")}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
