import { useState } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck, ShieldCheck } from "lucide-react";

const workstreams = [
  {
    title: "Reliable delivery pipeline",
    items: [
      "Queue-backed delivery with retries, backoff, idempotency and resumable campaigns",
      "Dead-letter handling, retry controls and delivery exports",
    ],
  },
  {
    title: "Campaign scheduling and targeting",
    items: [
      "Scheduled, timezone-aware campaigns",
      "Saved audience segments and campaign templates",
    ],
  },
  {
    title: "Notification preferences",
    items: ["Granular categories and quiet hours", "Frequency caps and preference-aware targeting"],
  },
  {
    title: "Event-triggered notifications",
    items: ["Followed competitions and prediction updates", "Duels, account and security events"],
  },
  {
    title: "Device management",
    items: [
      "Registered-device list and last-seen timestamps",
      "Per-device revocation and account-wide sign-out cleanup",
    ],
  },
  {
    title: "Cross-platform delivery QA",
    items: [
      "Android Chrome and installed iOS PWA testing",
      "Foreground/background delivery, denied permissions, deep links, account switching and logout",
    ],
  },
  {
    title: "Offline and update resilience",
    items: [
      "Service-worker upgrade and stale-cache handling",
      "Cache eviction and interrupted update recovery",
    ],
  },
  {
    title: "Accessibility and localization",
    items: ["Accessible prompts and settings controls", "Language and assistive-technology review"],
  },
  {
    title: "Privacy and retention",
    items: [
      "Review endpoint, consent, campaign and delivery metadata retention",
      "Data minimization and deletion workflows",
    ],
  },
  {
    title: "Operations and observability",
    items: [
      "Delivery/provider metrics and alerting",
      "Admin audit trail, operational runbooks and incident recovery",
    ],
  },
];

export function PwaHardeningRoadmap() {
  const [open, setOpen] = useState(true);
  return (
    <section className="mx-4 my-5 rounded-2xl border border-border bg-card p-5 sm:mx-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              Pre-launch programme · Approved
            </p>
            <h2 className="mt-1 text-lg font-semibold">PWA hardening & push operations</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Ten approved workstreams. Implementation is tracked in separate feature branches and
              pull requests; this panel is the internal launch checklist.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium"
        >
          {open ? "Collapse" : "Expand"}{" "}
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>
      {open && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {workstreams.map((work, index) => (
            <article key={work.title} className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-muted text-xs font-bold tabular-nums">
                  {index + 1}
                </span>
                <h3 className="text-sm font-semibold">{work.title}</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {work.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                    <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Release gate: Vercel Sandbox lint, typecheck, tests and build; Vercel preview review;
        real-device acceptance testing; privacy approval.
      </p>
    </section>
  );
}
