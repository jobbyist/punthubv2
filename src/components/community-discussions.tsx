import { useState } from "react";
import { BadgeCheck, ChevronUp, MessageCircle, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Monogram } from "@/components/leader-board";

const POSTS = [
  {
    id: "team-matchday",
    author: "Puntr Team",
    initials: "P",
    badge: "Puntr team",
    category: "Matchday chat",
    title: "Which fixture are you most looking forward to this weekend?",
    body: "Let's get the conversation going. Share the match you're watching, what tactical battle could decide it, and one player you think deserves more attention. Keep it about the sport — no guaranteed outcomes or pressure to punt.",
    votes: 18,
    comments: [
      {
        name: "CapeTownGooner",
        text: "Arsenal's midfield control is the one to watch. If they win the second balls, they'll dictate the tempo.",
      },
      {
        name: "AnfieldAnalyst",
        text: "Liverpool's transitions can punish any team that leaves space behind. Should be a good tactical contest.",
      },
      {
        name: "MzansiFooty",
        text: "I'm keeping an eye on the first 20 minutes. The intensity early on usually tells you a lot.",
      },
    ],
  },
  {
    id: "team-bafana",
    author: "Puntr Team",
    initials: "P",
    badge: "Puntr team",
    category: "South African football",
    title: "What would make the Betway Premiership more competitive?",
    body: "Squad depth, coaching continuity, better pitches, youth development or something else? We'd like to hear what supporters think would raise the standard across the league.",
    votes: 12,
    comments: [
      {
        name: "SowetoScout",
        text: "Consistent investment in youth academies would make a real difference over a few seasons.",
      },
      {
        name: "DurbanData",
        text: "Pitch quality and match scheduling need attention too. It affects the quality of football.",
      },
      {
        name: "JoziTactician",
        text: "More clubs keeping their coaches for longer would help build a recognisable playing identity.",
      },
    ],
  },
  {
    id: "team-rugby",
    author: "Puntr Team",
    initials: "P",
    badge: "Puntr team",
    category: "Rugby room",
    title: "Club rugby or international rugby — which do you follow more closely?",
    body: "The local rugby calendar has plenty to talk about. Tell us what competition you follow most and what makes it compelling for you.",
    votes: 9,
    comments: [
      {
        name: "ScrumHalfZA",
        text: "International rugby for the occasion, but local derbies have a different edge.",
      },
      {
        name: "GreenAndGold",
        text: "URC weekends are hard to beat. The rivalries make every fixture feel important.",
      },
      {
        name: "TacticalTouch",
        text: "I enjoy the club game because you get to follow a team's identity develop over a season.",
      },
    ],
  },
] as const;

/** Seed content is a UI preview only. Vote totals and member handles are illustrative, not real engagement. */
export function CommunityDiscussions() {
  const { t } = useTranslation("community");
  const [voted, setVoted] = useState<string[]>([]);
  const toggle = (id: string) =>
    setVoted((current) =>
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
    );

  return (
    <section aria-labelledby="community-discussions-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="community-discussions-title" className="text-xl">
            {t("discussions.title")}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("discussions.description")}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
          <span className="puntr-blink size-1.5 rounded-full bg-primary" aria-hidden="true" />
          {t("discussions.preview")}
        </span>
      </div>
      <div className="space-y-5">
        {POSTS.map((post, index) => {
          const hasVoted = voted.includes(post.id);
          return (
            <article
              key={post.id}
              className="puntr-rise card-surface card-interactive flex"
              style={{ ["--i" as string]: index }}
            >
              {/* Vote rail: a column on wider screens, folded into the action row on phones. */}
              <div className="hidden w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-muted/30 py-5 sm:flex">
                <button
                  type="button"
                  onClick={() => toggle(post.id)}
                  aria-pressed={hasVoted}
                  aria-label={t("discussions.upvotes")}
                  className={`grid size-9 place-items-center rounded-full border transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary ${hasVoted ? "border-primary bg-primary text-primary-foreground hover:text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}
                >
                  <ChevronUp className="size-5" />
                </button>
                <span
                  key={hasVoted ? "on" : "off"}
                  className={`puntr-pop font-display text-sm font-extrabold tnum ${hasVoted ? "text-primary" : ""}`}
                >
                  {post.votes + (hasVoted ? 1 : 0)}
                </span>
              </div>
              <div className="min-w-0 flex-1 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="grid size-9 place-items-center rounded-full bg-ink font-display font-extrabold text-ink-foreground">
                    {post.initials}
                  </span>
                  <span className="font-semibold">{post.author}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <BadgeCheck className="size-3" aria-hidden="true" />
                    {post.badge}
                  </span>
                  <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {post.category}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold leading-snug sm:text-lg">{post.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.body}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-3 text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggle(post.id)}
                    aria-pressed={hasVoted}
                    className={`inline-flex min-h-8 items-center gap-1.5 font-semibold transition-colors hover:text-primary sm:hidden ${hasVoted ? "text-primary" : ""}`}
                  >
                    <ThumbsUp className="size-4" /> {post.votes + (hasVoted ? 1 : 0)}{" "}
                    {t("discussions.upvotes")}
                  </button>
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="size-4" /> {post.comments.length}{" "}
                    {t("discussions.comments")}
                  </span>
                  <span className="ml-auto text-[10px]">{t("discussions.sampleVotes")}</span>
                </div>
                <ul className="mt-4 space-y-3">
                  {post.comments.map((comment) => (
                    <li key={comment.name} className="flex gap-3">
                      <Monogram name={comment.name} className="size-8 text-[10px]" />
                      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5">
                        <p className="text-xs font-semibold">{comment.name}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                          {comment.text}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
