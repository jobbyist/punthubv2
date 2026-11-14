import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Shared statement of Puntr's independence from bookmaker and commercial influence. */
export function BookmakerIndependenceNotice({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation("common");
  return (
    <section
      className={`card-surface ${compact ? "p-4" : "p-5 sm:p-6"}`}
      aria-labelledby="bookmaker-independence-title"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="bookmaker-independence-title" className="font-semibold text-foreground">
            {t("independence.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("independence.p1")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("independence.p2")}
          </p>
        </div>
      </div>
    </section>
  );
}
