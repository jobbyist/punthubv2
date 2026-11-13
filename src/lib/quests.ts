/**
 * Onboarding quests and the profile completion tracker. Data from the quests tables (migration
 * 20261113230000_onboarding_quests.sql); verification and points happen in the database.
 */
import { supabase } from "@/integrations/supabase/client";

export interface Quest {
  code: string;
  title: string;
  description: string;
  category: "account" | "social" | "notifications" | "app" | "referral";
  verification: "auto" | "device" | "review";
  points: number;
  action_url: string | null;
  handle_label: string | null;
  sort: number;
  coming_soon: boolean;
  /** False for plain "visit" links (social pages): no points, never completed. */
  rewarded: boolean;
}

export type QuestStatus = "todo" | "started" | "submitted" | "verified" | "rejected";

export interface QuestRow extends Quest {
  status: QuestStatus;
  evidence: string | null;
  reviewNote: string | null;
  pointsAwarded: number;
}

export interface QuestSummary {
  rows: QuestRow[];
  earned: number;
  available: number;
  done: number;
  total: number;
}

export function summariseQuests(
  quests: Quest[],
  progress: {
    quest_code: string;
    status: string;
    evidence: string | null;
    review_note: string | null;
    points_awarded: number;
  }[],
): QuestSummary {
  const byCode = new Map(progress.map((p) => [p.quest_code, p]));
  const rows: QuestRow[] = [...quests]
    .sort((a, b) => a.sort - b.sort)
    .map((q) => {
      const p = byCode.get(q.code);
      return {
        ...q,
        status: (p?.status as QuestStatus | undefined) ?? "todo",
        evidence: p?.evidence ?? null,
        reviewNote: p?.review_note ?? null,
        pointsAwarded: p?.points_awarded ?? 0,
      };
    });
  const live = rows.filter((r) => !r.coming_soon && r.rewarded !== false);
  return {
    rows,
    earned: rows.reduce((n, r) => n + r.pointsAwarded, 0),
    available: live.filter((r) => r.status !== "verified").reduce((n, r) => n + r.points, 0),
    done: live.filter((r) => r.status === "verified").length,
    total: live.length,
  };
}

/** Runs the server checks for automatic quests (awarding any now done), then loads the list. */
export async function loadQuests(
  userId: string,
): Promise<{ summary: QuestSummary; newlyAwarded: number }> {
  const sync = await supabase.rpc("quests_sync");
  // A failed check is not fatal: the list still loads and the next visit checks again.
  if (sync.error) console.error("quests: automatic checks failed", sync.error.message);
  const [{ data: quests, error: e1 }, { data: progress, error: e2 }] = await Promise.all([
    supabase.from("quests").select("*").eq("active", true),
    supabase
      .from("quest_progress")
      .select("quest_code, status, evidence, review_note, points_awarded")
      .eq("user_id", userId),
  ]);
  if (e1 || e2) throw e1 ?? e2;
  return {
    summary: summariseQuests((quests ?? []) as Quest[], progress ?? []),
    newlyAwarded: typeof sync.data === "number" ? sync.data : 0,
  };
}

export async function startQuest(code: string): Promise<void> {
  const { error } = await supabase.rpc("quest_start", { p_code: code });
  if (error) throw error;
}

export async function submitQuest(code: string, evidence: string): Promise<string> {
  const { data, error } = await supabase.rpc("quest_submit", {
    p_code: code,
    p_evidence: evidence,
  });
  if (error) throw error;
  return String(data);
}

/** True when this page is running as an installed app (home-screen PWA). */
export function runningInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true || nav.standalone === true
  );
}

export async function claimDeviceQuest(
  code: "install_app" | "push_notifications",
): Promise<number> {
  const { data, error } = await supabase.rpc("quest_claim_device", { p_code: code });
  if (error) throw error;
  return typeof data === "number" ? data : 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Profile completion

export interface CompletionInput {
  avatarUrl: string | null | undefined;
  displayName: string | null | undefined;
  details: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    date_of_birth?: string | null;
    province?: string | null;
  } | null;
  emailConfirmed: boolean;
  hasMfa: boolean | null;
  identityVerified: boolean;
}

export interface CompletionItem {
  key: "avatar" | "name" | "phone" | "dob" | "province" | "email" | "mfa" | "identity";
  done: boolean;
  href: string;
}

const filled = (v: string | null | undefined) => typeof v === "string" && v.trim().length > 0;

export function profileCompletion(i: CompletionInput): {
  percent: number;
  items: CompletionItem[];
} {
  const d = i.details ?? {};
  const items: CompletionItem[] = [
    { key: "avatar", done: filled(i.avatarUrl), href: "/account#avatar" },
    {
      key: "name",
      done: filled(i.displayName) && filled(d.first_name) && filled(d.last_name),
      href: "/account#details",
    },
    { key: "phone", done: filled(d.phone), href: "/account#details" },
    { key: "dob", done: filled(d.date_of_birth), href: "/account#details" },
    { key: "province", done: filled(d.province), href: "/account#details" },
    { key: "email", done: i.emailConfirmed, href: "/account/security" },
    { key: "mfa", done: i.hasMfa === true, href: "/account/security" },
    { key: "identity", done: i.identityVerified, href: "/account#identity" },
  ];
  const percent = Math.round((items.filter((x) => x.done).length / items.length) * 100);
  return { percent, items };
}
