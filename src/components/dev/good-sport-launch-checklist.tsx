import { useState } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck, Mail, Palette, PlayCircle, ShieldCheck, Youtube } from "lucide-react";

const launchTasks = [
  {
    title: "Apply and verify the Supabase migration",
    description: "Apply the podcast premiere notification migration to the production Supabase project. Verify the opt-in table, row-level security policies, retention cleanup and both scheduled cron jobs are present and running.",
    icon: ShieldCheck,
  },
  {
    title: "Configure production email and cron secrets",
    description: "Set SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET and RESEND_API_KEY in the production environment. Confirm the cron endpoint authenticates correctly and Resend is authorised to send from the configured sender domain.",
    icon: Mail,
  },
  {
    title: "Upload official Episode 01 artwork",
    description: "Approve and publish the final The Good Sport cover artwork, then set VITE_GOOD_SPORT_COVER_ART_URL in the relevant Vercel environments.",
    icon: Palette,
  },
  {
    title: "Upload and configure the Episode 01 audio master",
    description: "Approve the final mastered episode audio, host it at a stable HTTPS URL and set VITE_GOOD_SPORT_EPISODE_01_AUDIO_URL. Verify playback, seeking and controls on desktop and mobile.",
    icon: PlayCircle,
  },
  {
    title: "Verify and configure the official YouTube channel",
    description: "Confirm the canonical Puntr YouTube channel URL and set VITE_PUNTR_YOUTUBE_URL. Replace the current intro-video fallback and test that the CTA opens the correct channel.",
    icon: Youtube,
  },
  {
    title: "Complete a real premiere-notification delivery test",
    description: "Test the full opt-in-to-email path using a controlled address: signup cutoff, cron authentication, 09:00 SAST schedule, hourly retry window, Resend delivery, idempotency and database delivery acknowledgement. Confirm failures are visible and do not create duplicate emails.",
    icon: Mail,
  },
];

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
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Deferred launch tasks · Not yet verified</p>
            <h2 className="mt-1 text-lg font-semibold">The Good Sport · Premiere readiness</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Outstanding production dependencies for the Episode 01 premiere on 1 December 2026. Keep these open until each item has been completed and verified.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setOpen(v => !v)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium">
          {open ? "Collapse" : "Expand"} {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>
      {open && (
        <div className="mt-5 space-y-3">
          {launchTasks.map((task, index) => {
            const Icon = task.icon;
            return (
              <article key={task.title} className="flex gap-3 rounded-xl border border-border p-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                    <h3 className="text-sm font-semibold">{task.title}</h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Pending</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{task.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Release gate: all six tasks verified, then complete a final production preview and end-to-end premiere rehearsal before launch.
      </p>
    </section>
  );
}
