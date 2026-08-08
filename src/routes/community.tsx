import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { BarChart3, CalendarDays, Heart, Image as ImageIcon, Lightbulb, MessageCircle, Pin, Share2 } from "lucide-react";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Locked } from "@/components/locked";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";
import { communityPosts } from "@/lib/mock-data";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community | Puntr" },
      {
        name: "description",
        content: "Connect with fellow South African punters, share insights, post your picks and grow together.",
      },
      { property: "og:title", content: "Community | Puntr" },
      { property: "og:description", content: "Share picks, discuss matches and learn from the best." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Puntr Community",
          description:
            "Community feed where South African punters share betting insights, picks and discussions.",
          url: "https://punthubv2.lovable.app/community",
          isPartOf: { "@type": "WebSite", name: "Puntr", url: "https://punthubv2.lovable.app/" },
        }),
      },
    ],
  }),
  component: Community,
});

function Feed() {
  return (
    <div className="space-y-4">
      {communityPosts.map((p, i) => (
        <motion.article
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="card-surface p-5"
        >
          {p.pinned && (
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Pin className="size-3.5" /> Pinned by Puntr
            </p>
          )}
          <div className="flex items-center gap-3">
            <span className="size-10 shrink-0 rounded-full bg-muted" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {p.author}
                {p.tag && (
                  <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {p.tag}
                  </span>
                )}
                {p.admin && (
                  <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Admin
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{p.meta}</p>
            </div>
          </div>

          {p.title && <h3 className="mt-4 text-lg">{p.title}</h3>}
          <p className="mt-2 text-[15px] leading-relaxed">{p.body}</p>

          {p.score && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="size-8 shrink-0 rounded-full bg-ink" />
                <span className="truncate text-sm font-medium">{p.score.home}</span>
              </div>
              <div className="text-center">
                <p className="font-display text-xl font-extrabold tnum">
                  {p.score.hs} – {p.score.as}
                </p>
                <p className="text-[10px] text-muted-foreground">FT</p>
              </div>
              <div className="flex min-w-0 items-center justify-end gap-3">
                <span className="truncate text-sm font-medium">{p.score.away}</span>
                <span className="size-8 shrink-0 rounded-full bg-[oklch(0.8_0.16_85)]" />
              </div>
            </div>
          )}

          {p.acca && (
            <div className="mt-4 rounded-xl bg-muted/60 p-4">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>{p.acca.length}-Fold Acca</span>
                <span className="text-primary">Win Potential</span>
              </div>
              <ul className="mt-2 space-y-1.5 text-sm">
                {p.acca.map((l) => (
                  <li key={l.name} className="flex items-center justify-between">
                    <span>{l.name}</span>
                    <span className="tnum">{l.odds.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-bold text-primary">
                <span>Total Odds</span>
                <span className="tnum">{p.total?.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
            <button className="flex items-center gap-1.5 transition-colors hover:text-primary">
              <Heart className="size-4" /> <span className="tnum">{p.likes}</span>
            </button>
            <button className="flex items-center gap-1.5 transition-colors hover:text-primary">
              <MessageCircle className="size-4" /> <span className="tnum">{p.comments}</span>
            </button>
            <button className="transition-colors hover:text-primary" aria-label="Share post">
              <Share2 className="size-4" />
            </button>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

function Community() {
  const { isGuest, openEarlyAccess } = useSession();

  return (
    <AppShell>
      <PageHeading title="Community" subtitle="Connect with fellow punters, share insights and grow together." />

      <div className="card-surface mb-5 p-4">
        <div className="flex items-center gap-3">
          <span className="size-10 shrink-0 rounded-full bg-muted" />
          <button
            onClick={() => openEarlyAccess("Join the beta to post in the community.")}
            className="min-w-0 flex-1 truncate rounded-lg bg-muted px-4 py-2.5 text-left text-sm text-muted-foreground"
          >
            What's on your mind?
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(4,1fr)_auto]">
          {[
            [ImageIcon, "Image"],
            [BarChart3, "Poll"],
            [Lightbulb, "Tip"],
            [CalendarDays, "Match"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof ImageIcon;
            return (
              <button
                key={label as string}
                className="flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted"
              >
                <I className="size-4 text-muted-foreground" /> {label as string}
              </button>
            );
          })}
          <Button className="col-span-2 sm:col-span-1" onClick={() => openEarlyAccess()}>
            Post
          </Button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {["All Posts", "Following", "Popular", "My Posts"].map((f, i) => (
          <button
            key={f}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              i === 0 ? "bg-ink text-ink-foreground" : "border border-border hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isGuest ? (
        <Feed />
      ) : (
        <Locked label="Create a free account to join the discussion." intensity="lg">
          <Feed />
        </Locked>
      )}
    </AppShell>
  );
}
