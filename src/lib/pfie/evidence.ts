/**
 * Shared deterministic evidence checks for PFIE feeds beyond the existing fixture/result and standings pipelines.
 * Extraction models are untrusted: callers must validate page quotes and publisher identity before invoking consensus.
 * Publisher identity is supplied by the trusted source registry; source hosts and subdomains never create extra votes.
 */
export type EvidenceTier = "official" | "trusted" | "licensed_bookmaker" | "other";
export type EvidenceVerdict = "verified" | "single_source" | "disputed" | "rejected";

export interface Evidence<T> {
  sourceId: string;
  domain: string;
  tier: EvidenceTier;
  retrievedAt: string;
  value: T;
  /** Exact text copied from the source. */
  quote: string;
}

export interface EvidenceRejection<T> {
  evidence: Evidence<T>;
  reason: "invalid_domain" | "invalid_timestamp" | "stale" | "missing_quote" | "quote_not_on_page";
}

export interface EvidenceDecision<T> {
  verdict: EvidenceVerdict;
  value: T | null;
  /** Curated publisher domains, not source hostnames. */
  domains: string[];
  evidence: Evidence<T>[];
  rejected: EvidenceRejection<T>[];
  reason: string;
}

export interface EvidencePolicy {
  now: Date;
  maxAgeMs: number;
  minIndependentDomains?: number;
  /** Captured source page text keyed by sourceId. Required for every evidence item. */
  pageTextBySource: ReadonlyMap<string, string>;
  /**
   * Curated publisher/registrable-domain identity keyed by sourceId.
   * Populate this from the trusted source registry, never from extracted page text or model output.
   */
  publisherDomainBySource: ReadonlyMap<string, string>;
  /** If supplied, only these curated publisher domains may contribute. */
  allowedDomains?: ReadonlySet<string>;
}

const normaliseText = (value: string) => value.toLocaleLowerCase().replace(/\s+/g, " ").trim();

/** Normalise a URL or hostname into a validated lower-case host, without a leading www. */
export const normaliseEvidenceDomain = (value: string): string => {
  const input = value
    .trim()
    .toLocaleLowerCase()
    .replace(/^https?:\/\//, "");
  const candidate = (input.split(/[/?#]/, 1)[0] ?? "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "")
    .replace(/\.$/, "");
  if (
    !candidate ||
    candidate.length > 253 ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(candidate)
  ) {
    return "";
  }
  return candidate;
};

function reject<T>(
  rejected: EvidenceRejection<T>[],
  evidence: Evidence<T>,
  reason: EvidenceRejection<T>["reason"],
) {
  rejected.push({ evidence, reason });
}

/**
 * Exact-value corroboration for facts where independent sources should report the same value
 * (kick-off, final score, player identity/status, match-stat value after unit normalisation).
 *
 * An official source can satisfy the threshold by itself only when no other accepted official source conflicts.
 * Non-official facts require the configured number of curated independent publisher domains. Any material
 * disagreement is disputed; the function never selects a majority value or lets an AI-generated confidence score
 * break a tie. Every quote must be found in captured source-page text.
 */
export function verifyEvidence<T>(
  input: readonly Evidence<T>[],
  policy: EvidencePolicy,
  canonicalise: (value: T) => string = (value) => JSON.stringify(value),
): EvidenceDecision<T> {
  const accepted: Evidence<T>[] = [];
  const rejected: EvidenceRejection<T>[] = [];
  const publisherBySource = new Map<string, string>();

  for (const item of input) {
    const host = normaliseEvidenceDomain(item.domain);
    const publisher = normaliseEvidenceDomain(
      policy.publisherDomainBySource.get(item.sourceId) ?? "",
    );
    if (!host || !publisher || !(host === publisher || host.endsWith("." + publisher))) {
      reject(rejected, item, "invalid_domain");
      continue;
    }
    if (policy.allowedDomains && !policy.allowedDomains.has(publisher)) {
      reject(rejected, item, "invalid_domain");
      continue;
    }
    const retrieved = Date.parse(item.retrievedAt);
    if (!Number.isFinite(retrieved)) {
      reject(rejected, item, "invalid_timestamp");
      continue;
    }
    if (
      retrieved > policy.now.getTime() + 60_000 ||
      policy.now.getTime() - retrieved > policy.maxAgeMs
    ) {
      reject(rejected, item, "stale");
      continue;
    }
    const quote = normaliseText(item.quote);
    if (!quote) {
      reject(rejected, item, "missing_quote");
      continue;
    }
    const page = policy.pageTextBySource.get(item.sourceId);
    if (!page || !normaliseText(page).includes(quote)) {
      reject(rejected, item, "quote_not_on_page");
      continue;
    }
    publisherBySource.set(item.sourceId, publisher);
    accepted.push(item);
  }

  const official = accepted.filter((item) => item.tier === "official");
  const eligible = official.length ? official : accepted;
  const publisherFor = (item: Evidence<T>) => publisherBySource.get(item.sourceId)!;
  const groups = new Map<string, Evidence<T>[]>();
  for (const item of eligible) {
    const key = canonicalise(item.value);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const domains = [...new Set(eligible.map(publisherFor))].sort();
  if (groups.size > 1) {
    return {
      verdict: "disputed",
      value: null,
      domains,
      evidence: accepted,
      rejected,
      reason: official.length ? "conflicting_official_sources" : "sources_disagree",
    };
  }
  if (groups.size === 0) {
    return {
      verdict: "rejected",
      value: null,
      domains: [],
      evidence: [],
      rejected,
      reason: "no_usable_evidence",
    };
  }
  const [key, group] = [...groups.entries()][0]!;
  const independent = new Set(group.map(publisherFor));
  const minimum = policy.minIndependentDomains ?? 2;
  if (official.length || independent.size >= minimum) {
    return {
      verdict: "verified",
      value: group[0]!.value,
      domains: [...independent].sort(),
      evidence: accepted,
      rejected,
      reason: official.length ? "official_source" : "independent_domain_consensus",
    };
  }
  return {
    verdict: "single_source",
    value: group[0]!.value,
    domains: [...independent].sort(),
    evidence: accepted,
    rejected,
    reason: "insufficient_independent_domains",
  };
}

export interface BookmakerSourcePolicy {
  bookmakerId: string;
  displayName: string;
  domain: string;
  /** Only documented first-party/partner feeds or pages explicitly approved for automated reading. */
  ingestionMode: "official_api" | "affiliate_feed" | "terms_approved_public_page";
  enabled: boolean;
  jurisdiction: string;
  licenceReference: string;
  licenceCheckedAt: string;
  termsReviewedAt: string | null;
  affiliateStatus: "not_partner" | "pending" | "approved" | "live";
}

export interface RawBookmakerPrice {
  bookmakerId: string;
  domain: string;
  fixtureId: string;
  market: string;
  selection: string;
  decimalOdds: number;
  capturedAt: string;
  quote: string;
}

/** A bookmaker is ingestible only after human review of ZA licence evidence and the contractual/terms basis. */
export function isBookmakerSourcePermitted(source: BookmakerSourcePolicy): boolean {
  const licenceCheckedAt = Date.parse(source.licenceCheckedAt);
  const termsReviewedAt =
    source.termsReviewedAt === null ? Number.NaN : Date.parse(source.termsReviewedAt);
  return (
    source.enabled &&
    Boolean(source.bookmakerId.trim()) &&
    Boolean(normaliseEvidenceDomain(source.domain)) &&
    source.jurisdiction.trim().toUpperCase() === "ZA" &&
    Boolean(source.licenceReference.trim()) &&
    Number.isFinite(licenceCheckedAt) &&
    Number.isFinite(termsReviewedAt) &&
    ["official_api", "affiliate_feed", "terms_approved_public_page"].includes(source.ingestionMode)
  );
}

/**
 * Bookmaker prices are not expected to be equal: they are separate offers, not duplicate facts.
 * This validates each price against a configured permitted source and returns per-bookmaker observations.
 * UI/benchmark code must retain bookmaker identity and capture time; affiliateStatus controls branding/links,
 * not whether a source is licensed or whether a price is factually valid.
 */
export function validateBookmakerPrices(
  prices: readonly RawBookmakerPrice[],
  sources: readonly BookmakerSourcePolicy[],
  context: {
    fixtureId: string;
    market: string;
    now: Date;
    maxAgeMs: number;
    pageTextByBookmaker?: ReadonlyMap<string, string>;
  },
): { accepted: RawBookmakerPrice[]; rejected: { price: RawBookmakerPrice; reason: string }[] } {
  const registry = new Map(sources.map((source) => [source.bookmakerId, source]));
  const accepted: RawBookmakerPrice[] = [];
  const rejected: { price: RawBookmakerPrice; reason: string }[] = [];
  const seen = new Set<string>();
  for (const price of prices) {
    const source = registry.get(price.bookmakerId);
    const captured = Date.parse(price.capturedAt);
    const domain = normaliseEvidenceDomain(price.domain);
    let reason = "";
    if (!source || !isBookmakerSourcePermitted(source)) reason = "source_not_permitted";
    else if (domain !== normaliseEvidenceDomain(source.domain)) reason = "domain_mismatch";
    else if (price.fixtureId !== context.fixtureId || price.market !== context.market) {
      reason = "market_fixture_mismatch";
    } else if (
      !Number.isFinite(price.decimalOdds) ||
      price.decimalOdds <= 1 ||
      price.decimalOdds > 1000
    ) {
      reason = "invalid_decimal_odds";
    } else if (
      !Number.isFinite(captured) ||
      captured > context.now.getTime() + 60_000 ||
      context.now.getTime() - captured > context.maxAgeMs
    ) {
      reason = "stale_price";
    } else if (!price.selection.trim() || !price.quote.trim()) {
      reason = "missing_selection_evidence";
    } else if (
      source.ingestionMode === "terms_approved_public_page" &&
      (!context.pageTextByBookmaker?.has(price.bookmakerId) ||
        !normaliseText(context.pageTextByBookmaker.get(price.bookmakerId) ?? "").includes(
          normaliseText(price.quote),
        ))
    ) {
      reason = "quote_not_on_page";
    }
    const key = [price.bookmakerId, price.fixtureId, price.market, price.selection]
      .join("|")
      .toLowerCase();
    if (!reason && seen.has(key)) reason = "duplicate_bookmaker_selection";
    if (reason) rejected.push({ price, reason });
    else {
      seen.add(key);
      accepted.push(price);
    }
  }
  return { accepted, rejected };
}
