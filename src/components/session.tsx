import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { analytics, trackEvent } from "@/lib/analytics";

type SessionValue = {
  isGuest: boolean;
  enterGuest: () => void;
  exitGuest: () => void;
  /** Opens the early-access form. Puntr is free at launch, so the plan defaults to Founding Member. */
  openEarlyAccess: (reason?: string, plan?: string) => void;
  openEarlyAccessPopup: (reason?: string) => void;
  closeEarlyAccess: () => void;
  earlyAccessOpen: boolean;
  reason: string | undefined;
  plan: string | undefined;
};

const SessionContext = createContext<SessionValue | null>(null);

const STORAGE_KEY = "puntr:guest";
const FOUNDING_PLAN = "Founding Member";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const [plan, setPlan] = useState<string | undefined>();

  useEffect(() => {
    setIsGuest(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const enterGuest = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setIsGuest(true);
  }, []);

  const exitGuest = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setIsGuest(false);
  }, []);

  const openEarlyAccess = useCallback((r?: string, selectedPlan?: string) => {
    const chosen = selectedPlan ?? FOUNDING_PLAN;
    setReason(r);
    setPlan(chosen);
    setEarlyAccessOpen(true);
    analytics.planSelected(chosen, r ?? "cta");
    analytics.earlyAccessOpened(chosen);
  }, []);

  /** Opens the early-access modal directly (defaults to Free Plan). Used for timed homepage trigger. */
  const openEarlyAccessPopup = useCallback((r?: string) => {
    const selectedPlan = FOUNDING_PLAN;
    setReason(r ?? "Only 100 Founding spots. Join the Puntr community today.");
    setPlan(selectedPlan);
    setEarlyAccessOpen(true);
    analytics.earlyAccessOpened(selectedPlan);
  }, []);

  const value = useMemo(
    () => ({
      isGuest,
      enterGuest,
      exitGuest,
      openEarlyAccess,
      openEarlyAccessPopup,
      closeEarlyAccess: () => setEarlyAccessOpen(false),
      earlyAccessOpen,
      reason,
      plan,
    }),
    [isGuest, enterGuest, exitGuest, openEarlyAccess, openEarlyAccessPopup, earlyAccessOpen, reason, plan],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
