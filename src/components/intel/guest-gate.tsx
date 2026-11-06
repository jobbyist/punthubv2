import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";

/** How many items guests can read in full before proprietary fields are blurred. */
export const FREE_ITEMS = 2;

/** True when the proprietary fields of the item at `index` should be blurred for the current visitor. */
export function useGated() {
  const { isSignedIn, loading } = useSession();
  // While the session is loading, treat as signed in to avoid flashing the gate at members.
  const guest = !loading && !isSignedIn;
  return (index: number) => guest && index >= FREE_ITEMS;
}

/**
 * Blurs proprietary fields for guests. The fixture context stays outside this wrapper and readable.
 * aria-hidden goes only on the visual (blurred) container; the text is still in the HTML.
 */
export function Blurred({ gated, children }: { gated: boolean; children: ReactNode }) {
  const { t } = useTranslation("intel");
  if (!gated) return <>{children}</>;
  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none select-none blur-[5px]">
        {children}
      </div>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-md" aria-hidden="true" />
      <span className="sr-only">{t("gate.srHidden")}</span>
    </div>
  );
}

/**
 * Founding conversion card. Two placements:
 * - inline (lists): put it right before the first gated item; a negative bottom margin floats it over the blurred
 *   items below.
 * - `top` (tables): absolutely positioned inside a `relative` wrapper, that far from the top (past the free rows).
 * Renders nothing for members.
 */
export function FoundingGateCard({ as: Tag = "div", top }: { as?: "div" | "li"; top?: string }) {
  const { isSignedIn, loading } = useSession();
  if (loading || isSignedIn) return null;
  if (top)
    return (
      <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top }}>
        <GateCardInner overlap={false} />
      </div>
    );
  return (
    <Tag className="relative z-10 list-none">
      <GateCardInner overlap />
    </Tag>
  );
}

function GateCardInner({ overlap }: { overlap: boolean }) {
  const { t } = useTranslation("intel");
  return (
    <div className={`flex justify-center px-4 py-4 ${overlap ? "-mb-64" : ""}`}>
      <aside
        aria-labelledby="founding-gate-title"
        className="pointer-events-auto w-full max-w-md border border-ink bg-background p-6 text-center shadow-xl"
      >
        <span className="inline-block bg-primary px-3 py-1 text-[11px] font-bold tracking-wide text-primary-foreground">
          {t("gate.tag")}
        </span>
        <h2 id="founding-gate-title" className="mt-3 text-xl">
          {t("gate.title")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("gate.body")}</p>
        <Button asChild size="lg" className="mt-4 h-11 w-full">
          <Link to="/join">{t("gate.cta")}</Link>
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">{t("gate.reassure")}</p>
      </aside>
    </div>
  );
}
