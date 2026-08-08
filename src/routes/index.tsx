import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Gift, Play, ShieldCheck, Users, X as CloseIcon, Zap } from "lucide-react";

import { AffiliateBanner, PlatformRail } from "@/components/affiliate";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";
import { topTipsters } from "@/lib/mock-data";
import { TeamLogo } from "@/components/team-logo";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Puntr — Predict. Earn. Win together." },
      {
        name: "description",
        content:
          "South Africa's #1 betting prediction hub. Compare odds from every top bookmaker, share predictions, earn PuntPoints and 30% recurring referral revenue.",
      },
      { property: "og:title", content: "Puntr — Predict. Earn. Win together." },
      {
        property: "og:description",
        content: "South Africa's #1 betting prediction hub. Compare odds from every top bookmaker, share predictions, earn PuntPoints and 30% recurring referral revenue.",
      },
    ],
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
  { n: 1, title: "Sign Up Free", body: "Create your free account and join the community." },
  { n: 2, title: "Make Predictions", body: "Share your picks on upcoming matches." },
  { n: 3, title: "Earn PuntPoints", body: "Get rewarded for accurate predictions and activity." },
  { n: 4, title: "Earn 30% Revenue", body: "Refer users to premium and earn 30% recurring revenue." },
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
            South Africa's #1 betting prediction hub
          </span>
          <h1 className="mt-5 text-[clamp(2.6rem,7vw,4.2rem)] leading-[1.02]">
            Predict. Earn.
            <br />
            <span className="text-primary">Win together.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Puntr aggregates all the top betting platforms in South Africa. Share your predictions, earn{" "}
            <span className="font-semibold text-foreground">PuntPoints</span> and 30% of ongoing monthly revenue from
            your referrals.
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
              [Zap, "Real-time odds", "from top platforms"],
              [ShieldCheck, "Trusted predictions", "from the community"],
              [Gift, "Earn rewards", "for your knowledge"],
            ].map(([Icon, title, sub]) => {
              const I = Icon as typeof Zap;
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

        {/* Top match card */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="card-surface overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 sm:px-6">
            <h2 className="text-lg">Top Match Prediction</h2>
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
              <span className="size-1.5 rounded-full bg-primary" /> Live
            </span>
          </div>
          <div className="border-t border-border px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <TeamLogo team="Orlando Pirates" size="md" />
                <span className="truncate font-semibold">Orlando Pirates</span>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">VS</span>
              <div className="flex min-w-0 items-center justify-end gap-3">
                <TeamLogo team="Kaizer Chiefs" size="md" />
                <span className="truncate font-semibold">Kaizer Chiefs</span>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Sat, 10 May 2025 · 15:30 · DSTV Premiership
            </p>

            <div className="mt-5 rounded-xl border border-border p-4">
              <p className="text-sm font-semibold">Community Prediction</p>
              {[
                ["Orlando Pirates", 62],
                ["Draw", 22],
                ["Kaizer Chiefs", 16],
              ].map(([label, pct]) => (
                <div key={label as string} className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>{label as string}</span>
                    <span className="font-semibold tnum">{pct as number}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct as number}%` }}
                      transition={{ duration: 0.9, delay: 0.3 }}
                      className={`h-full rounded-full ${(pct as number) > 50 ? "bg-primary" : "bg-muted-foreground/40"}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="size-3.5 text-primary" /> 1 243 predictions · Closes in 02h 35m
            </p>
          </div>
        </motion.div>
      </section>

      <AffiliateBanner />

      {/* Platforms */}
      <motion.section {...fade} className="py-14 text-center">
        <h2 className="text-3xl">All Top Platforms. One Place.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Compare odds, markets and offers from South Africa's leading bookmakers.
        </p>
        <div className="mt-8">
          <PlatformRail />
        </div>
        <Button variant="outline" className="mt-6" asChild>
          <Link to="/predictions">
            View all platforms <ArrowRight className="ml-1.5 size-4" />
          </Link>
        </Button>
      </motion.section>

      {/* How it works */}
      <motion.section {...fade} className="card-surface p-6 sm:p-8">
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

      <div className="py-8">
        <AffiliateBanner />
      </div>

      {/* Three-up */}
      <motion.section {...fade} className="grid gap-5 lg:grid-cols-3">
        <div className="card-surface p-5">
          <h3 className="text-lg">PuntPoints & Leaderboard</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Climb the leaderboard, earn PuntPoints and unlock exclusive rewards.
          </p>
          <ul className="mt-4 space-y-2.5">
            {topTipsters.slice(0, 3).map((t) => (
              <li key={t.name} className="flex items-center gap-3">
                <span className="grid size-6 place-items-center rounded-md bg-muted text-[11px] font-bold tnum">
                  {t.rank}
                </span>
                <span className="size-7 rounded-full bg-muted" />
                <span className="flex-1 truncate text-sm font-medium">{t.name}</span>
                <span className="text-xs font-semibold text-primary tnum">{t.points.toLocaleString()} PP</span>
              </li>
            ))}
            <li className="flex items-center gap-3 rounded-lg bg-primary-soft px-2 py-2">
              <span className="grid size-6 place-items-center rounded-md bg-background text-[11px] font-bold tnum">
                24
              </span>
              <span className="size-7 rounded-full bg-background" />
              <span className="flex-1 text-sm font-semibold">You</span>
              <span className="text-xs font-semibold text-primary tnum">2 340 PP</span>
            </li>
          </ul>
          <Button variant="outline" className="mt-4 w-full" asChild>
            <Link to="/leaderboards">View Leaderboard</Link>
          </Button>
        </div>

        <div className="rounded-xl bg-ink p-6 text-ink-foreground shadow-lift">
          <h3 className="text-xl">Earn 30% Ongoing Revenue</h3>
          <p className="mt-2 text-xs leading-relaxed text-ink-foreground/75">
            Refer users to Puntr Premium and earn 30% of their monthly subscription for as long as they remain
            active.
          </p>
          <p className="mt-5 flex items-end gap-3">
            <span className="font-display text-5xl font-extrabold text-primary tnum">30%</span>
            <span className="pb-1 text-sm font-semibold leading-tight">
              Recurring
              <br />
              commission
            </span>
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            {["No limits on earnings", "Real-time tracking", "Monthly payouts"].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-success">✓</span> {f}
              </li>
            ))}
          </ul>
          <Button className="mt-6 w-full bg-background text-ink hover:bg-background/90" asChild>
            <Link to="/how-it-works">Learn about Puntr revenue sharing</Link>
          </Button>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-lg">Why Join Puntr?</h3>
          <ul className="mt-4 space-y-3.5">
            {[
              "Access to top betting platforms",
              "Real-time odds & insights",
              "Community predictions & chat",
              "Earn rewards & cash",
              "100% free to join",
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <Button className="mt-6 w-full" onClick={() => openEarlyAccess()}>
            Create your free account
          </Button>
        </div>
      </motion.section>

      <div className="py-8">
        <AffiliateBanner />
      </div>

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
