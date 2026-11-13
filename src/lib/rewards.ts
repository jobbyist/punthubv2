/** PuntPoints and rewards helpers. Pure, so they can be tested without a database. */
export type RewardKind = "perk" | "sponsored" | "retail_voucher" | "betting_voucher";

export const REWARD_KINDS: readonly RewardKind[] = [
  "perk",
  "sponsored",
  "retail_voucher",
  "betting_voucher",
];

const REDEEM_ERRORS = [
  "not_authenticated",
  "rewards_disabled",
  "reward_not_found",
  "not_eligible",
  "daily_limit",
  "insufficient_points",
  "out_of_stock",
  "identity_not_verified",
  "not_yet_available",
] as const;

export const REWARD_CATEGORIES = [
  "ott_voucher",
  "credit_pack",
  "pro_pass",
  "puntr_merch",
  "sports_merch",
  "match_tickets",
] as const;
export type RewardCategory = (typeof REWARD_CATEGORIES)[number];

/** Groups catalogue rows by category in the fixed display order; unknown categories are dropped. */
export function groupByCategory<T extends { category: string | null }>(
  rows: T[],
): { category: RewardCategory; items: T[] }[] {
  return REWARD_CATEGORIES.map((category) => ({
    category,
    items: rows.filter((r) => r.category === category),
  })).filter((g) => g.items.length > 0);
}

/** Maps a redeem_reward error to a translation key suffix. */
export function redeemErrorKey(error: { message?: string } | null | undefined): string {
  const message = error?.message ?? "";
  return (REDEEM_ERRORS as readonly string[]).includes(message) ? message : "generic";
}

export type Affordability = { ok: true } | { ok: false; short: number };

export function affordability(balance: number, cost: number): Affordability {
  return balance >= cost ? { ok: true } : { ok: false, short: cost - balance };
}

/** A betting voucher is a gambling promotion: it always carries the Ad, 18+ and helpline labels. */
export function needsGamblingLabels(kind: string): boolean {
  return kind === "betting_voucher";
}

/** How an earning rule is limited, as parts a translation can use. */
export function ruleLimit(rule: {
  cap_per_day: number | null;
  cap_per_month: number | null;
}): { kind: "day" | "month"; count: number } | null {
  if (rule.cap_per_day) return { kind: "day", count: rule.cap_per_day };
  if (rule.cap_per_month) return { kind: "month", count: rule.cap_per_month };
  return null;
}
