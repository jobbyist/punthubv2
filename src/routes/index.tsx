import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Clock, Lock, Play, ShieldCheck, X as CloseIcon } from "lucide-react";

import { PlatformRail } from "@/components/affiliate";
import { MatchPreview } from "@/components/match-preview";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";
import { topTipsters } from "@/lib/mock-data";
import { SHOW_BOOKMAKER_WALL } from "@/lib/flags";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Puntr - Predict smarter. Prove it." },
      {
        name: "description",
        content:
          "Locked, auto-graded, public tipster records for PSL, EPL, UCL, URC and Springbok tests. 18+. Gamble responsibly: 0800 006 008.",
      },
      { property: "og:title", content: "Puntr - Predict smarter. Prove it." },
      {
        property: "og:description",
        content: "Every pick is locked at kick-off, graded automatically and kept forever. Build a record people can trust.",
      },
      { property: "og:url", content: "https://puntr.co.za/" },
      { property: "og:locale", content: "en_ZA" },
    ],
    links: [{ rel: "canonical", href: "https://puntr.co.za/" }],
  }),
  component: Landing,
});

const fade = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

const steps = [
  { n: 1, title: "Sign up free", body: "Create your free account. You must be 18 or older." },
  { n: 2, title: "Make predictions", body: "Post your picks on upcoming matches before kick-off." },
  { n: 3, title: "Get graded", body: "Every pick is locked at kick-off and settled automatically." },
  { n: 4, title: "Climb the weekly leaderboard", body: "Build a public record based on units, ROI and sample size." },
];

function Landing() {
  const { openEarlyAccess } = useSession();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const handleCloseVideoModal = () => {
    setIsVideoModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
      {/* Hero */}
      <section className="grid gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <span className="inline-block rounded-md bg-primary-soft px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
            Public tipster records
          </span>
          <h1 className="mt-5 text-[clamp(2.6rem,7vw,4.2rem)] leading-[1.02]">
            Predict smarter.
            <br />
            <span className="text-primary">Prove it.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Every pick is locked at kick-off, graded automatically and kept forever. Build a record people can trust.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" className="h-12 px-6 text-[15px]" onClick={() => openEarlyAccess()}>
              Get started for free
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-6 text-[15px]" onClick={() => setIsVideoModalOpen(true)}>
              <Play className="mr-2 size-4" /> Watch the video
            </Button>
          </div>
          <ul className="mt-9 grid gap-5 sm:grid-cols-3">
            {[
              [Lock, "Locked at kick-off", "no edits, no deletes"],
              [ShieldCheck, "Graded automatically", "settled after the match"],
              [Clock, "Kept forever", "a public record"],
            ].map(([Icon, title, sub]) => {
              const I = Icon as typeof Lock;
              return (
                <li key={title as string} className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                    <I className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{title as string}</span>
                    <span className="block text-xs text-muted-foreground">{sub as string}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
        >
          <MatchPreview />
        </motion.div>
      </section>


      {/* Why a locked record matters */}
      <motion.section {...fade} className="grid gap-4 md:grid-cols-3">
        {[
          ["Timestamped before kick-off", "A pick counts only if it was posted before the match started."],
          ["No edits or deletes", "Wins and losses stay on the record. Nothing is hidden afterwards."],
          ["Public units, ROI and sample size", "See how many picks sit behind a result before you trust it."],
        ].map(([title, body]) => (
          <div key={title} className="card-surface flex gap-3 p-5">
            <span className="grid size-7 shrink-0 place-items-center bg-primary-soft text-xs font-bold text-primary">✓</span>
            <span>
              <span className="block text-sm font-semibold">{title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{body}</span>
            </span>
          </div>
        ))}
      </motion.section>

      {/* Platforms */}
      {SHOW_BOOKMAKER_WALL && (
        <motion.section {...fade} className="py-14 text-center">
          <h2 className="text-3xl">Predictions across South Africa&apos;s bookmakers</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Tipsters on Puntr record picks against the odds these platforms offer. Puntr does not take bets, and is
            not affiliated with or endorsed by them.
          </p>
          <div className="mt-8">
            <PlatformRail />
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            18+ only. T&amp;Cs apply. Gambling can be addictive. Helpline: 0800 006 008.
          </p>
        </motion.section>
      )}

      {/* How it works */}
      <motion.section {...fade} className="card-surface mt-8 p-6 sm:p-8">
        <h2 className="text-center text-2xl">How Puntr Works</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-3 rounded-xl border border-border p-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary tnum">
                {s.n}
              </span>
              <div>
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>


      {/* Leaderboard + why join */}
      <motion.section {...fade} className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="card-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg">Weekly leaderboard</h3>
            <span className="bg-muted px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Example
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Sample names and numbers, shown until the first real week is settled.
          </p>
          <ul className="mt-4 space-y-2.5">
            {topTipsters.slice(0, 3).map((t) => (
              <li key={t.name} className="flex items-center gap-3">
                <span className="grid size-6 place-items-center bg-muted text-[11px] font-bold tnum">{t.rank}</span>
                <span className="size-7 rounded-full bg-muted" />
                <span className="flex-1 truncate text-sm font-medium">{t.name}</span>
                <span className="text-xs font-semibold text-primary tnum">{t.points.toLocaleString()} PP</span>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="mt-4 w-full" asChild>
            <Link to="/leaderboards">View leaderboard</Link>
          </Button>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-lg">Why join Puntr?</h3>
          <ul className="mt-4 space-y-3.5">
            {[
              "Picks locked at kick-off",
              "Automatic grading",
              "A public record you can share",
              "Community predictions & chat",
              "100% free to join",
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm">
                <span className="grid size-7 shrink-0 place-items-center bg-primary-soft text-primary">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Button className="mt-6 w-full" onClick={() => openEarlyAccess()}>
            Create your free account
          </Button>
        </div>
      </motion.section>

      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={handleCloseVideoModal}>
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleCloseVideoModal}
              className="absolute -top-10 right-0 text-white transition-colors hover:text-primary"
              aria-label="Close video modal"
            >
              <CloseIcon className="size-8" />
            </button>
            <div className="relative overflow-hidden rounded-xl bg-black shadow-2xl" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src="https://www.youtube.com/embed/pBCncBbeWkc?rel=0"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: 0,
                }}
                allowFullScreen
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin"
                title="Puntr How It Works"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
