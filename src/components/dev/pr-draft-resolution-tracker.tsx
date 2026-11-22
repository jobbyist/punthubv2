import { CheckCircle2, CircleDashed, Clock3, ExternalLink } from "lucide-react";

type Gate = { label: string; state: "done" | "open" | "deferred" };

type TrackedPr = {
  number: number;
  title: string;
  href: string;
  lane: "Pre-launch" | "Post-launch";
  status: string;
  summary: string;
  nextAction: string;
  gates: Gate[];
};

const TRACKED_PRS: TrackedPr[] = [
  {
    number: 185,
    title: "La Liga source coverage",
    href: "https://github.com/jobbyist/punthubv2/pull/185",
    lane: "Pre-launch",
    status: "Open · Draft",
    summary:
      "Five independent publishers are configured. The focused standings suite passes 47/47, typecheck and Vercel build pass, and inline review threads are resolved.",
    nextAction:
      "Capture a production-like La Liga run with two independent complete tables agreeing on every material statistic, then record owner acceptance of the four shared full-suite baseline failures.",
    gates: [
      { label: "Five-publisher cap and independent identity regression", state: "done" },
      { label: "Standings tests 47/47, typecheck and Vercel build", state: "done" },
      { label: "Inline review threads resolved", state: "done" },
      { label: "Production-like two-publisher consensus evidence", state: "open" },
      { label: "Shared full-suite baseline accepted or repaired", state: "open" },
    ],
  },
  {
    number: 195,
    title: "PFIE evidence foundation",
    href: "https://github.com/jobbyist/punthubv2/pull/195",
    lane: "Pre-launch",
    status: "Open · Draft",
    summary:
      "Evidence tests pass 15/15; targeted formatting/lint, typecheck and Vercel build pass. Distinct source IDs/domains and South African bookmaker licence checks are enforced in the proposed schema.",
    nextAction:
      "Validate the migration in a disposable database, complete schema/RLS/grant review, and reconcile the production migration baseline plus backup/PITR and rollback plan before any production application.",
    gates: [
      { label: "Evidence tests 15/15 and targeted code checks", state: "done" },
      { label: "Inline review findings resolved", state: "done" },
      { label: "Distinct source IDs/domains and ZA licence gate", state: "done" },
      { label: "Disposable-database migration validation", state: "open" },
      { label: "Production migration baseline and rollback approval", state: "open" },
    ],
  },
  {
    number: 196,
    title: "Match intelligence, licensed odds and exclusions",
    href: "https://github.com/jobbyist/punthubv2/pull/196",
    lane: "Post-launch",
    status: "Draft · Deferred",
    summary:
      "Explicitly excluded from the 1 December MVP. It is not a dependency for #185 or #195 and must not consume pre-launch capacity.",
    nextAction:
      "Reopen after launch for a separate scope, legal/data-rights, migration, security, quota and end-to-end test review. Automated odds remain disabled without written rights.",
    gates: [
      { label: "Excluded from the MVP release scope", state: "done" },
      { label: "Post-launch migration and worker review", state: "deferred" },
      { label: "Written odds-data rights and legal approval", state: "deferred" },
      { label: "Security, quota, provenance and end-to-end tests", state: "deferred" },
    ],
  },
];

function GateIcon({ state }: { state: Gate["state"] }) {
  if (state === "done") return <CheckCircle2 className="size-4 text-primary" aria-hidden />;
  if (state === "deferred") return <Clock3 className="size-4 text-muted-foreground" aria-hidden />;
  return <CircleDashed className="size-4 text-amber-600" aria-hidden />;
}

export function PrDraftResolutionTracker() {
  return (
    <section className="space-y-4" aria-labelledby="pr-draft-tracker-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Engineering delivery
          </p>
          <h2 id="pr-draft-tracker-heading" className="text-lg">
            PR draft resolution tracker
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Pre-launch: #185 and #195 · Post-launch: #196
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {TRACKED_PRS.map((pr) => {
          const done = pr.gates.filter((gate) => gate.state === "done").length;
          const total = pr.gates.length;
          return (
            <article key={pr.number} className="card-surface flex min-w-0 flex-col gap-4 p-4">
              <header className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    PR #{pr.number}
                  </span>
                  <span className="border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                    {pr.lane}
                  </span>
                </div>
                <h3 className="font-semibold leading-snug">{pr.title}</h3>
                <p className="text-xs text-muted-foreground">{pr.status}</p>
                <p className="text-sm text-muted-foreground">{pr.summary}</p>
              </header>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Resolution gates</span>
                  <span className="tabular-nums text-muted-foreground">
                    {done}/{total} cleared
                  </span>
                </div>
                <div
                  className="h-1.5 w-full bg-muted"
                  role="progressbar"
                  aria-label={`PR #${pr.number} resolution gates`}
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={done}
                >
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(done / total) * 100}%` }}
                  />
                </div>
                <ul className="space-y-2">
                  {pr.gates.map((gate) => (
                    <li key={gate.label} className="flex items-start gap-2 text-xs">
                      <GateIcon state={gate.state} />
                      <span className="min-w-0 flex-1">{gate.label}</span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {gate.state === "done"
                          ? "Done"
                          : gate.state === "open"
                            ? "Open"
                            : "Deferred"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto border-t border-border pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Next action
                </p>
                <p className="mt-1 text-xs leading-relaxed">{pr.nextAction}</p>
                <a
                  href={pr.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Open pull request <ExternalLink className="size-3" aria-hidden />
                </a>
              </div>
            </article>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Gate progress is an operational snapshot, not GitHub CI status or merge authorization.
        Recheck the pull request and its required checks before merging.
      </p>
    </section>
  );
}
