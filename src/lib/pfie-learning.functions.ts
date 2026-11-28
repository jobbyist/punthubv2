import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED_EVENTS = new Set([
  "fixture_viewed",
  "pfie_insight_opened",
  "newsroom_article_viewed",
  "newsroom_category_selected",
  "notification_clicked",
  "notification_dropdown_opened",
  "share_clicked",
  "referral_link_copied",
  "user_activated",
  "profile_created",
  "signup_completed",
  "pricing_plan_selected",
  "founding_cta_clicked",
  "landing_viewed",
  "about_page_viewed",
  "about_founding_cta_clicked",
  "market_filter_changed",
  "sport_filter_changed",
  "search_submitted",
]);
const ALLOWED_KEYS = new Set([
  "sport",
  "competition",
  "market",
  "category",
  "slug",
  "what",
  "source",
  "position",
]);

function cleanEventData(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!ALLOWED_KEYS.has(key) || typeof raw !== "string") continue;
    const safe = raw.trim().slice(0, 80);
    if (safe) output[key] = safe;
  }
  return output;
}

export const recordPfieActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (data: { event: string; payload?: Record<string, unknown>; fixtureId?: string }) => data,
  )
  .handler(async ({ context, data }): Promise<boolean> => {
    if (!ALLOWED_EVENTS.has(data.event)) return false;
    const db = context.supabase as unknown as SupabaseClient;
    const { data: memberProfile, error: profileError } = await db
      .from("profiles")
      .select("is_ai_participant")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileError || memberProfile?.is_ai_participant !== false) return false;
    const { data: consent, error: consentError } = await db
      .from("current_consents")
      .select("granted")
      .eq("user_id", context.userId)
      .eq("purpose", "pfie_learning")
      .maybeSingle();
    if (consentError || consent?.granted !== true) return false;
    const { error } = await db.from("pfie_user_activity_events").insert({
      user_id: context.userId,
      event_type: data.event,
      fixture_id:
        typeof data.fixtureId === "string" && /^[0-9a-f-]{36}$/i.test(data.fixtureId)
          ? data.fixtureId
          : null,
      event_data: cleanEventData(data.payload),
      source: "client",
    });
    if (error) {
      // Consent can be withdrawn between the read and insert; telemetry must never break product UX.
      if (error.code !== "42501")
        console.warn("[pfie-learning] activity capture skipped", error.message);
      return false;
    }
    return true;
  });

export const setPfieLearningConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { granted: boolean }) => data)
  .handler(async ({ context, data }): Promise<boolean> => {
    const { data: memberProfile, error: profileError } = await context.supabase
      .from("profiles")
      .select("is_ai_participant")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileError || memberProfile?.is_ai_participant !== false) return false;
    const { error: consentError } = await context.supabase.rpc("record_consent", {
      p_purpose: "pfie_learning",
      p_granted: data.granted,
      p_notice_version: "2026-11-27-pfie-learning",
      p_source: "account",
    });
    if (consentError) throw consentError;

    if (!data.granted) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const admin = supabaseAdmin as unknown as SupabaseClient;
      const { data: subject } = await admin
        .from("pfie_learning_subject_map")
        .select("subject_key")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (subject?.subject_key) {
        const { error } = await admin
          .from("pfie_learning_examples")
          .delete()
          .eq("subject_key", subject.subject_key);
        if (error) throw error;
      }
      const { error: eventError } = await admin
        .from("pfie_user_activity_events")
        .delete()
        .eq("user_id", context.userId);
      if (eventError) throw eventError;
      const { error: mapError } = await admin
        .from("pfie_learning_subject_map")
        .delete()
        .eq("user_id", context.userId);
      if (mapError) throw mapError;
    }
    return true;
  });
