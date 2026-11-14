import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { PACKS } from "./economics";
import {
  buildCheckout,
  checkItn,
  centsToAmount,
  isPayfastIp,
  payfastConfig,
  pfEncode,
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
});
