import { supabase } from "@/integrations/supabase/client";

export const NEWSROOM_CATEGORIES = [
  "company",
  "product",
  "pfie",
  "features",
  "community",
  "launch",
  "sports",
] as const;
export type NewsroomCategory = (typeof NEWSROOM_CATEGORIES)[number];

export interface NewsroomArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover_image_url: string | null;
  category: NewsroomCategory;
  author_name: string;
  published_at: string;
  updated_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
}

export type NewsroomSummary = Omit<NewsroomArticle, "body">;

const SUMMARY_COLUMNS =
  "id, slug, title, excerpt, cover_image_url, category, author_name, published_at, updated_at, seo_title, seo_description, og_image_url";

export function isCategory(value: unknown): value is NewsroomCategory {
  return typeof value === "string" && (NEWSROOM_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Published articles only. Row level security already hides drafts, review, scheduled and archived items from
 * everyone but admins, and the filters here keep an admin's own view of the public pages honest.
 */
export async function fetchPublished(opts: {
  category?: NewsroomCategory;
  limit?: number;
}): Promise<NewsroomSummary[]> {
  let q = supabase
    .from("newsroom_articles")
    .select(SUMMARY_COLUMNS)
    .eq("status", "PUBLISHED")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.category) q = q.eq("category", opts.category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as NewsroomSummary[];
}

export async function fetchArticle(slug: string): Promise<NewsroomArticle | null> {
  const { data, error } = await supabase
    .from("newsroom_articles")
    .select(`${SUMMARY_COLUMNS}, body`)
    .eq("slug", slug)
    .eq("status", "PUBLISHED")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return (data as NewsroomArticle | null) ?? null;
}
