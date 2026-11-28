/**
 * Product photos for physical rewards, keyed by the reward code in `public.rewards`.
 * Files live in /public/rewards/merch (1200x1200 JPG). Print-ready artwork is in design/merch/good-sport.
 */
const REWARD_IMAGES: Record<string, string> = {
  "merch-cap": "/rewards/merch/good-sport-cap.jpg",
  "merch-tee": "/rewards/merch/good-sport-tee.jpg",
  "merch-socks": "/rewards/merch/good-sport-socks.jpg",
  "merch-mug": "/rewards/merch/good-sport-mug.jpg",
};

/** The product photo for a reward, or null when the reward has none. */
export function rewardImage(code: string | null | undefined): string | null {
  if (!code) return null;
  return REWARD_IMAGES[code] ?? null;
}
