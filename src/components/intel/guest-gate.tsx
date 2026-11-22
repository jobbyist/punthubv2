import { type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
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
 * Founding conversion card. Two placemen¶»§q«^