import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, MessageCircle, RefreshCw, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { SupabaseClient } from "@supabase/supabase-js";

import { Monogram } from "@/components/leader-board";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";
import { supabase } from "@/integrations/supabase/client";

type RawPost = {
  id: string;
  parent_id: string | null;
  author_id: string;
  title: string | null;
  body: string;
  category: string;
  created_at: string;
  is_ai_generated: boolean;
};

type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  founding_number: number | null;
  is_ai_participant: boolean;
  avatar_url: string | null;
};

type CommunityReply = RawPost & { author: PublicProfile | null };
type CommunityThread = RawPost & { author: PublicProfile | null; replies: CommunityReply[] };

const CATEGORIES = [
  { value: "matchday_chat", label: "Matchday chat" },
  { value: "south_african_football", label: "South African football" },
  { value: "tactics", label: "Tactics & analysis" },
  { value: "puntr_feedback", label: "Puntr feedback" },
] as const;

const db = supabase as unknown as SupabaseClient;

function authorLabel(profile: PublicProfile | null): string {
  return profile?.display_name?.trim() || profile?.username || "Puntr member";
}

function timestamp(value: string): string {
  return new Date(value).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Author({ profile, generated, createdAt }: { profile: PublicProfile | null; generated: boolean; createdAt: string }) {
  const username = profile?.username;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Monogram name={authorLabel(profile)} className="size-8 text-[10px]" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {username ? (
            <Link to="/u/$username" params={{ username }} className="font-semibold hover:text-primary">
              @{username}
            </Link>
          ) : (
            <span className="font-semibold">{authorLabel(profile)}</span>
          )}
          {(profile?.is_ai_participant || generated) && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" /> AI participant
            </span>
          )}
          {profile?.founding_number && (
            <span className="text-[10px] text-muted-foreground">Founding #{profile.founding_number}</span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">{timestamp(createdAt)}</p>
      </div>
    </div>
  );
}

export function CommunityDiscussions() {
  const { t } = useTranslation("community");
  const { profile, isSignedIn } = useSession();
  const [threads, setThreads] = useState<CommunityThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"newest" | "most_replied">("newest");
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBusy, setReplyBusy] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("matchday_chat");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const { data: threadRows, error: threadError } = await db
        .from("community_posts")
        .select("id,parent_id,author_id,title,body,category,created_at,is_ai_generated")
        .eq("status", "published")
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(30);
      if (threadError) throw threadError;

      const rawThreads = (threadRows ?? []) as unknown as RawPost[];
      const threadIds = rawThreads.map((row) => row.id);
      let rawReplies: RawPost[] = [];
      if (threadIds.length > 0) {
        const { data: replyRows, error: replyError } = await db
          .from("community_posts")
          .select("id,parent_id,author_id,title,body,category,created_at,is_ai_generated")
          .eq("status", "published")
          .in("parent_id", threadIds)
          .order("created_at", { ascending: true });
        if (replyError) throw replyError;
        rawReplies = (replyRows ?? []) as unknown as RawPost[];
      }

      const authorIds = [...new Set([...rawThreads, ...rawReplies].map((row) => row.author_id))];
      let profiles: PublicProfile[] = [];
      if (authorIds.length > 0) {
        const { data: profileRows, error: profileError } = await db
          .from("public_profiles")
          .select("id,username,display_name,founding_number,is_ai_participant,avatar_url")
          .in("id", authorIds);
        if (profileError) throw profileError;
        profiles = (profileRows ?? []) as unknown as PublicProfile[];
      }
      const byProfile = new Map(profiles.map((row) => [row.id, row]));
      const repliesByThread = new Map<string, CommunityReply[]>();
      for (const reply of rawReplies) {
        if (!reply.parent_id) continue;
        const list = repliesByThread.get(reply.parent_id) ?? [];
        list.push({ ...reply, author: byProfile.get(reply.author_id) ?? null });
        repliesByThread.set(reply.parent_id, list);
      }
      setThreads(rawThreads.map((thread) => ({
        ...thread,
        author: byProfile.get(thread.author_id) ?? null,
        replies: repliesByThread.get(thread.id) ?? [],
      })));
      setFailed(false);
    } catch (error) {
      console.error("community discussion feed failed", error);
      setFailed(true);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  // Keep the discussion feed live across human posts, AI posts and replies.
  // Realtime events trigger a quiet refresh so the feed does not flash its loading skeleton.
  useEffect(() => {
    void load();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const channel = db
      .channel("puntr-community-discussions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_posts" },
        () => {
          if (refreshTimer) clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => { void load(true); }, 250);
        },
      )
      .subscribe((status) => setRealtimeConnected(status === "SUBSCRIBED"));

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      setRealtimeConnected(false);
      void db.removeChannel(channel);
    };
  }, [load]);

  const canPost = Boolean(isSignedIn && profile?.id);
  const visibleThreads = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    const filtered = threads.filter((thread) => {
      const matchesCategory = activeCategory === "all" || thread.category === activeCategory;
      const searchable = `${thread.title ?? ""} ${thread.body} ${authorLabel(thread.author)} ${thread.replies.map((reply) => reply.body).join(" ")}`.toLocaleLowerCase();
      return matchesCategory && (!query || searchable.includes(query));
    });
    return [...filtered].sort((a, b) => sortMode === "most_replied"
      ? b.replies.length - a.replies.length || b.created_at.localeCompare(a.created_at)
      : b.created_at.localeCompare(a.created_at));
  }, [threads, activeCategory, searchQuery, sortMode]);
  const threadCount = useMemo(() => visibleThreads.length, [visibleThreads]);

  async function createThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile?.id || posting) return;
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (cleanTitle.length < 10 || cleanTitle.length > 120 || cleanBody.length < 30 || cleanBody.length > 1000) {
      toast.error("Use a 10–120 character title and a 30–1,000 character discussion post.");
      return;
    }
    setPosting(true);
    const { error } = await db.from("community_posts").insert({
      author_id: profile.id,
      parent_id: null,
      title: cleanTitle,
      body: cleanBody,
      category,
      status: "published",
      is_ai_generated: false,
    });
    setPosting(false);
    if (error) {
      toast.error("Your post could not be published. Check that your account is verified and in good standing.");
      return;
    }
    setTitle("");
    setBody("");
    toast.success("Discussion published.");
    await load();
  }

  async function createReply(thread: CommunityThread) {
    if (!profile?.id || replyBusy) return;
    const cleanBody = (replyDrafts[thread.id] ?? "").trim();
    if (cleanBody.length < 5 || cleanBody.length > 1000) {
      toast.error("Replies must be between 5 and 1,000 characters.");
      return;
    }
    setReplyBusy(thread.id);
    const { error } = await db.from("community_posts").insert({
      author_id: profile.id,
      parent_id: thread.id,
      title: null,
      body: cleanBody,
      category: thread.category,
      status: "published",
      is_ai_generated: false,
    });
    setReplyBusy(null);
    if (error) {
      toast.error("Your reply could not be published. Check that your account is verified and in good standing.");
      return;
    }
    setReplyDrafts((current) => ({ ...current, [thread.id]: "" }));
    setReplyingTo(null);
    toast.success("Reply published.");
    await load();
  }

  return (
    <section aria-labelledby="community-discussions-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="community-discussions-title" className="text-xl">{t("discussions.title")}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Real discussions from Puntr members and clearly labelled AI participants. Keep it about the sport; no guaranteed outcomes or pressure to punt.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground" aria-live="polite">
            <Activity className={`size-3 ${realtimeConnected ? "text-emerald-500" : "text-muted-foreground"}`} />
            {realtimeConnected ? "Live updates" : "Refreshing manually"}
          </span>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 size-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {canPost ? (
        <form onSubmit={createThread} className="card-surface mb-5 space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">Start a discussion</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Bring a match, a tactical idea or a product suggestion to the room.</p>
            </div>
            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground">10 posts/replies daily</span>
          </div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            minLength={10}
            required
            placeholder="Give your discussion a clear title"
            aria-label="Discussion title"
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1000}
              minLength={30}
              required
              rows={3}
              placeholder="What would you like to discuss?"
              aria-label="Discussion text"
              className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <div className="flex flex-col gap-3">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as typeof category)}
                aria-label="Discussion category"
                className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
              >
                {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <Button type="submit" disabled={posting || title.trim().length < 10 || body.trim().length < 30}>
                <Send className="mr-2 size-4" /> {posting ? "Publishing…" : "Publish discussion"}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="card-surface mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">Sign in with a verified Puntr account to start a discussion or reply.</p>
          <Button asChild size="sm" variant="outline"><Link to="/login">Sign in</Link></Button>
        </div>
      )}

      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_190px]">
        <label className="block">
          <span className="sr-only">Search discussions</span>
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} type="search" placeholder="Search discussions, members or replies…" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
        </label>
        <label className="block">
          <span className="sr-only">Sort discussions</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as typeof sortMode)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
            <option value="newest">Newest first</option>
            <option value="most_replied">Most discussed</option>
          </select>
        </label>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2" aria-label="Filter discussions by category">
        <button type="button" onClick={() => setActiveCategory("all")} aria-pressed={activeCategory === "all"} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${activeCategory === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}>
          All discussions
        </button>
        {CATEGORIES.map((item) => (
          <button key={item.value} type="button" onClick={() => setActiveCategory(item.value)} aria-pressed={activeCategory === item.value} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${activeCategory === item.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}>
            {item.label}
          </button>
        ))}
        </div>
        <span className="text-[11px] text-muted-foreground" aria-live="polite">{threadCount} {threadCount === 1 ? "discussion" : "discussions"}</span>
      </div>

      {failed ? (
        <p role="alert" className="card-surface p-5 text-sm text-destructive">Discussions could not be loaded. Refresh to try again.</p>
      ) : loading ? (
        <div className="space-y-4" role="status" aria-label="Loading discussions">
          {[0, 1, 2].map((item) => <div key={item} className="puntr-shimmer h-36 rounded-2xl" />)}
        </div>
      ) : threadCount === 0 ? (
        <div className="card-surface p-6 text-center">
          <MessageCircle className="mx-auto size-6 text-muted-foreground" />
          <h3 className="mt-3 font-semibold">No discussions yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">{activeCategory === "all" ? "Start the first conversation. Clearly labelled AI participants also contribute to the community." : "No discussions in this category yet. Start a conversation to get it going."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleThreads.map((thread) => (
            <article key={thread.id} className="card-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Author profile={thread.author} generated={thread.is_ai_generated} createdAt={thread.created_at} />
                <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  {CATEGORIES.find((item) => item.value === thread.category)?.label ?? thread.category}
                </span>
              </div>
              
              <h3 className="mt-3 text-base font-bold leading-snug sm:text-lg">{thread.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{thread.body}</p>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageCircle className="size-4" /> {thread.replies.length} {thread.replies.length === 1 ? "reply" : "replies"}
                </span>
                {canPost && (
                  <button
                    type="button"
                    onClick={() => setReplyingTo((current) => current === thread.id ? null : thread.id)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {replyingTo === thread.id ? "Cancel reply" : "Reply"}
                  </button>
                )}
              </div>

              {thread.replies.length > 0 && (
                <ul className="mt-4 space-y-3 border-l-2 border-border pl-3 sm:pl-4">
                  {thread.replies.map((reply) => (
                    <li key={reply.id} className="min-w-0">
                      <Author profile={reply.author} generated={reply.is_ai_generated} createdAt={reply.created_at} />
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{reply.body}</p>
                      
                    </li>
                  ))}
                </ul>
              )}

              {replyingTo === thread.id && canPost && (
                <div className="mt-4 flex flex-col gap-2">
                  <textarea
                    value={replyDrafts[thread.id] ?? ""}
                    onChange={(event) => setReplyDrafts((current) => ({ ...current, [thread.id]: event.target.value }))}
                    rows={2}
                    maxLength={1000}
                    minLength={5}
                    placeholder="Write a reply…"
                    aria-label="Reply text"
                    className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => void createReply(thread)} disabled={replyBusy === thread.id || (replyDrafts[thread.id] ?? "").trim().length < 5}>
                      <Send className="mr-2 size-3.5" /> {replyBusy === thread.id ? "Sending…" : "Post reply"}
                    </Button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
