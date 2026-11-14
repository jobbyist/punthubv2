import { useEffect, useMemo, useState } from "react";

import { computeForms, fetchFinishedFor, type FinishedRow, type TeamForm } from "@/lib/match/form";

/** Form for every team in view, from one query. Empty until loaded; failures leave cards without form. */
export function useTeamForms(teams: string[]): {
  forms: Record<string, TeamForm>;
  rows: FinishedRow[];
} {
  const key = useMemo(() => Array.from(new Set(teams)).sort().join("|"), [teams]);
  const [rows, setRows] = useState<FinishedRow[]>([]);
  useEffect(() => {
    if (!key) return;
    let live = true;
    fetchFinishedFor(key.split("|"))
      .then((r) => live && setRows(r))
      .catch((e: unknown) => console.error("form load failed", e));
    return () => {
      live = false;
    };
  }, [key]);
  const forms = useMemo(() => computeForms(rows, key ? key.split("|") : []), [rows, key]);
  return { forms, rows };
}
