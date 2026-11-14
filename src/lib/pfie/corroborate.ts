/**
 * Corroboration: plain arithmetic on accepted observations. No model is involved in deciding what is true.
 *
 * - The competition's official site is authoritative for kick-off, status and score.
 * - Without it, a fact is verified only when two different sites state exactly the same thing.
 * - A page that prints a time without a zone can CONFIRM a time another site states with a zone, when one of its
 *   plausible zones (UTC, UK, CET, SAST) gives exactly that instant. It never sets a time on its own.
 * - Sites that disagree (and no official statement) make the fact disputed. Disputed and single-source facts are
 *   kept in the audit tables and never reach public.fixtures.
 */
import { resolveTeam, teamSlug } from "./teams";
import type { Decision, KnownFixture, Observation, Verdict } from "./types";

interface Cluster {
  home: string;
  away: string;
  observations: Observation[];
}

function agree<T>(values: { value: T; domain: string }[]): { value: T; verdict: Verdict } | null {
  if (values.length === 0) return null;
  const groups = new Map<string, Set<string>>();
  for (const v of values) {
    const key = JSON.stringify(v.value);
    groups.set(key, (groups.get(key) ?? new Set()).add(v.domain));
  }
  if (groups.size > 1) return { value: values[0]!.value, verdict: "disputed" };
  const [key, domains] = [...groups.entries()][0]!;
  return { value: JSON.parse(key) as T, verdict: domains.size >= 2 ? "verified" : "single_source" };
}

function decide<T>(
  observations: Observation[],
  pick: (o: Observation) => T | null,
): { value: T; verdict: Verdict } | null {
  const stated = observations
    .map((o) => ({ value: pick(o), domain: o.domain, tier: o.tier }))
    .filter((v): v is { value: T; domain: string; tier: Observation["tier"] } => v.value !== null);
  const official = stated.filter((v) => v.tier === "official");
  if (official.length > 0) {
    const result = agree(official);
    // Official pages that contradict each other are a dispute; one official statement is enough otherwise.
    return (
      result && {
        value: result.value,
        verdict: result.verdict === "disputed" ? "disputed" : "verified",
      }
    );
  }
  return agree(stated);
}

export function corroborate(input: {
  competitionKey: string;
  season: number;
  observations: Observation[];
  known: KnownFixture[];
}): { decisions: Decision[]; ambiguous: Observation[] } {
  const registry: string[] = [...new Set(input.known.flatMap((k) => [k.home, k.away]))];
  const clusters = new Map<string, Cluster>();
  const ambiguous: Observation[] = [];
  const tierOrder = { official: 0, trusted: 1, other: 2 } as const;
  const ordered = [...input.observations].sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

  // Names from the official site (seen first) become the canonical spelling for teams not already known.
  const canonical = (name: string): string | null => {
    const hit = resolveTeam(name, registry);
    if (hit === "ambiguous") return null;
    if (hit) return hit;
    registry.push(name);
    return name;
  };

  for (const o of ordered) {
    const home = canonical(o.home);
    const away = canonical(o.away);
    if (!home || !away || home === away) {
      ambiguous.push(o);
      continue;
    }
    const key = `${home}|${away}`;
    const cluster = clusters.get(key) ?? { home, away, observations: [] };
    cluster.observations.push(o);
    clusters.set(key, cluster);
  }

  const decisions: Decision[] = [];
  for (const c of clusters.values()) {
    const existing = input.known.find((k) => k.home === c.home && k.away === c.away) ?? null;
    let kickoff = decide(c.observations, (o) => o.kickoffUtc);
    if (kickoff?.verdict === "single_source") {
      const stated = kickoff.value;
      const statedBy = new Set(
        c.observations.filter((o) => o.kickoffUtc === stated).map((o) => o.domain),
      );
      const confirmed = c.observations.some(
        (o) =>
          !statedBy.has(o.domain) && !o.kickoffUtc && (o.kickoffCandidates ?? []).includes(stated),
      );
      if (confirmed) kickoff = { value: stated, verdict: "verified" };
    }
    const final = decide(
      c.observations.filter((o) => o.status === "finished"),
      (o) => (o.homeScore !== null && o.awayScore !== null ? [o.homeScore, o.awayScore] : null),
    );
    const off = decide(
      c.observations.filter((o) => ["postponed", "abandoned", "cancelled"].includes(o.status)),
      (o) => o.status,
    );
    // A match some sites call finished and others call postponed is disputed whatever the counts say.
    const conflict = final !== null && off !== null;

    let status: Decision["status"] = existing?.status ?? "scheduled";
    let statusVerdict: Verdict = "verified";
    let homeScore: number | null = null;
    let awayScore: number | null = null;
    if (conflict) statusVerdict = "disputed";
    else if (final) {
      statusVerdict = final.verdict;
      if (final.verdict === "verified") {
        status = "finished";
        [homeScore, awayScore] = [final.value[0] ?? null, final.value[1] ?? null];
      }
    } else if (off) {
      statusVerdict = off.verdict;
      if (off.verdict === "verified") status = off.value;
    }

    const kickoffVerified = kickoff?.verdict === "verified";
    const kickoffAt = kickoffVerified && kickoff ? kickoff.value : (existing?.kickoffAt ?? null);
    const kickoffVerdict: Verdict = kickoff?.verdict ?? "single_source";

    let publish = true;
    let reason = "ok";
    if (!kickoffAt) {
      publish = false;
      reason = kickoff ? `kick-off ${kickoff.verdict}` : "no kick-off time with a known time zone";
    } else if (statusVerdict !== "verified") {
      // Keep an existing fixture as it is; a new one is still worth listing if its kick-off is verified.
      publish = !existing && kickoffVerified;
      reason = `result ${statusVerdict}`;
      status = existing?.status ?? "scheduled";
      homeScore = awayScore = null;
    } else if (existing && !kickoffVerified && status === existing.status) {
      publish = false;
      reason = "nothing new verified";
    }

    decisions.push({
      home: c.home,
      away: c.away,
      providerRef:
        existing?.providerRef ??
        `${input.competitionKey}:${input.season}:${teamSlug(c.home)}:${teamSlug(c.away)}`,
      kickoffAt,
      kickoffVerdict,
      status,
      statusVerdict,
      homeScore,
      awayScore,
      publish,
      reason,
      sources: [...new Set(c.observations.map((o) => o.domain))],
    });
  }
  return { decisions, ambiguous };
}
