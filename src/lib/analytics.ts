/**
 * Lightweight analytics helper.
 * Pushes events to any installed analytics layer (GA4 / GTM) and logs in dev.
 * Nothing is sent or queued until the visitor has said yes to the Analytics purpose (POPIA).
 */
import { hasConsent } from "@/lib/consent";

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

  if (import.meta.env.DEV) console.info("[analytics]", event, payload);
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
};
