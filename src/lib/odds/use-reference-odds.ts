import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type ReferenceQuote = { price: number; capturedAt: string };

/**
 * Latest pre-match reference prices for one fixture, keyed `market:selection`. The database function returns rows
 * only for 18+ attested members who are not on a break or suspended, and nothing once the match has started, so an
 * ineligible caller simply gets an empty map. Never shows the bookmaker.
 */
export function useReferenceOdds(fixtureId: string | null, enabled: boolean) {
  const [quotes, setQuotes] = useState<Record<string, ReferenceQuote>>({});
  useEffect(() => {
    if (!fixtureId || !enabled) {
      setQuotes({});
      return;
    }
    let cancelled = false;
    void supabase.rpc("reference_odds", { p_fixture_ids: [fixtureId] }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        // Before the migration is applied, or a transient error: show no reference, never block the form.
        setQuotes({});
        return;
      }
      const next: Record<string, ReferenceQuote> = {};
      for (const r of data ?? []) {
        next[`${r.market}:${r.selection}`] = { price: Number(r.price), capturedAt: r.captured_at };
      }
      setQuotes(next);
    });
    return () => {
      cancelled = true;
    };
  }, [fixtureId, enabled]);
  return quotes;
}
