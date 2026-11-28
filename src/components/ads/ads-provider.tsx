import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useSession } from "@/components/session";
import { useBrandLogos } from "@/hooks/use-brand-logos";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { AdCreative, AdPartner } from "@/lib/ads";
import { hasConsent } from "@/lib/consent";
import { AFFILIATES_ENABLED } from "@/lib/flags";
import { platforms } from "@/lib/mock-data";

const AGE_KEY = "puntr:affiliate-age-confirmed";
/** Bundled bookmaker marks in public/logos, used when no logo has been uploaded in Admin > Logos/Branding. */
const BUNDLED_LOGOS = new Set([
  "10bet",
  "1xbet",
  "bet-co-za",
  "betfair",
  "betway",
  "easybet",
  "hollywoodbets",
  "playabets",
  "sportingbet",
  "stake",
  "supabets",
]);

type AdsValue = {
  /** False until partners, Pro status and the 18+ state are known: slots render nothing before then. */
  ready: boolean;
  /** Puntr Pro: no ads anywhere. */
  adFree: boolean;
  /** Ads may be shown to this visitor at all (flag on, not Pro, not on a break). */
  eligible: boolean;
  /** 18+ confirmed for this session, or attested on the member's profile. */
  ageConfirmed: boolean;
  confirmAge: () => void;
  partners: AdPartner[];
  creatives: AdCreative[];
  logoFor: (name: string, slug: string | null) => string | null;
};

const Ctx = createContext<AdsValue | null>(null);

/** Untyped handle for the ads views and RPCs (added in migration 20261128300000). */
const db = supabase as unknown as SupabaseClient;

let inventory: Promise<{ partners: AdPartner[]; creatives: AdCreative[] } | null> | null = null;

/** Live partners and approved creatives, fetched once per page load. Resolves null on failure (retried next mount). */
function loadInventory() {
  inventory ??= (async () => {
    const [p, c] = await Promise.all([
      db.from("public_affiliate_partners").select("*").order("name"),
      // The creatives view arrives with migration 20261128300000; without it, slots use default units.
      db.from("public_affiliate_creatives").select("*"),
    ]);
    if (p.error) throw p.error;
    const partners = ((p.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r["id"]),
      name: String(r["name"]),
      // slug arrives with migration 20261128300000; derive it from the name until then.
      slug:
        typeof r["slug"] === "string"
          ? r["slug"]
          : String(r["name"])
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""),
      tracking_link: String(r["tracking_link"]),
      website_url: typeof r["website_url"] === "string" ? r["website_url"] : null,
    }));
    const creatives = c.error ? [] : ((c.data ?? []) as unknown as AdCreative[]);
    return { partners, creatives };
  })().catch(() => {
    inventory = null;
    return null;
  });
  return inventory;
}

/** Fire-and-forget aggregate count (no personal data), only with Affiliate tracking consent. */
export function recordAdEvent(
  partnerId: string,
  creativeId: string | null,
  placement: string,
  kind: "impression" | "click" | "dismiss",
) {
  if (typeof window === "undefined" || !hasConsent("affiliate_tracking")) return;
  void db
    .rpc("record_ad_event", {
      p_partner: partnerId,
      p_creative: creativeId,
      p_placement: placement,
      p_kind: kind,
    })
    .then(
      () => undefined,
      () => undefined,
    );
}

export function AdsProvider({ children }: { children: ReactNode }) {
  const { loading, user } = useSession();
  const uploaded = useBrandLogos("bookmakers");
  const [inv, setInv] = useState<{ partners: AdPartner[]; creatives: AdCreative[] } | null>(null);
  const [member, setMember] = useState<{
    adFree: boolean;
    attested: boolean;
    onBreak: boolean;
  } | null>(null);
  const [sessionAge, setSessionAge] = useState(false);

  useEffect(() => {
    try {
      setSessionAge(window.sessionStorage.getItem(AGE_KEY) === "yes");
    } catch {
      setSessionAge(false);
    }
    if (!AFFILIATES_ENABLED) return;
    let live = true;
    void loadInventory().then((v) => live && v && setInv(v));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setMember({ adFree: false, attested: false, onBreak: false });
      return;
    }
    let live = true;
    void (async () => {
      const [profile, adFreeRpc] = await Promise.all([
        supabase
          .from("profiles")
          .select("account_type, is_18_attested, posting_paused_until")
          .eq("id", user.id)
          .maybeSingle(),
        db.rpc("is_ad_free"),
      ]);
      // Before migration 20261128300000 is applied, fall back to the existing Pro entitlement check.
      const adFree = adFreeRpc.error
        ? await db.rpc("has_entitlement", { p_user: user.id, p_entitlement: "pro" })
        : adFreeRpc;
      const row = profile.data as {
        account_type: string;
        is_18_attested: boolean;
        posting_paused_until: string | null;
      } | null;
      const paused = row?.posting_paused_until
        ? Date.parse(row.posting_paused_until) > Date.now()
        : false;
      if (!live) return;
      // When neither check answered, fail closed: a Pro member must never see ads because of a network error.
      const unknown = Boolean(adFree.error) && Boolean(profile.error);
      setMember({
        adFree: unknown || (adFree.data as unknown) === true || row?.account_type === "pro",
        attested: row?.is_18_attested === true,
        onBreak: paused,
      });
    })().catch(() => live && setMember({ adFree: true, attested: false, onBreak: false }));
    return () => {
      live = false;
    };
  }, [loading, user]);

  const confirmAge = useCallback(() => {
    try {
      window.sessionStorage.setItem(AGE_KEY, "yes");
    } catch {
      // Still applies while this page stays open.
    }
    setSessionAge(true);
  }, []);

  const logoFor = useCallback(
    (name: string, slug: string | null) => {
      const key = name.toLowerCase();
      const up = uploaded.find((l) => l.active && l.imageUrl && l.name.toLowerCase() === key);
      if (up?.imageUrl) return up.imageUrl;
      const bundled = platforms.find((p) => p.name.toLowerCase() === key)?.logo;
      if (bundled) return bundled;
      return slug && BUNDLED_LOGOS.has(slug) ? `/logos/${slug}.png` : null;
    },
    [uploaded],
  );

  const value = useMemo<AdsValue>(() => {
    const ready = AFFILIATES_ENABLED && inv !== null && member !== null;
    const adFree = member?.adFree ?? false;
    return {
      ready,
      adFree,
      eligible: ready && !adFree && !(member?.onBreak ?? false) && (inv?.partners.length ?? 0) > 0,
      ageConfirmed: sessionAge || (member?.attested ?? false),
      confirmAge,
      partners: inv?.partners ?? [],
      creatives: inv?.creatives ?? [],
      logoFor,
    };
  }, [inv, member, sessionAge, confirmAge, logoFor]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const FALLBACK: AdsValue = {
  ready: false,
  adFree: false,
  eligible: false,
  ageConfirmed: false,
  confirmAge: () => undefined,
  partners: [],
  creatives: [],
  logoFor: () => null,
};

/** Outside the provider (tests, isolated renders) nothing is shown. */
export function useAds(): AdsValue {
  return useContext(Ctx) ?? FALLBACK;
}
