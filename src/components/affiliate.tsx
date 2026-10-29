import { useTranslation } from "react-i18next";

import { platforms } from "@/lib/mock-data";
import { AFFILIATES_ENABLED } from "@/lib/flags";

/** Placeholder slot. Renders nothing until AFFILIATES_ENABLED; P12 replaces it with real partner placements. */
export function AffiliateBanner({ label = "970 x 90" }: { label?: string }) {
  const { t } = useTranslation("affiliate");
  if (!AFFILIATES_ENABLED) return null;
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/25 bg-primary-soft/50 px-6 py-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">{t("banner.title")}</p>
      <p className="text-xs text-muted-foreground/80">{label}</p>
    </div>
  );
}

export function PlatformRail() {
  const { t } = useTranslation("affiliate");
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {platforms.map((p) => (
        <div
          key={p.name}
          className="grid h-16 min-w-[100px] sm:min-w-[130px] flex-1 place-items-center rounded-xl border border-border bg-card px-3 sm:px-5 shadow-soft transition-transform hover:-translate-y-0.5"
        >
          <img
            src={p.logo}
            alt={t("logoAlt", { name: p.name })}
            loading="lazy"
            className="h-6 w-auto max-w-full object-contain sm:h-8"
          />
        </div>
      ))}
    </div>
  );
}
