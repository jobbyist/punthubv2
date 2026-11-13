/**
 * Team names across sources. "Man City", "Manchester City FC" and "Manchester City" are one club; "Milan" alone
 * could be two. Names are compared after normalising, and a short name is accepted only when it points at exactly
 * one known team in the same competition. Anything ambiguous is rejected, never guessed.
 */

const DROP_TOKENS = new Set(["fc", "afc", "cf", "sc", "ac", "the", "club", "football"]);

/** Common short forms, applied to the normalised name. Left side must already be normalised. */
const ALIASES: Record<string, string> = {
  "man city": "manchester city",
  "man utd": "manchester united",
  "man united": "manchester united",
  spurs: "tottenham hotspur",
  tottenham: "tottenham hotspur",
  wolves: "wolverhampton wanderers",
  "nottm forest": "nottingham forest",
  "nott m forest": "nottingham forest",
  newcastle: "newcastle united",
  "west ham": "west ham united",
  brighton: "brighton and hove albion",
  psg: "paris saint germain",
  "paris sg": "paris saint germain",
  bayern: "bayern munich",
  "bayern munchen": "bayern munich",
  inter: "inter milan",
  internazionale: "inter milan",
  atletico: "atletico madrid",
  barca: "barcelona",
  sundowns: "mamelodi sundowns",
  pirates: "orlando pirates",
  chiefs: "kaizer chiefs",
  arrows: "golden arrows",
  "lamontville golden arrows": "golden arrows",
  gallants: "marumo gallants",
  usuthu: "amazulu",
};

export function normaliseTeam(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && !DROP_TOKENS.has(t))
    .join(" ");
  return ALIASES[base] ?? base;
}

export function teamSlug(name: string): string {
  return normaliseTeam(name).replace(/ /g, "-");
}

function isSubset(small: string[], large: Set<string>): boolean {
  return small.every((t) => large.has(t));
}

/**
 * Finds which known team a name refers to. Exact match after normalising wins. Otherwise a name whose words are all
 * contained in exactly one known team (or the reverse) matches that team. Returns "ambiguous" when two or more
 * teams fit, and null when none does.
 */
export function resolveTeam(name: string, known: readonly string[]): string | "ambiguous" | null {
  const n = normaliseTeam(name);
  if (!n) return null;
  const exact = known.find((k) => normaliseTeam(k) === n);
  if (exact) return exact;
  const tokens = n.split(" ");
  const matches = known.filter((k) => {
    const kt = normaliseTeam(k).split(" ");
    const [small, large] = tokens.length <= kt.length ? [tokens, kt] : [kt, tokens];
    // A one-word match must be a real word, not "city" or "united".
    if (small.length === 1 && (small[0]!.length < 4 || GENERIC.has(small[0]!))) return false;
    return isSubset(small, new Set(large));
  });
  if (matches.length === 1) return matches[0]!;
  return matches.length > 1 ? "ambiguous" : null;
}

const GENERIC = new Set([
  "city",
  "united",
  "town",
  "rovers",
  "athletic",
  "real",
  "sporting",
  "wanderers",
  "stars",
]);
