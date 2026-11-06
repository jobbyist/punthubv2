import { useState } from "react";
import { MessageCircle, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";

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

  return (
    <section className="mb-8" aria-labelledby="community-discussions-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            {t("discussions.preview")}
          </p>
          <h2 id="community-discussions-title" className="mt-1 text-xl">
            {t("discussions.title")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("discussions.description")}
          </p>
        </div>
        <span className="border border-primary/30 bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
          {t("discussions.preview")}
        </span>
      </div>
      <div className="space-y-4">
        {POSTS.map((post) => {
          const hasVoted = voted.includes(post.id);
          return (
            <article key={post.id} className="card-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="grid size-9 place-items-center rounded-full bg-primary-soft font-display font-extrabold text-primary">
                  {post.initials}
                </span>
                <span className="font-semibold">{post.author}</span>
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold">
                  {post.badge}
                </span>
                <span className="ml-auto text-muted-foreground">{post.category}</span>
              </div>
              <h3 className="mt-4 text-base font-bold leading-snug">{post.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.body}</p>
              <div className="mt-4 flex items-center gap-4 border-y border-border py-3 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() =>
                    setVoted((current) =>
                      hasVoted ? current.filter((id) => id !== post.id) : [...current, post.id],
                    )
                  }
                  aria-pressed={hasVoted}
                  className={`inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-primary ${hasVoted ? "text-primary" : ""}`}
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
              <div className="mt-4 space-y-3 pl-3 sm:pl-5">
                {post.comments.map((comment) => (
                  <div key={comment.name} className="border-l-2 border-border pl-3">
                    <p className="text-xs font-semibold">{comment.name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {comment.text}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
