import { useCallback, useEffect, useState } from "react";

import { useSession } from "@/components/session";
import { fetchBalance, fetchRewardsStatus, POINTS_CHANGED } from "@/lib/rewards-data";

/** Whether PuntPoints are switched on, and the signed-in member's balance. */
export function usePoints() {
  const { profile } = useSession();
  const [enabled, setEnabled] = useState(false);
  const [rewardsEnabled, setRewardsEnabled] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await fetchRewardsStatus();
      setEnabled(s.points);
      setRewardsEnabled(s.rewards);
      if (s.points && profile) setBalance(await fetchBalance());
      else setBalance(null);
    } catch {
      setBalance(null);
    }
  }, [profile]);

  useEffect(() => {
    void load();
    window.addEventListener(POINTS_CHANGED, load);
    return () => window.removeEventListener(POINTS_CHANGED, load);
  }, [load]);

  return { enabled, rewardsEnabled, balance };
}
