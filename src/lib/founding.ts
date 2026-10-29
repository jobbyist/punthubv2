import { FOUNDING_CAP } from "@/lib/flags";

export interface FoundingSpots {
  cap: number;
  taken: number;
  left: number;
}

/** Spots left out of the cap. Never negative, even if the count momentarily exceeds the cap. */
export function foundingSpots(taken: number, cap: number = FOUNDING_CAP): FoundingSpots {
  const t = Math.max(0, Math.floor(taken));
  return { cap, taken: t, left: Math.max(0, cap - t) };
}
