import { ShieldCheck } from "lucide-react";

/** Shared statement of Puntr's independence from bookmaker and commercial influence. */
export function BookmakerIndependenceNotice({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`card-surface ${compact ? "p-4" : "p-5 sm:p-6"}`} aria-labelledby="bookmaker-independence-title">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="bookmaker-independence-title" className="font-semibold text-foreground">Bookmaker relationships &amp; editorial independence</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Tipsters on Puntr record picks against the fixtures and odds licensed and locally regulated platforms offer. Puntr does not take bets, and is not necessarily affiliated with or endorsed by them.</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Puntr will never allow an affiliate, partner or sponsor with special interests to influence its prediction scores, AI recommendations, editorial content or independent probability assessments.</p>
        </div>
      </div>
    </section>
  );
}
