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
import { removeCurrentPushDevice } from "@/lib/push-notifications";
import { claimFoundingSpot } from "@/lib/accounts.functions";
import { notifyPointsChanged } from "@/lib/rewards-data";
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
> & { avatar_url?: string | null };

type SessionValue = {
  /** True until the first session and profile lookup has finished. */
  loading: boolean;
  user: User | null;
  /** Null when signed out, or signed in but still to complete onboarding. */
  profile: Profile | null;
  isSignedIn: boolean;
  isAdmin: boolean;
  /** The sign-in email has been confirmed (by a code or link). */
  emailConfirmed: boolean;
  /** Two-factor sign-in is on. Null until known. */
  hasMfa: boolean | null;
  /** Re-reads the user and their factors after a confirmation or a two-factor change. */
  refreshSecurity: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const S¶»§q«^