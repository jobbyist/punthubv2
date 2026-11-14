import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useLocale } from "@/lib/i18n/provider";

/** Shown at the top of every translated legal page: the English page is the one that applies. */
export function LegalTranslationNotice() {
  const { t } = useTranslation("pages");
  const { setLocale } = useLocale();
  return (
    <div
      role="note"
      className="mb-6 flex flex-wrap items-start gap-3 rounded-xl border border-primary/30 bg-primary-soft/60 p-4 text-sm"
    >
      <Languages className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-0 flex-1">{t("legal.translationNotice")}</p>
      <button
        type="button"
        onClick={() => setLocale("en-ZA")}
        className="font-semibold text-primary underline-offset-4 hover:underline"
      >
        {t("legal.readEnglish")}
      </button>
    </div>
  );
}
