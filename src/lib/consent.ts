/**
 * Visitor consent (POPIA). Privacy by default: nothing optional runs until the visitor says yes.
 *
 * Choices live in one first-party cookie (`puntr_consent`) with a random id. Signed-in users also get their
 * choices written to consent_records through the record_consent RPC, so there is evidence of consent.
 * No IP address, user agent or fingerprint is stored.
 */

export type ConsentPurpose = "analytics" | "affiliate_tracking" | "pfie_learning";

export interface ConsentState {
  /** Cookie format version. */
  v: 1;
  /** Random id for this browser. Not linked to anything else. */
  id: string;
  analytics: boolean;
  affiliate_tracking: boolean;
  pfie_learning: boolean;
  noticeVersion: string;
  /** ISO time the choice was made. */
  ts: string;
}

export const CONSENT_COOKIE = "puntr_consent";
export const CONSENT_NOTICE_VERSION = "2026-11-27-pfie-learning";
export const CONSENT_CHANGED_EVENT = "puntr:consent-changed";
export const CONSENT_OPEN_EVENT = "puntr:open-consent";
/** Fired by the consent banner whenever it shows or hides (detail: { open: boolean }). */
export const CONSENT_BANNER_EVENT = "puntr:consent-banner";
/** Set on <html> while the consent banner is on screen, so late-mounting overlays can check it. */
export const CONSENT_BANNER_ATTR = "data-consent-banner";

/** True when this browser already holds a choice made under the current notice. */
export function hasCurrentConsent(): boolean {
  return readConsent()?.noticeVersion === CONSENT_NOTICE_VERSION;
}

const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 14)}`;
}

export function parseConsent(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentState>;
    if (data.v !== 1 || typeof data.id !== "string") return null;
    return {
      v: 1,
      id: data.id,
      analytics: data.analytics === true,
      affiliate_tracking: data.affiliate_tracking === true,
      pfie_learning: data.pfie_learning === true,
      noticeVersion: typeof data.noticeVersion === "string" ? data.noticeVersion : "2026-10-29",
      ts: typeof data.ts === "string" ? data.ts : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function readConsent(): ConsentState | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(match?.slice(CONSENT_COOKIE.length + 1));
}

/** True only when the visitor has actively said yes to this purpose. Defaults to false. */
export function hasConsent(purpose: ConsentPurpose): boolean {
  return readConsent()?.[purpose] === true;
}

export function writeConsent(
  choice: Pick<ConsentState, "analytics" | "affiliate_tracking"> &
    Partial<Pick<ConsentState, "pfie_learning">>,
  source: "banner" | "account" = "banner",
  syncToAccount = true,
): ConsentState {
  const previous = readConsent();
  const state: ConsentState = {
    v: 1,
    id: previous?.id ?? newId(),
    analytics: choice.analytics,
    affiliate_tracking: choice.affiliate_tracking,
    pfie_learning: choice.pfie_learning === true,
    noticeVersion: CONSENT_NOTICE_VERSION,
    ts: new Date().toISOString(),
  };

  if (typeof document !== "undefined") {
    const secure =
      typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(state))}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: state }));
  }

  // Never block the UI on this.
  if (syncToAccount) void syncConsentToAccount(state, source);
  return state;
}

/** When a user is signed in, keep an auditable copy of each choice in consent_records. */
export async function syncConsentToAccount(
  state: ConsentState,
  source: "banner" | "account" = "banner",
): Promise<void> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const purposes: ConsentPurpose[] = ["analytics", "affiliate_tracking", "pfie_learning"];
    for (const purpose of purposes) {
      await supabase.rpc("record_consent", {
        p_purpose: purpose,
        p_granted: state[purpose],
        p_notice_version: CONSENT_NOTICE_VERSION,
        p_source: source,
      });
    }
  } catch {
    /* consent evidence is best effort; the cookie is what gates tracking */
  }
}

/** On sign-in, persist a previously made browser choice only for purposes with no account record yet. */
export async function syncMissingConsentToAccount(state: ConsentState): Promise<void> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const purposes: ConsentPurpose[] = ["analytics", "affiliate_tracking", "pfie_learning"];
    const { data: existing, error } = await supabase
      .from("current_consents")
      .select("purpose")
      .eq("user_id", data.session.user.id)
      .in("purpose", purposes);
    if (error) return;
    const recorded = new Set((existing ?? []).map((row) => row.purpose));
    for (const purpose of purposes) {
      if (recorded.has(purpose)) continue;
      await supabase.rpc("record_consent", {
        p_purpose: purpose,
        p_granted: state[purpose],
        p_notice_version: CONSENT_NOTICE_VERSION,
        p_source: "banner",
      });
    }
  } catch {
    /* the server-side consent ledger is best-effort; local cookie still gates capture */
  }
}

export function openConsentBanner(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT));
}
