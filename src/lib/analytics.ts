/**
 * Lightweight analytics helper.
 * Pushes events to any installed analytics layer (GA4 / GTM) and logs in dev.
 */
type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: string, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

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
  planSelected: (plan: string, source: string) => trackEvent("pricing_plan_selected", { plan, source }),
  earlyAccessOpened: (plan?: string) => trackEvent("early_access_modal_opened", { plan: plan ?? "unspecified" }),
  earlyAccessSubmitted: (plan: string) => trackEvent("early_access_submitted", { plan }),
  earlyAccessFailed: (plan: string, reason: string) => trackEvent("early_access_failed", { plan, reason }),
};
