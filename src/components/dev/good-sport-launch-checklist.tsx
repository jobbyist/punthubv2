import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Mail,
  Palette,
  PlayCircle,
  ShieldCheck,
  Youtube,
} from "lucide-react";

const launchTasks = [
  {
    title: "Apply and verify the Supabase migration",
    description:
      "Complete. Production migration applied; the opt-in table has RLS enabled, anon/authenticated access is revoked, and both the premiere and retention cron jobs are active.",
    status: "Complete",
    statusTone: "complete",
    icon: ShieldCheck,
  },
  {
    title: "Configure production email and cron secrets",
    description:
      "Complete. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET and RESEND_API_KEY are configured in Vercel production. A live signup verified the Supabase service-role path; a Vault-authenticated cron request returned the expected 200 response.",
    status: "Complete",
    statusTone: "complete",
    icon: Mail,
  },
  {
    title: "Upload official Episode 01 artwork",
    description:
      "Deferred by request. Upload the approved cover art and set VITE_GOOD_SPORT_COVER_ART_URL in the relevant Vercel environments.",
    status: "Deferred",
    statusTone: "deferred",
    icon: Palette,
  },
  {
    title: "Upload and configure the Episode 01 audio master",
    description:
      "Deferred by request. Upload the final mastered audio to a stable HTTPS location, set VITE_GOOD_SPORT_EPISODE_01_AUDIO_URL and verify playback on desktop and mobile.",
    status: "Deferred",
    statusTone: "deferred",
    icon: PlayCircle,
  },
  {
    title: "Verify and configure the official YouTube channel",
    description:
      "Complete. Verified the Puntr - South Africa channel associated with the official explainer video and configured VITE_PUNTR_YOUTUBE_URL across production, preview and development.",
    status: "Complete",
    statusTone: "complete",
    icon: Youtube,
  },
  {
    title: "Complete a real premiere-notification delivery test",
    description:
      "Partially verified. The production opt-in form successfully accepted a controlled signup; the record was checked and then removed. Vault-authenticated cron invocation returned the expected pre-premiere response. Resend accepted a one-off internal smoke-test email (HTTP 200). Actual inbox receipt, scheduled 1 December sends, retry behavior and delivery acknowledgement remain to be verified during the premiere window.",
    status: "Partially verified",
    statusTone: "partial",
    icon: Mail,
  },
];

const statusClasses: Record<string, string> = {
  complete: "bg-emerald-500/10 text-emerald-600",
  deferred: "bg-muted text-muted-foreground",
  partial: "bg-amber-500/10 text-amber-700",
};

export function GoodSportLaunchChecklist() {
  const [open, setOpen] = useState(true);

  return (
    <section className="mx-4 my-5 rounded-2xl border border-border bg-card p-5 sm:mx-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <ClipboardCheck className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              Premiere readiness · 3 complete · 1 partially verified · 2 deferred
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              The Good Sport · Premiere readiness
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Production readiness for the Episode 01 premiere on 1 December 2026. Statuses reflect verified work; deferred assets remain untouched.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium"
        >
          {open ? "Collapse" : "Expand"}{" "}
          {open ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
      </div>
      {open && (
        <div className="mt-5 space-y-3">
          {launchTasks.map((task, index) => {
            const Icon = task.icon;
            return (
              <article
                key={task.title}
                className="flex gap-3 rounded-xl border border-border p-4"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold tabular-nums text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-sm font-semibold">{task.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClasses[task.statusTone]}`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {task.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Release gate: confirm actual inbox receipt, scheduled sends, retries and database delivery acknowledgement during the premiere window. Artwork and audio remain deferred.
      </p>
    </section>
  );
}
