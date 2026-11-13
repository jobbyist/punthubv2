import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { useLaunchGate } from "@/lib/launch-gate";

/** Card shown in place of a live feature before launch. */
export function OpensAtLaunch({ feature }: { feature: string }) {
  const { t } = useTranslation("common");
  return (
    <div className="card-surface p-6 text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">{t("gate.badge")}</p>
      <h2 className="mt-2 font-display text-2xl font-bold">{t("gate.title", { feature })}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("gate.body")}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm font-semibold">
        <Link to="/practice" className="text-primary hover:underline">
          {t("gate.practice")}
        </Link>
        <Link to="/roadmap" className="text-primary hover:underline">
          {t("gate.roadmap")}
        </Link>
      </div>
    </div>
  );
}

/** Renders children only when live features are open to this member; otherwise the "opens 1 December" card. */
export function LaunchGate({ feature, children }: { feature: string; children: React.ReactNode }) {
  const { isAdmin } = useSession();
  const gate = useLaunchGate(isAdmin);
  if (gate.loading && !gate.open)
    return <div className="h-32 animate-pulse rounded-lg bg-muted" aria-hidden />;
  if (!gate.open) return <OpensAtLaunch feature={feature} />;
  return (
    <>
      {!gate.launched && (
        <p className="mb-4 rounded-lg border border-primary/40 bg-primary-soft px-3 py-2 text-xs font-semibold text-primary">
          <PreviewNote />
        </p>
      )}
      {children}
    </>
  );
}

function PreviewNote() {
  const { t } = useTranslation("common");
  return <>{t("gate.preview")}</>;
}
