import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Command as CommandIcon, ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchUpcomingFixtures, type UpcomingFixture } from "@/lib/fixtures";
import { fetchTableKeys } from "@/lib/hub-data";
import { fetchStandings, type StandingRow } from "@/lib/standings-data";
import { computeForms, fetchFinishedFor, type TeamForm } from "@/lib/match/form";

type TeamHit = { team: string; fixture: UpcomingFixture; position: number | null; form: TeamForm | null; rating: number | null };

export function QuickSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fixtures, setFixtures] = useState<UpcomingFixture[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [forms, setForms] = useState<Record<string, TeamForm>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    const tap = () => setOpen(true);
    window.addEventListener("keydown", key);
    window.addEventListener("puntr:open-search", tap);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("puntr:open-search", tap);
    };
  }, []);

  useEffect(() => {
    if (!open || fixtures.length) return;
    let live = true;
    setLoading(true);
    Promise.all([
      fetchUpcomingFixtures({ days: 60, limit: 500 }),
      fetchTableKeys().then(keys => Promise.all(keys.map(key => fetchStandings(key).catch(() => [] as StandingRow[]))).then(rows => rows.flat())),
    ]).then(([nextFixtures, nextStandings]) => {
      if (live) { setFixtures(nextFixtures); setStandings(nextStandings); }
    }).catch(error => console.error("quick search data failed", error)).finally(() => {
      if (live) setLoading(false);
    });
    return () => { live = false; };
  }, [open, fixtures.length]);

  const teams = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    const names = new Set<string>();
    fixtures.forEach(fixture => {
      if (fixture.home.toLowerCase().includes(term)) names.add(fixture.home);
      if (fixture.away.toLowerCase().includes(term)) names.add(fixture.away);
    });
    standings.forEach(row => { if (row.team.toLowerCase().includes(term)) names.add(row.team); });
    return [...names].slice(0, 8);
  }, [query, fixtures, standings]);

  useEffect(() => {
    if (!teams.length) { setForms({}); return; }
    let live = true;
    fetchFinishedFor(teams).then(rows => { if (live) setForms(computeForms(rows, teams)); })
      .catch(error => console.error("quick search form failed", error));
    return () => { live = false; };
  }, [teams.join("|")]);

  const hits: TeamHit[] = useMemo(() => teams.map(team => {
    const fixture = fixtures.find(item => item.home === team || item.away === team);
    if (!fixture) return null;
    const form = forms[team.toLowerCase()] ?? null;
    const standing = standings.find(item => item.team.toLowerCase() === team.toLowerCase());
    const rating = form?.entries.length
      ? Math.round(form.entries.reduce((sum, entry) => sum + (entry.result === "W" ? 20 : entry.result === "D" ? 10 : 0), 0) / form.entries.length * 5)
      : null;
    return { team, fixture, position: standing?.position ?? null, form, rating };
  }).filter((hit): hit is TeamHit => hit !== null), [teams, fixtures, forms, standings]);

  const go = (fixtureId: string) => {
    setOpen(false);
    setQuery("");
    void navigate({ to: "/match/$fixtureId", params: { fixtureId } });
  };

  return <>
    <Button variant="outline" size="sm" className="fixed bottom-20 left-4 z-40 gap-2 rounded-full border-border bg-background/95 shadow-lg backdrop-blur sm:bottom-6 sm:left-6" onClick={() => setOpen(true)}>
      <Search className="size-4" /><span>Tap to Search</span><kbd className="hidden rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">⌘ K</kbd>
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Quick Search</DialogTitle><DialogDescription>Find a team, its next fixture, league position and recent form.</DialogDescription></DialogHeader>
        <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Chiefs, Pirates, Sundowns..." className="pl-9" /></div>
        <div className="space-y-2">
          {loading && <p className="py-5 text-center text-sm text-muted-foreground">Loading fixtures and standings…</p>}
          {!loading && query.trim().length >= 2 && hits.length === 0 && <p className="py-5 text-center text-sm text-muted-foreground">No upcoming fixture found for that search.</p>}
          {hits.map(hit => <button key={hit.team} type="button" onClick={() => go(hit.fixture.id)} className="w-full rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/50">
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{hit.team}</p><p className="mt-0.5 text-sm text-muted-foreground">{hit.fixture.home} vs {hit.fixture.away}</p><p className="text-xs text-muted-foreground">{hit.fixture.competition} · {new Date(hit.fixture.kickoff_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" })}</p></div><ArrowUpRight className="size-4 text-primary" /></div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-muted px-2.5 py-1">{hit.position ? `League position #${hit.position}` : "Standing unavailable"}</span><span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">{hit.rating !== null ? `Recent form ${hit.rating}/100` : "Form data unavailable"}</span>{hit.form && <span className="rounded-full bg-muted px-2.5 py-1">Last {hit.form.entries.length}: {hit.form.entries.map(entry => entry.result).join(" ")}</span>}</div>
          </button>)}
          {!query && <p className="py-3 text-center text-xs text-muted-foreground"><CommandIcon className="mr-1 inline size-3" />Type at least two characters to search.</p>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
