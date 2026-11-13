/**
 * Launch gate (migration 20261113170000). Live MVP features open to everyone at `launch_at` (1 Dec 2026 00:00 SAST).
 * Before that only admins and members an admin has given Early access can use them. The database enforces this
 * (picks, transfers, credit spends); this hook only decides what the app shows.
 */
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_LAUNCH_AT = "2026-11-30T22:00:00Z";

export interface GateState {
  open: boolean;
  launched: boolean;
  launchAt: string;
  loading: boolean;
}

/** Pure decision, used by the hook and tested: open after launch, or before it for admins and testers. */
export function gateOpen(
  now: Date,
  launchAt: string,
  isAdmin: boolean,
  earlyAccess: boolean,
): boolean {
  return now.getTime() >= Date.parse(launchAt) || isAdmin || earlyAccess;
}

export function useLaunchGate(isAdmin: boolean): GateState {
  const [state, setState] = useState<GateState>({
    open: gateOpen(new Date(), DEFAULT_LAUNCH_AT, isAdmin, false),
    launched: Date.now() >= Date.parse(DEFAULT_LAUNCH_AT),
    launchAt: DEFAULT_LAUNCH_AT,
    loading: true,
  });
  useEffect(() => {
    let active = true;
    void (supabase as unknown as SupabaseClient).rpc("mvp_status").then(({ data, error }) => {
      if (!active) return;
      if (error || !data) {
        // Function not reachable: fall back to the date and the admin role (never more open than that).
        setState((s) => ({
          ...s,
          open: gateOpen(new Date(), DEFAULT_LAUNCH_AT, isAdmin, false),
          loading: false,
        }));
        return;
      }
      const d = data as { open?: boolean; launched?: boolean; launch_at?: string };
      setState({
        open:
          d.open === true || gateOpen(new Date(), d.launch_at ?? DEFAULT_LAUNCH_AT, isAdmin, false),
        launched: d.launched === true,
        launchAt: d.launch_at ?? DEFAULT_LAUNCH_AT,
        loading: false,
      });
    });
    return () => {
      active = false;
    };
  }, [isAdmin]);
  return state;
}
