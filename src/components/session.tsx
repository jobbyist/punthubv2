import { useRouter } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { analytics, trackEvent } from "@/lib/analytics";

type SessionValue = {
  isGuest: boolean;
  enterGuest: () => void;
  exitGuest: () => void;
  /** Opens the early-access form. Without a plan the user is sent to pricing first. */
  openEarlyAccess: (reason?: string, plan?: string) => void;
  openEarlyAccessPopup: (reason?: string) => void;
  closeEarlyAccess: () => void;
  earlyAccessOpen: boolean;
  reason: string | undefined;
  plan: string | undefined;
};

const SessionContext = createContext<SessionValue | null>(null);

const STORAGE_KEY = "puntr:guest";

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
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

  const openEarlyAccess = useCallback(
    (r?: string, selectedPlan?: string) => {
      if (!selectedPlan) {
        setReason(r);
        setEarlyAccessOpen(false);
        trackEvent("early_access_plan_required", { source: r ?? "unspecified" });
        toast("Pick a plan first", { description: "Choose the package you want reserved for the beta." });
        void router.navigate({ to: "/pricing" });
        return;
      }
      setReason(r);
      setPlan(selectedPlan);
      setEarlyAccessOpen(true);
      analytics.planSelected(selectedPlan, r ?? "pricing");
      analytics.earlyAccessOpened(selectedPlan);
    },
    [router],
  );

  /** Opens the early-access modal directly (defaults to Free Plan). Used for timed homepage trigger. */
  const openEarlyAccessPopup = useCallback((r?: string) => {
    const selectedPlan = "Free Plan";
    setReason(r ?? "Limited early-access spots — join the Puntr community today!");
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
