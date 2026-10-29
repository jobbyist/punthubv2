import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n/provider";
import { isEnabledLocale } from "@/locales/config";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Pick<
  Tables<"profiles">,
  | "id"
  | "username"
  | "display_name"
  | "founding_number"
  | "language"
  | "role"
  | "referral_code"
  | "marketing_opt_in"
  | "is_banned"
>;

type SessionValue = {
  /** True until the first session and profile lookup has finished. */
  loading: boolean;
  user: User | null;
  /** Null when signed out, or signed in but still to complete onboarding. */
  profile: Profile | null;
  isSignedIn: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

const PROFILE_COLUMNS =
  "id, username, display_name, founding_number, language, role, referral_code, marketing_opt_in, is_banned";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { locale, setLocale } = useLocale();

  // Profile language wins over the cookie and Accept-Language once the profile has loaded.
  useEffect(() => {
    if (profile && profile.language !== locale && isEnabledLocale(profile.language)) {
      setLocale(profile.language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.language]);

  const loadProfile = useCallback(async (userId: string | null) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id ?? null);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Defer: calling supabase inside this callback can deadlock the auth client.
      setTimeout(() => {
        void loadProfile(next?.user.id ?? null);
      }, 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(
    () => loadProfile(session?.user.id ?? null),
    [loadProfile, session],
  );

  const value = useMemo<SessionValue>(
    () => ({
      loading,
      user: session?.user ?? null,
      profile,
      isSignedIn: !!profile,
      isAdmin: profile?.role === "admin" && !profile.is_banned,
      signOut,
      refreshProfile,
    }),
    [loading, session, profile, signOut, refreshProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
