/**
 * Lightweight analytics helper.
 * Pushes events to any installed analytics layer (GA4 / GTM), stores them first-party in Supabase
 * (campaign_events, with the ad's UTM tags) for the admin Campaigns tab, and logs in dev.
 * Nothing is sent or queued until the visitor has said yes to the Analytics purpose (POPIA).
 */
import { currentUtm } from "@/lib/campaign";
import { hasConsent, readConsent } from "@/lib/consent";

type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: string, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;
  if (!hasConsent("analytics")) return;

  const data = { event, ...payload, timestamp: new Date().toISOString() };

  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(data);
    window.gtag?.("event", event, payload);
  } catch {
    /* analytics must never break the UI */
  }

  void storeEvent(event, payload);

  if (import.meta.env.DEV) console.info("[analytics]", event, payload);
}

/** First-party copy for the admin dashboard. Only the consent cookie's random id identifies the browser. */
async function storeEvent(event: string, payload: AnalyticsPayload) {
  const visitor = readConsent()?.id;
  if (!visitor) return;
  const utm = currentUtm();
  const detailValue =
    payload["position"] ?? payload["plan"] ?? payload["source"] ?? payload["what"];
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.rpc("log_campaign_event", {
      p_event: event,
      p_visitor: visitor,
      ...(utm.utm_source ? { p_utm_source: utm.utm_source } : {}),
      ...(utm.utm_medium ? { p_utm_medium: utm.utm_medium } : {}),
      ...(utm.utm_campaign ? { p_utm_campaign: utm.utm_campaign } : {}),
      ...(utm.utm_content ? { p_utm_content: utm.utm_content } : {}),
      ...(utm.utm_term ? { p_utm_term: utm.utm_term } : {}),
      ...(typeof location !== "undefined" ? { p_path: location.pathname } : {}),
      ...(detailValue === undefined ? {} : { p_detail: String(detailValue) }),
    });
  } catch {
    /* analytics must never break the UI */
  }
}

export const analytics = {
  planSelected: (plan: string, source: string) =>
    trackEvent("pricing_plan_selected", { plan, source }),
  earlyAccessOpened: (plan?: string) =>
    trackEvent("early_access_modal_opened", { plan: plan ?? "unspecified" }),
  earlyAccessSubmitted: (plan: string) => trackEvent("early_access_submitted", { plan }),
  earlyAccessFailed: (plan: string, reason: string) =>
    trackEvent("early_access_failed", { plan, reason }),
  joinStarted: () => trackEvent("join_started"),
  pickPosted: (market: string, sport: string) => trackEvent("pick_posted", { market, sport }),
  userActivated: () => trackEvent("user_activated"),
  referralLinkCopied: () => trackEvent("referral_link_copied"),
  shareClicked: (what: "pick" | "invite") => trackEvent("share_clicked", { what }),
  otpVerified: () => trackEvent("otp_verified"),
  profileCreated: () => trackEvent("profile_created"),
  newsroomViewed: () => trackEvent("newsroom_viewed"),
  newsroomArticleViewed: (slug: string) => trackEvent("newsroom_article_viewed", { slug }),
  newsroomCategorySelected: (category: string) =>
    trackEvent("newsroom_category_selected", { category }),
  newsroomArticleShared: (slug: string, channel: string) =>
    trackEvent("newsroom_article_shared", { slug, channel }),
  notificationDropdownOpened: () => trackEvent("notification_dropdown_opened"),
  notificationClicked: () => trackEvent("notification_clicked"),
  notificationMarkedRead: () => trackEvent("notification_marked_read"),
  notificationsMarkedAllRead: () => trackEvent("notifications_marked_all_read"),
  aboutPageViewed: () => trackEvent("about_page_viewed"),
  aboutFoundingCtaClicked: () => trackEvent("about_founding_cta_clicked"),
  aboutNewsroomClicked: () => trackEvent("about_newsroom_clicked"),
  surveySubmitted: (draw: boolean) => trackEvent("survey_submitted", { draw }),
  landingViewed: (page: string) => trackEvent("landing_viewed", { source: page }),
  foundingCtaClicked: (position: string) => trackEvent("founding_cta_clicked", { position }),
  signupCompleted: (founding: boolean) =>
    trackEvent("signup_completed", { what: founding ? "founding" : "member" }),
};
