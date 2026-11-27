import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";

import { useSession } from "@/components/session";
import { supabase } from "@/integrations/supabase/client";
import { fetchFavourites, hasFavourites, type Favourites } from "@/lib/preferences";
import {
  EMPTY_SIGNALS,
  deriveSegment,
  foldVisit,
  nextBestAction,
  readSignals,
  writeSignals,
  type LocalSignals,
  type NextAction,
  type Segment,
} from "@/lib/user-context";

export interface UserContextValue {
  /** False until the session and this device's signals are known (server render and first paint). */
  ready: boolean;
  segment: Segment;
  isSignedIn: boolean;
  isStandalone: boolean;
  pickCount: number | null;
  favourites: Favourites | null;
  hasFavourites: boolean;
  local: LocalSignals;
  next: NextAction;
  /** Hide a tip or card for good on this device. */
  dismiss: (id: string) => void;
  isDismissed: (id: string) => boolean;
}

const Ctx = createContext<UserContextValue | null>(null);

function standalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * One place for context awareness. Mounted once inside SessionProvider. Server HTML and the first client render
 * use neutral defaults (ready = false), so nothing personal flashes or mismatches during hydration.
 */
export function UserContextProvider({ children }: { children: ReactNode }) {
  const { loading, user, isSignedIn } = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [local, setLocal] = useState<LocalSignals>(EMPTY_SIGNALS);
  const [mounted, setMounted] = useState(false);
  const [isStandalone, setStandalone] = useState(false);
  const [pickCount, setPickCount] = useState<number | null>(null);
  const [favourites, setFavourites] = useState<Favourites | null>(null);

  useEffect(() => {
    setLocal(readSignals());
    setStandalone(standalone());
    setMounted(true);
  }, []);

  // Every page view updates this device's signals.
  useEffect(() => {
    if (!mounted) return;
    setLocal((prev) => {
      const next = foldVisit(prev, path);
      writeSignals(next);
      return next;
    });
  }, [path, mounted]);

  // The member's own account signals, once per sign-in.
  useEffect(() => {
    if (!user) {
      setPickCount(null);
      setFavourites(null);
      return;
    }
    let live = true;
    void supabase
      .from("predictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        if (live) setPickCount(count ?? 0);
      });
    fetchFavourites(user.id)
      .then((f) => live && setFavourites(f))
      .catch(() => live && setFavourites(null));
    return () => {
      live = false;
    };
  }, [user]);

  // Picks posted in this session count straight away (the pick form fires puntr:pick-posted).
  useEffect(() => {
    const bump = () => setPickCount((n) => (n ?? 0) + 1);
    window.addEventListener("puntr:pick-posted", bump);
    return () => window.removeEventListener("puntr:pick-posted", bump);
  }, []);

  const dismiss = useCallback((id: string) => {
    setLocal((prev) => {
      const next = { ...prev, dismissed: [...new Set([...prev.dismissed, id])] };
      writeSignals(next);
      return next;
    });
  }, []);

  const value = useMemo<UserContextValue>(() => {
    const fav = hasFavourites(favourites);
    const input = { isSignedIn, pickCount, hasFavourites: fav, isStandalone, local };
    return {
      ready: mounted && !loading,
      segment: deriveSegment(input),
      isSignedIn,
      isStandalone,
      pickCount,
      favourites,
      hasFavourites: fav,
      local,
      next: nextBestAction(input),
      dismiss,
      isDismissed: (id: string) => local.dismissed.includes(id),
    };
  }, [mounted, loading, isSignedIn, pickCount, favourites, isStandalone, local, dismiss]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserContext(): UserContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUserContext must be used inside UserContextProvider");
  return ctx;
}

/**
 * Declarative show/hide by context. Renders nothing until context is ready unless `fallback` is given.
 * Example: <ShowFor segments={["guest-first", "guest-returning"]}>…</ShowFor>
 */
export function ShowFor({
  segments,
  signedIn,
  unless,
  children,
  fallback = null,
}: {
  segments?: Segment[];
  signedIn?: boolean;
  /** Hide when this tip id has been dismissed on this device. */
  unless?: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const ctx = useUserContext();
  if (!ctx.ready) return <>{fallback}</>;
  if (segments && !segments.includes(ctx.segment)) return null;
  if (signedIn !== undefined && signedIn !== ctx.isSignedIn) return null;
  if (unless && ctx.isDismissed(unless)) return null;
  return <>{children}</>;
}
