/**
 * PAYG and Puntr Pro unit economics (14 Nov 2026). Pure functions: every rate is an input so the owner can change
 * one number and re-run `economics.test.ts`, which fails if any pack or the Pro fee falls under its margin floor.
 *
 * Sources and assumptions are in docs/PAYG_ECONOMICS.md. Nothing here is shown to members.
 */

/** Rand per US dollar. ASSUMPTION: update before launch from the day's rate; the tests include a stress rate. */
export const USD_ZAR = 18.5;
/** The test suite also has to hold at this weaker rand. */
export const USD_ZAR_STRESS = 22;

/** Paid Gemini API list prices, USD per 1M tokens (ai.google.dev, 14 Nov 2026). */
export const MODEL_PRICES = {
  /** Primary model once the project is on the paid tier. */
  "gemini-3.8-flash": { in: 0.375, out: 1.875 },
  /** Dearest model on the router allow-list: the worst case if every call falls back to it. */
  "gemini-3.5-flash": { in: 1.5, out: 9 },
} as const;
export type PricedModel = keyof typeof MODEL_PRICES;

/** Typical and capped token use per AI action. Output is capped in code (maxOutputTokens), so these are ceilings. */
export const FEATURES = {
  preview: { credits: 5, tokensIn: 8_000, tokensOut: 1_500, ai: true },
  slip: { credits: 3, tokensIn: 2_500, tokensOut: 2_048, ai: true },
  insight: { credits: 2, tokensIn: 6_000, tokensOut: 1_200, ai: true },
  stats: { credits: 2, tokensIn: 0, tokensOut: 0, ai: false },
} as const;
export type FeatureKey = keyof typeof FEATURES;

/** PayFast (payfast.io/fees, ex VAT). Card 3.2% + R2.00. Instant EFT 2% (min R2.00). Payout R8.70 per withdrawal. */
export const PAYFAST = {
  card: { pct: 0.032, fixed: 2 },
  eft: { pct: 0.02, fixed: 0, min: 2 },
  payoutFee: 8.7,
  vat: 0.15,
} as const;

/** Credit packs as shown on /pricing: [name, price in rand, credits]. Keep equal to PACKS in src/routes/pricing.tsx. */
export const PACKS = [
  { name: "starter", price: 25, credits: 25 },
  { name: "matchday", price: 60, credits: 65 },
  { name: "season", price: 120, credits: 140 },
] as const;

export const PRO_MONTHLY_PRICE = 99;

export function aiCostRand(feature: FeatureKey, model: PricedModel, fx = USD_ZAR): number {
  const f = FEATURES[feature];
  if (!f.ai) return 0;
  const p = MODEL_PRICES[model];
  return ((f.tokensIn * p.in + f.tokensOut * p.out) / 1_000_000) * fx;
}

/** Rand of AI cost per credit spent on this feature. */
export function aiCostPerCredit(feature: FeatureKey, model: PricedModel, fx = USD_ZAR): number {
  return aiCostRand(feature, model, fx) / FEATURES[feature].credits;
}

/** Dearest AI cost per credit across features: the credit is priced against this, never the average. */
export function worstAiCostPerCredit(model: PricedModel, fx = USD_ZAR): number {
  return Math.max(
    ...(Object.keys(FEATURES) as FeatureKey[]).map((k) => aiCostPerCredit(k, model, fx)),
  );
}

/** PayFast fee on a payment, ex VAT, then VAT on the fee (a non-VAT-registered seller cannot reclaim it). */
export function payfastFee(price: number, method: "card" | "eft", withVat = true): number {
  const exVat =
    method === "card"
      ? price * PAYFAST.card.pct + PAYFAST.card.fixed
      : Math.max(price * PAYFAST.eft.pct, PAYFAST.eft.min);
  return withVat ? exVat * (1 + PAYFAST.vat) : exVat;
}

export interface PackEconomics {
  name: string;
  price: number;
  credits: number;
  perCredit: number;
  fee: number;
  /** Payout fee share, assuming one withdrawal per `paymentsPerPayout` payments. */
  payoutShare: number;
  /** Cost if every credit is spent on the dearest feature at the given model. */
  aiCost: number;
  net: number;
  margin: number;
}

export function packEconomics(
  pack: { name: string; price: number; credits: number },
  opts: {
    method?: "card" | "eft";
    model?: PricedModel;
    fx?: number;
    paymentsPerPayout?: number;
  } = {},
): PackEconomics {
  const {
    method = "card",
    model = "gemini-3.5-flash",
    fx = USD_ZAR,
    paymentsPerPayout = 20,
  } = opts;
  const fee = payfastFee(pack.price, method);
  const payoutShare = (PAYFAST.payoutFee * (1 + PAYFAST.vat)) / paymentsPerPayout;
  const aiCost = worstAiCostPerCredit(model, fx) * pack.credits;
  const net = pack.price - fee - payoutShare - aiCost;
  return {
    name: pack.name,
    price: pack.price,
    credits: pack.credits,
    perCredit: pack.price / pack.credits,
    fee,
    payoutShare,
    aiCost,
    net,
    margin: net / pack.price,
  };
}

/** Smallest price that keeps `minMargin` on a pack of `credits`, card payments, worst-case AI. */
export function minPackPrice(
  credits: number,
  minMargin: number,
  model: PricedModel = "gemini-3.5-flash",
  fx = USD_ZAR,
) {
  const ai = worstAiCostPerCredit(model, fx) * credits;
  const payout = (PAYFAST.payoutFee * (1 + PAYFAST.vat)) / 20;
  const fixed = PAYFAST.card.fixed * (1 + PAYFAST.vat) + payout + ai;
  const pct = PAYFAST.card.pct * (1 + PAYFAST.vat);
  return fixed / (1 - pct - minMargin);
}

export interface ProEconomics {
  price: number;
  fee: number;
  netOfFee: number;
  /** AI actions a Pro member may run per month before the fair-use stop. */
  cap: number;
  worstAiCost: number;
  expectedAiCost: number;
  worstMargin: number;
  expectedMargin: number;
}

/** Pro is unlimited in the UI but fair-use capped server-side. Worst case = every action is a preview on the dearest model. */
export function proEconomics(cap: number, fx = USD_ZAR): ProEconomics {
  const fee = payfastFee(PRO_MONTHLY_PRICE, "card");
  const netOfFee = PRO_MONTHLY_PRICE - fee;
  const worst = aiCostRand("preview", "gemini-3.5-flash", fx) * cap;
  const expected = aiCostRand("preview", "gemini-3.8-flash", fx) * cap;
  return {
    price: PRO_MONTHLY_PRICE,
    fee,
    netOfFee,
    cap,
    worstAiCost: worst,
    expectedAiCost: expected,
    worstMargin: (netOfFee - worst) / PRO_MONTHLY_PRICE,
    expectedMargin: (netOfFee - expected) / PRO_MONTHLY_PRICE,
  };
}

/** Largest fair-use cap that keeps worst-case AI cost at or under `share` of the Pro payment net of fees. */
export function maxProCap(share: number, fx = USD_ZAR): number {
  const net = PRO_MONTHLY_PRICE - payfastFee(PRO_MONTHLY_PRICE, "card");
  return Math.floor((net * share) / aiCostRand("preview", "gemini-3.5-flash", fx));
}

/** Recommended server-side limits (to be enforced in spend_credits / the AI routes when payments go live). */
export const PRO_FAIR_USE = { monthlyAiActions: 90, dailyAiActions: 15 } as const;
