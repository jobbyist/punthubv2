import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type SessionValue = {
  isGuest: boolean;
  enterGuest: () => void;
  exitGuest: () => void;
  openEarlyAccess: (reason?: string) => void;
  closeEarlyAccess: () => void;
  earlyAccessOpen: boolean;
  reason: string | undefined;
};

const SessionContext = createContext<SessionValue | null>(null);

const STORAGE_KEY = "puntr:guest";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();

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

  const openEarlyAccess = useCallback((r?: string) => {
    setReason(r);
    setEarlyAccessOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      isGuest,
      enterGuest,
      exitGuest,
      openEarlyAccess,
      closeEarlyAccess: () => setEarlyAccessOpen(false),
      earlyAccessOpen,
      reason,
    }),
    [isGuest, enterGuest, exitGuest, openEarlyAccess, earlyAccessOpen, reason],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
