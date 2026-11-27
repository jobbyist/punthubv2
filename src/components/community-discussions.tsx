import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BadgeCheck, MessageCircle, Send, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { SupabaseClient } from "@supabase/supabase-js";

import { useSession } from "@/components/session";
import { supabase } from "@/integrations/supabase/client";

type CommunityProfile = {
  id: string;
  username: string;
  display_name: string;
  founding_number: number | null;
  avatar_url: string | null;
  is_ai_participant: boolean;
};

type PostRow = {
  id: string;
  author_id: string;
  parent_id: string | null;
  title: string | null;
  body: string;
  category: string;
  created_at: string;
};

type Reply = PostRow & { author: CommunityProfile | null };
type Thread = PostRow & { author: CommunityProfile | null; replies: Reply[] };

const db = supabase as unknown as SupabaseClient;
const CATEGORY_LABELS: Record<string, string> = {
  matchday_chat: "Matchday chat",
  south_african_football: "South African football",
  tactics: "Tactics & analysis",
  puntr_feedback: "Puntr feedback",
};

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "P";
}

function timestamp(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(value));
}

function Author({ profile }: { profile: CommunityProfile | null }) {
  if (!profile) return <span className="text-xs font-semibold text-muted-foreground">Puntr member</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-[10px] font-extrabold text-ink-foreground">
        {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="size-full object-cover" /> : initials(profile.display_name || profile.username)}
      </span>
      <span className="min-w-0">
        <Link to="/u/$username" params={{ username: profile.username }} className="truncate text-xs font-bold hover:text-primary">
          @{profile.username}
        </Link>
        {profile.founding_number !== null && <span className="ml-1.5 text-[10px] text-muted-foreground">#{profile.founding_number}</span>}
      </span>
      {profile.is_ai_participant && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
          <Sparkles className="size-3" aria-hidden="true" /> AI participant
        </span>
      )}
    </span>
  );
}

export function CommunityDiscussions() {
  const { t } = useTranslation("community");
  const { isSignedIn, profile } = useSession();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("matchday_chat");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: rootRows, error: rootError } = await db
        .from("community_posts")
        .select("id,author_id,parent_id,title,body,category,created_at")
        .is("parent_id", null)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(25);
      if (rootError) throw rootError;
      const roots = (rootRows ?? []) as PostRow[];
      if (!roots.length) {
        setThreads([]);
        return;
      }

      const rootIds = roots.map((row) => row.id);
      const { data: replyRows, error: replyError } = await db
        .from("community_posts")
        .select("id,author_id,parent_id,title,body,category,created_at")
        .in("parent_id", rootIds)
        .eq("status", "published")
        .order("created_at", { ascending: true });
      if (replyError) throw replyError;
      const allRows = [...roots, ...((replyRows ?? []) as PostRow[])];
      const authorIds = [...new Set(allRows.map((row) => row.author_id))];
      const { data: profileRows, error: profileError } = await db
        .from("public_profiles")
        .select("id,username,display_name,founding_number,avatar_url,is_ai_participant")
        .in("id", authorIds);
      if (profileError) throw profileError;
      const authors = new Map<string, CommunityProfile>(
        ((profileRows ?? []) as CommunityProfile[]).map((row) => [row.id, row]),
      );
      const repliesByParent = new Map<string, Reply[]>();
      for (const row of (replyRows ?? []) as PostRow[]) {
        if (!row.parent_id) continue;
        const list = repliesByParent.get(row.parent_id) ?? [];
        list.push({ ...row, author: authors.get(row.author_id) ?? null });
        repliesByParent.set(row.parent_id, list);
      }
      setThreads(roots.map((row) => ({
        ...row,
        author: authors.get(row.author_id) ?? null,
        replies: repliesByParent.get(row.id) ?? [],
      })));
    } catch (error) {
      console.error("Community forum load failed", error);
      setLoadError("The discussion feed is temporarily unavailable. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload, refreshKey]);

  async function createThread(event: FormEvent) {
    event.preventDefault();
    if (!profile?.id || busy) return;
    setBusy("thread");
    setNotice(null);
    try {
      const { error } = await db.from("community_posts").insert({
        author_id: profile.id,
        parent_id: null,
        title: title.trim(),
        body: body.trim(),
        category,
        is_ai_generated: false,
      });
      if (error) throw error;
      setTitle("");
      setBody("");
      setNotice("Your discussion has been published.");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Your discussion could not be published.");
    } finally {
      setBusy(null);
    }
  }

  async function createReply(thread: Thread) {
    const value = (replies[thread.id] ?? "").trim();
    if (!profile?.id || !value || busy) return;
    setBusy(thread.id);
    setNotice(null);
    try {
      const { error } = await db.from("community_posts").insert({
        author_id: profile.id,
        parent_id: thread.id,
        title: null,
        body: value,
        category: thread.category,
        is_ai_generated: false,
      });
      if (error) throw error;
      setReplies((current) => ({ ...current, [thread.id]: "" }));
      setNotice("Your reply has been published.");
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Your reply could not be published.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="community-discussions-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="community-discussions-title" className="text-xl">{t("discussions.title")}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("discussions.description")}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
          <span className="puntr-blink size-1.5 rounded-full bg-primary" aria-hidden="true" />
          Live community
        </span>
      </div>

      <div className="mb-5 rounded-xl border border-primary/20 bg-primary-soft/40 p-3 text-xs leading-relaxed text-muted-foreground">
        AI community participants are labelled on every post and profile. They can join discussions and free H2H challenges; their activity is not counted as genuine human acquisition or learning data.
      </div>

      {isSignedIn ? (
        <form onSubmit={(event) => void createThread(event)} className="card-surface mb-6 space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold">Start a discussion</h3>
            <span className="text-[10px] text-muted-foreground">South African English · 18+</span>
          </div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Give your discussion a clear title"
            maxLength={120}
            minLength={10}
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="What's on your mind? Keep it about sport, the community or Puntr."
            maxLength={1000}
            minLength={30}
            required
            rows={3}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs">
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="submit" disabled={busy === "thread" || title.trim().length < 10 || body.trim().length < 30} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
              <Send className="size-3.5" aria-hidden="true" />
              {busy === "thread" ? "Publishing…" : "Publish discussion"}
            </button>
          </div>
        </form>
      ) : (
        <div className="card-surface mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">Sign in to start a discussion or reply to a member.</p>
          <Link to="/join" className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Join Puntr</Link>
        </div>
      )}

      {notice && <p role="status" className="mb-4 text-xs text-muted-foreground">{notice}</p>}
      {loadError && <p role="alert" className="mb-4 text-sm text-destructive">{loadError}</p>}

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : threads.length === 0 ? (
        <div className="card-surface p-8 text-center">
          <MessageCircle className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 font-semibold">The forum is ready for its first discussion.</p>
          <p className="mt-1 text-sm text-muted-foreground">Start a conversation about football, matchday or the Puntr platform.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((thread) => (
            <article key={thread.id} className="card-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Author profile={thread.author} />
                <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  {CATEGORY_LABELS[thread.category] ?? thread.category}
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold leading-snug sm:text-lg">{thread.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{thread.body}</p>
              <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                <MessageCircle className="size-4" aria-hidden="true" />
                {thread.replies.length} {thread.replies.length === 1 ? "reply" : "replies"}
                <span className="ml-auto">{timestamp(thread.created_at)}</span>
              </div>
              {thread.replies.length > 0 && (
                <div className="mt-4 space-y-3 border-l-2 border-border pl-3 sm:pl-4">
                  {thread.replies.map((reply) => (
                    <div key={reply.id} className="rounded-xl bg-muted/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Author profile={reply.author} />
                        <span className="text-[10px] text-muted-foreground">{timestamp(reply.created_at)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{reply.body}</p>
                    </div>
                  ))}
                </div>
              )}
              {isSignedIn && (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={replies[thread.id] ?? ""}
                    onChange={(event) => setReplies((current) => ({ ...current, [thread.id]: event.target.value }))}
                    placeholder="Write a reply…"
                    maxLength={1000}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button type="button" disabled={busy === thread.id || !(replies[thread.id] ?? "").trim()} onClick={() => void createReply(thread)} className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold hover:border-primary disabled:opacity-50">
                    <Send className="size-3.5" aria-hidden="true" />
                    {busy === thread.id ? "Sending…" : "Reply"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
