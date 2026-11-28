import { useTranslation } from "react-i18next";

export function ProBadge({ aiParticipant = false }: { aiParticipant?: boolean }) {
  const { t } = useTranslation("common");
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span
        className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary"
        aria-label={t("proBadge")}
      >
        {t("proBadge")}
      </span>
      {aiParticipant ? (
        <span className="text-[10px] font-medium text-muted-foreground">
          {t("aiParticipant")}
        </span>
      ) : null}
    </span>
  );
}
