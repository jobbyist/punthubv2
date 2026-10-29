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
] as const;

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
