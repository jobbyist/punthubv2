/**
 * PayFast helpers (server only). Signing, ITN verification and the credit packs a member can buy.
 * The merchant key and passphrase come from the environment and never reach the browser.
 */
import { createHash } from "node:crypto";

import { PACKS } from "@/lib/economics";

export const PACK_NAMES = PACKS.map((p) => p.name) as readonly string[];
export type PackName = (typeof PACKS)[number]["name"];

export function findPack(name: unknown) {
  return PACKS.find((p) => p.name === name) ?? null;
}

export interface PayfastConfig {
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  sandbox: boolean;
}

export function payfastConfig(
  env: Record<string, string | undefined> = process.env,
): PayfastConfig | null {
  const merchantId = env["PAYFAST_MERCHANT_ID"];
  const merchantKey = env["PAYFAST_MERCHANT_KEY"];
  const passphrase = env["PAYFAST_PASSPHRASE"];
  if (!merchantId || !merchantKey || !passphrase) return null;
  return { merchantId, merchantKey, passphrase, sandbox: env["PAYFAST_SANDBOX"] === "true" };
}

export const payfastHost = (sandbox: boolean) =>
  sandbox ? "sandbox.payfast.co.za" : "www.payfast.co.za";

/** PHP urlencode: spaces as +, uppercase hex, and the characters encodeURIComponent leaves alone. */
export function pfEncode(v: string): string {
  return encodeURIComponent(v)
    .replace(/%20/g, "+")
    .replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

/** Signature: the fields in the order given, urlencoded, passphrase appended, md5. Empty values are left out. */
export function pfSignature(fields: [string, string][], passphrase: string): string {
  const parts = fields
    .filter(([k, v]) => k !== "signature" && v !== "")
    .map(([k, v]) => `${k}=${pfEncode(v.trim())}`);
  if (passphrase) parts.push(`passphrase=${pfEncode(passphrase.trim())}`);
  return createHash("md5").update(parts.join("&")).digest("hex");
}

export const centsToAmount = (cents: number) => (cents / 100).toFixed(2);

export interface CheckoutInput {
  orderId: string;
  pack: { name: string; price: number; credits: number };
  siteUrl: string;
}

/** Fields for the hosted checkout form, signed. No personal information is sent: only the order and the amount. */
export function buildCheckout(cfg: PayfastConfig, input: CheckoutInput) {
  const base = input.siteUrl.replace(/\/$/, "");
  const fields: [string, string][] = [
    ["merchant_id", cfg.merchantId],
    ["merchant_key", cfg.merchantKey],
    ["return_url", `${base}/wallet?payment=success`],
    ["cancel_url", `${base}/wallet?payment=cancelled`],
    ["notify_url", `${base}/api/payfast/itn`],
    ["m_payment_id", input.orderId],
    ["amount", centsToAmount(Math.round(input.pack.price * 100))],
    ["item_name", `Puntr credits: ${input.pack.credits}`],
  ];
  const signature = pfSignature(fields, cfg.passphrase);
  return {
    action: `https://${payfastHost(cfg.sandbox)}/eng/process`,
    fields: [...fields, ["signature", signature]] as [string, string][],
  };
}

/** PayFast's published ITN source ranges (IPv4). */
const RANGES: [string, number][] = [
  ["197.97.145.144", 28],
  ["41.74.179.192", 27],
  ["102.216.36.0", 28],
  ["102.216.36.128", 28],
  ["144.126.193.139", 32],
];
const ipNum = (ip: string) => ip.split(".").reduce((n, p) => n * 256 + Number(p), 0);
export function isPayfastIp(ip: string | null | undefined): boolean {
  if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
  const n = ipNum(ip);
  return RANGES.some(([base, bits]) => {
    const size = 2 ** (32 - bits);
    const start = Math.floor(ipNum(base) / size) * size;
    return n >= start && n < start + size;
  });
}

export interface ItnResult {
  ok: boolean;
  reason?: string;
  orderId?: string;
  pfPaymentId?: string;
  amountCents?: number;
  status?: string;
}

/** Local checks on an ITN body (signature, merchant, status, amount). The server postback is done by the route. */
export function checkItn(body: string, cfg: PayfastConfig): ItnResult {
  const fields = [...new URLSearchParams(body).entries()];
  const get = (k: string) => fields.find(([key]) => key === k)?.[1] ?? "";
  const sig = get("signature");
  if (!sig || pfSignature(fields, cfg.passphrase) !== sig.toLowerCase())
    return { ok: false, reason: "bad_signature" };
  if (get("merchant_id") !== cfg.merchantId) return { ok: false, reason: "wrong_merchant" };
  const gross = Number(get("amount_gross"));
  if (!Number.isFinite(gross) || gross <= 0) return { ok: false, reason: "bad_amount" };
  return {
    ok: true,
    orderId: get("m_payment_id"),
    pfPaymentId: get("pf_payment_id"),
    amountCents: Math.round(gross * 100),
    status: get("payment_status"),
  };
}

export const payfastValidateUrl = (sandbox: boolean) =>
  `https://${payfastHost(sandbox)}/eng/query/validate`;
