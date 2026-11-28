import { supabase } from "@/integrations/supabase/client";

/**
 * Community bookmaker reviews (migration 20261128310000_bookmaker_reviews.sql). Every call tolerates the
 * migration not being applied yet: reads return `available: false` and the UI hides the reviews block.
 * The tables are not in the generated types yet, so queries go through an untyped client handle.
 */

export interface BookmakerReviewStats {
  count: number;
  overall: number;
  easeOfUse: number;
  payouts: number;
  support: number;
}

export interface PublicBookmakerReview {
  id: string;
  overall: number;
  easeOfUse: number;
  payouts: number;
  support: number;
  body: string | null;
  createdAt: string;
  username: string | null;
  displayName: string | null;
}

export interface MyBookmakerReview {
  overall: number;
  easeOfUse: number;
  payouts: number;
  support: number;
  body: string | null;
}

export const REVIEW_BODY_MAX = 600;

type Err = { code?: string; message?: string } | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

export function reviewsMissing(error: Err): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "42883" ||
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    /does not exist|could not find/i.test(error.message ?? "")
  );
}

export interface BookmakerReviewsData {
  available: boolean;
  stats: BookmakerReviewStats | null;
  reviews: PublicBookmakerReview[];
}

export async function fetchBookmakerReviews(slug: string): Promise<BookmakerReviewsData> {
  const [statsRes, listRes] = await Promise.all([
    db
      .from("bookmaker_review_stats")
      .select("review_count, avg_overall, avg_ease_of_use, avg_payouts, avg_support")
      .eq("bookmaker_slug", slug)
      .maybeSingle(),
    db
      .from("public_bookmaker_reviews")
      .select(
        "id, overall, ease_of_use, payouts, support, body, created_at, username, display_name",
      )
      .eq("bookmaker_slug", slug)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (reviewsMissing(statsRes.error) || reviewsMissing(listRes.error)) {
    return { available: false, stats: null, reviews: [] };
  }
  if (statsRes.error) throw statsRes.error;
  if (listRes.error) throw listRes.error;
  const s = statsRes.data as {
    review_count: number;
    avg_overall: number;
    avg_ease_of_use: number;
    avg_payouts: number;
    avg_support: number;
  } | null;
  return {
    available: true,
    stats: s
      ? {
          count: s.review_count,
          overall: Number(s.avg_overall),
          easeOfUse: Number(s.avg_ease_of_use),
          payouts: Number(s.avg_payouts),
          support: Number(s.avg_support),
        }
      : null,
    reviews: (
      (listRes.data ?? []) as {
        id: string;
        overall: number;
        ease_of_use: number;
        payouts: number;
        support: number;
        body: string | null;
        created_at: string;
        username: string | null;
        display_name: string | null;
      }[]
    ).map((r) => ({
      id: r.id,
      overall: r.overall,
      easeOfUse: r.ease_of_use,
      payouts: r.payouts,
      support: r.support,
      body: r.body,
      createdAt: r.created_at,
      username: r.username,
      displayName: r.display_name,
    })),
  };
}

export async function fetchMyBookmakerReview(
  userId: string,
  slug: string,
): Promise<MyBookmakerReview | null> {
  const { data, error } = await db
    .from("bookmaker_reviews")
    .select("overall, ease_of_use, payouts, support, body")
    .eq("user_id", userId)
    .eq("bookmaker_slug", slug)
    .maybeSingle();
  if (error) {
    if (reviewsMissing(error)) return null;
    throw error;
  }
  if (!data) return null;
  const r = data as {
    overall: number;
    ease_of_use: number;
    payouts: number;
    support: number;
    body: string | null;
  };
  return {
    overall: r.overall,
    easeOfUse: r.ease_of_use,
    payouts: r.payouts,
    support: r.support,
    body: r.body,
  };
}

export async function saveBookmakerReview(
  userId: string,
  slug: string,
  review: MyBookmakerReview,
): Promise<void> {
  const body = review.body?.trim().slice(0, REVIEW_BODY_MAX) || null;
  const { error } = await db.from("bookmaker_reviews").upsert(
    {
      user_id: userId,
      bookmaker_slug: slug,
      overall: review.overall,
      ease_of_use: review.easeOfUse,
      payouts: review.payouts,
      support: review.support,
      body,
    },
    { onConflict: "user_id,bookmaker_slug" },
  );
  if (error) throw error;
}

export async function deleteBookmakerReview(userId: string, slug: string): Promise<void> {
  const { error } = await db
    .from("bookmaker_reviews")
    .delete()
    .eq("user_id", userId)
    .eq("bookmaker_slug", slug);
  if (error) throw error;
}
