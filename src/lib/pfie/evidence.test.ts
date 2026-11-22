import { describe, expect, it } from "vitest";

import {
  isBookmakerSourcePermitted,
  normaliseEvidenceDomain,
  validateBookmakerPrices,
  verifyEvidence,
  type Evidence,
  type EvidencePolicy,
} from "./evidence";

const now = new Date("2026-11-22T12:00:00.000Z");
const item = (domain: string, value: number): Evidence<number> => ({
  sourceId: domain,
  domain,
  tier: "trusted",
  retrievedAt: "2026-11-22T11:55:00.000Z",
  value,
  quote: "Team A 2 Team B 1",
});
const policyFor = (
  items: readonly Evidence<number>[],
  overrides: Partial<EvidencePolicy> = {},
): EvidencePolicy => ({
  now,
  maxAgeMs: 60 * 60_000,
  pageTextBySource: new Map(items.map((entry) => [entry.sourceId, entry.quote])),
  publisherDomainBySource: new Map(items.map((entry) => [entry.sourceId, entry.domain])),
  ...overrides,
});

describe("evidence domain normalization", () => {
  it("normalizes protocol, www, path and whitespace", () => {
    expect(normaliseEvidenceDomain(" HTTPS://WWW.Example.com/table ")).toBe("example.com");
  });

  it("rejects malformed hostnames", () => {
    expect(normaliseEvidenceDomain("not a hostname")).toBe("");
    expect(normaliseEvidenceDomain("https://")).toBe("");
  });
});

describe("verifyEvidence", () => {
  it("requires independent publisher domains, not multiple pages from one publisher", () => {
    const items = [item("one.example", 2), item("one.example", 2)];
    const result = verifyEvidence(items, policyFor(items));
    expect(result.verdict).toBe("single_source");
  });

  it("does not count two subdomains of one publisher as independent", () => {
    const items = [item("news.example.com", 2), item("scores.example.com", 2)];
    const publisherDomainBySource = new Map([
      ["news.example.com", "example.com"],
      ["scores.example.com", "example.com"],
    ]);
    const result = verifyEvidence(items, policyFor(items, { publisherDomainBySource }));
    expect(result).toMatchObject({ verdict: "single_source", domains: ["example.com"] });
  });

  it("treats the www and apex host as the same publisher", () => {
    const items = [item("www.example.com", 2), item("example.com", 2)];
    const publisherDomainBySource = new Map([
      ["www.example.com", "example.com"],
      ["example.com", "example.com"],
    ]);
    const result = verifyEvidence(items, policyFor(items, { publisherDomainBySource }));
    expect(result).toMatchObject({ verdict: "single_source", domains: ["example.com"] });
  });

  it("rejects a host that does not belong to its curated publisher identity", () => {
    const entry = item("notexample.com", 2);
    const result = verifyEvidence(
      [entry],
      policyFor([entry], {
        publisherDomainBySource: new Map([[entry.sourceId, "example.com"]]),
      }),
    );
    expect(result.verdict).toBe("rejected");
    expect(result.rejected[0]?.reason).toBe("invalid_domain");
  });

  it("requires captured page text and rejects quotes that cannot be checked", () => {
    const items = [item("one.example", 2), item("two.example", 2)];
    const result = verifyEvidence(items, policyFor(items, { pageTextBySource: new Map() }));
    expect(result.verdict).toBe("rejected");
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected[0]?.reason).toBe("quote_not_on_page");
  });

  it("normalizes whitespace when checking the exact source quote", () => {
    const entry = item("one.example", 2);
    const result = verifyEvidence(
      [entry],
      policyFor([entry], { pageTextBySource: new Map([[entry.sourceId, "Team A\n2 Team B 1"]]) }),
    );
    expect(result.verdict).toBe("single_source");
  });

  it("verifies exact agreement across independent publishers", () => {
    const items = [item("one.example", 2), item("two.example", 2)];
    const result = verifyEvidence(items, policyFor(items));
    expect(result).toMatchObject({
      verdict: "verified",
      value: 2,
      domains: ["one.example", "two.example"],
    });
  });

  it("does not let a majority override a conflicting official source", () => {
    const items = [
      { ...item("official.example", 1), tier: "official" as const },
      item("one.example", 2),
      item("two.example", 2),
    ];
    const result = verifyEvidence(items, policyFor(items));
    expect(result).toMatchObject({ verdict: "verified", value: 1, reason: "official_source" });
  });

  it("marks conflicting official sources as disputed", () => {
    const items = [
      { ...item("official-one.example", 1), tier: "official" as const },
      { ...item("official-two.example", 2), tier: "official" as const },
    ];
    const result = verifyEvidence(items, policyFor(items));
    expect(result.verdict).toBe("disputed");
  });

  it("rejects stale evidence", () => {
    const entry = { ...item("one.example", 2), retrievedAt: "2026-11-21T00:00:00.000Z" };
    const result = verifyEvidence([entry], policyFor([entry]));
    expect(result.verdict).toBe("rejected");
    expect(result.rejected[0]?.reason).toBe("stale");
  });
});

describe("bookmaker source policy", () => {
  const source = {
    bookmakerId: "book-a",
    displayName: "Book A",
    domain: "book-a.co.za",
    ingestionMode: "affiliate_feed" as const,
    enabled: true,
    jurisdiction: "ZA",
    licenceReference: "ZA-LIC-12345",
    licenceCheckedAt: "2026-11-19T00:00:00.000Z",
    termsReviewedAt: "2026-11-20T00:00:00.000Z",
    affiliateStatus: "approved" as const,
  };

  it("requires ZA licence evidence and a recorded terms review before ingesting a source", () => {
    expect(isBookmakerSourcePermitted(source)).toBe(true);
    expect(isBookmakerSourcePermitted({ ...source, termsReviewedAt: null })).toBe(false);
    expect(isBookmakerSourcePermitted({ ...source, jurisdiction: "" })).toBe(false);
    expect(isBookmakerSourcePermitted({ ...source, jurisdiction: "GB" })).toBe(false);
    expect(isBookmakerSourcePermitted({ ...source, licenceReference: "  " })).toBe(false);
    expect(isBookmakerSourcePermitted({ ...source, licenceCheckedAt: "not-a-date" })).toBe(false);
  });

  it("validates price freshness, market identity and source-domain matching", () => {
    const result = validateBookmakerPrices(
      [
        {
          bookmakerId: "book-a",
          domain: "book-a.co.za",
          fixtureId: "fixture-1",
          market: "1x2",
          selection: "home",
          decimalOdds: 2.1,
          capturedAt: "2026-11-22T11:58:00.000Z",
          quote: "Team A to win 2.10",
        },
        {
          bookmakerId: "book-a",
          domain: "spoofed.co.za",
          fixtureId: "fixture-1",
          market: "1x2",
          selection: "draw",
          decimalOdds: 3.2,
          capturedAt: "2026-11-22T11:58:00.000Z",
          quote: "Draw 3.20",
        },
      ],
      [source],
      { fixtureId: "fixture-1", market: "1x2", now, maxAgeMs: 15 * 60_000 },
    );
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected[0]?.reason).toBe("domain_mismatch");
  });

  it("requires captured page text for terms-approved public-page prices", () => {
    const publicPageSource = { ...source, ingestionMode: "terms_approved_public_page" as const };
    const price = {
      bookmakerId: "book-a",
      domain: "book-a.co.za",
      fixtureId: "fixture-1",
      market: "1x2",
      selection: "home",
      decimalOdds: 2.1,
      capturedAt: "2026-11-22T11:58:00.000Z",
      quote: "Team A to win 2.10",
    };
    const result = validateBookmakerPrices([price], [publicPageSource], {
      fixtureId: "fixture-1",
      market: "1x2",
      now,
      maxAgeMs: 15 * 60_000,
    });
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0]?.reason).toBe("quote_not_on_page");
  });
});
