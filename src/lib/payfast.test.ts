import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { PACKS } from "./economics";
import {
  buildCheckout,
  buildSubscriptionCheckout,
  cancelPayfastSubscription,
  checkItn,
  centsToAmount,
  isPayfastIp,
  payfastConfig,
  pfEncode,
  pfApiSignature,
  pfSignature,
} from "./payfast.server";

const cfg = { merchantId: "10000100", merchantKey: "k", passphrase: "pass phrase", sandbox: true };

describe("payfast", () => {
  it("encodes like PHP urlencode", () => {
    expect(pfEncode("a b&c/d~e!")).toBe("a+b%26c%2Fd%7Ee%21");
  });

  it("signs fields in order with the passphrase and skips empties", () => {
    const sig = pfSignature(
      [
        ["merchant_id", "10000100"],
        ["amount", "25.00"],
        ["empty", ""],
      ],
      "pass phrase",
    );
    expect(sig).toBe(
      createHash("md5")
        .update("merchant_id=10000100&amount=25.00&passphrase=pass+phrase")
        .digest("hex"),
    );
  });

  it("builds a signed checkout with no personal data", () => {
    const c = buildCheckout(cfg, {
      orderId: "o-1",
      pack: PACKS[0],
      siteUrl: "https://puntr.co.za/",
    });
    const keys = c.fields.map(([k]) => k);
    expect(keys).not.toContain("name_first");
    expect(keys).not.toContain("email_address");
    expect(c.action).toBe("https://sandbox.payfast.co.za/eng/process");
    const amount = c.fields.find(([k]) => k === "amount")?.[1];
    expect(amount).toBe("25.00");
    const sig = c.fields.find(([k]) => k === "signature")?.[1];
    const signed = c.fields.filter(([k]) => k !== "signature");
    expect(pfSignature(signed, cfg.passphrase)).toBe(sig);
  });

  it("accepts a valid ITN and rejects a tampered one", () => {
    const fields: [string, string][] = [
      ["m_payment_id", "o-1"],
      ["pf_payment_id", "123"],
      ["payment_status", "COMPLETE"],
      ["amount_gross", "25.00"],
      ["merchant_id", cfg.merchantId],
    ];
    const body = new URLSearchParams([
      ...fields,
      ["signature", pfSignature(fields, cfg.passphrase)],
    ]).toString();
    const ok = checkItn(body, cfg);
    expect(ok).toMatchObject({
      ok: true,
      orderId: "o-1",
      pfPaymentId: "123",
      amountCents: 2500,
      status: "COMPLETE",
    });
    expect(checkItn(body.replace("25.00", "1.00"), cfg).ok).toBe(false);
    expect(checkItn(body, { ...cfg, merchantId: "999" }).ok).toBe(false);
    expect(checkItn(body, { ...cfg, passphrase: "other" }).ok).toBe(false);
  });

  it("rejects a signed ITN with no order or PayFast payment id", () => {
    const fields: [string, string][] = [
      ["m_payment_id", "o-1"],
      ["pf_payment_id", ""],
      ["payment_status", "COMPLETE"],
      ["amount_gross", "25.00"],
      ["merchant_id", cfg.merchantId],
    ];
    const body = new URLSearchParams([
      ...fields,
      ["signature", pfSignature(fields, cfg.passphrase)],
    ]).toString();
    expect(checkItn(body, cfg)).toMatchObject({ ok: false, reason: "missing_ids" });
  });

  it("only trusts PayFast source addresses", () => {
    expect(isPayfastIp("197.97.145.150")).toBe(true);
    expect(isPayfastIp("41.74.179.200")).toBe(true);
    expect(isPayfastIp("102.216.36.5")).toBe(true);
    expect(isPayfastIp("8.8.8.8")).toBe(false);
    expect(isPayfastIp("197.97.145.160")).toBe(false);
    expect(isPayfastIp(null)).toBe(false);
  });

  it("reads config from the environment and refuses a partial one", () => {
    expect(payfastConfig({ PAYFAST_MERCHANT_ID: "1" })).toBeNull();
    expect(
      payfastConfig({
        PAYFAST_MERCHANT_ID: "1",
        PAYFAST_MERCHANT_KEY: "k",
        PAYFAST_PASSPHRASE: "p",
      }),
    ).toEqual({ merchantId: "1", merchantKey: "k", passphrase: "p", sandbox: false });
    expect(centsToAmount(6000)).toBe("60.00");
  });

  it("builds a signed monthly Pro subscription with no personal data", () => {
    const c = buildSubscriptionCheckout(cfg, {
      subscriptionId: "s-1",
      amountCents: 9900,
      siteUrl: "https://puntr.co.za/",
      billingDate: "2026-12-01",
    });
    const m = new Map(c.fields);
    expect(m.get("subscription_type")).toBe("1");
    expect(m.get("frequency")).toBe("3");
    expect(m.get("cycles")).toBe("0");
    expect(m.get("recurring_amount")).toBe("99.00");
    expect(m.get("amount")).toBe("99.00");
    expect(m.get("custom_str1")).toBe("pro");
    expect([...m.keys()].some((k) => /email|name_first|name_last|cell/.test(k))).toBe(false);
    const unsigned = c.fields.filter(([k]) => k !== "signature");
    expect(m.get("signature")).toBe(pfSignature(unsigned, cfg.passphrase));
  });

  it("signs API calls with sorted keys and the passphrase", () => {
    const expected = createHash("md5")
      .update(
        "merchant-id=10000100&passphrase=pass+phrase&timestamp=2026-12-01T10%3A00%3A00&version=v1",
      )
      .digest("hex");
    expect(
      pfApiSignature(
        { version: "v1", "merchant-id": "10000100", timestamp: "2026-12-01T10:00:00" },
        cfg.passphrase,
      ),
    ).toBe(expected);
  });

  it("cancels at PayFast with signed headers", async () => {
    const calls: [string, RequestInit][] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push([url, init]);
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    const ok = await cancelPayfastSubscription(
      cfg,
      "tok-1",
      fetcher,
      new Date("2026-12-01T10:00:00Z"),
    );
    expect(ok).toBe(true);
    expect(calls[0]![0]).toBe("https://api.payfast.co.za/subscriptions/tok-1/cancel?testing=true");
    expect((calls[0]![1].headers as Record<string, string>)["signature"]).toMatch(/^[a-f0-9]{32}$/);
  });

  it("reads the Pro marker and token from an ITN", () => {
    const fields: [string, string][] = [
      ["m_payment_id", "s-1"],
      ["pf_payment_id", "777"],
      ["payment_status", "COMPLETE"],
      ["amount_gross", "99.00"],
      ["custom_str1", "pro"],
      ["token", "tok-1"],
      ["merchant_id", cfg.merchantId],
    ];
    const body = new URLSearchParams([
      ...fields,
      ["signature", pfSignature(fields, cfg.passphrase)],
    ]).toString();
    expect(checkItn(body, cfg)).toMatchObject({
      ok: true,
      kind: "pro",
      token: "tok-1",
      amountCents: 9900,
    });
  });
});
