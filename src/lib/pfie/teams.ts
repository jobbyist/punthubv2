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
  "manchester utd": "manchester united",
  "man united": "manchester united",
  spurs: "tottenham hotspur",
  tottenham: "tottenham hotspur",
  wolves: "wolverhampton wanderers",
  "nottm forest": "nottingham forest",
  "nott m forest": "nottingham forest",
  newcastle: "newcastle united",
  "west ham": "west ham united",
  qpr: "queens park rangers",
  "sheffield utd": "sheffield united",
  "sheffield wed": "sheffield wednesday",
  birmingham: "birmingham city",
  "west brom": "west bromwich albion",
  "west bromwich": "west bromwich albion",
  blackburn: "blackburn rovers",
  swansea: "swansea city",
  stoke: "stoke city",
  norwich: "norwich city",
  bolton: "bolton wanderers",
  derby: "derby county",
  preston: "preston north end",
  cardiff: "cardiff city",
  brighton: "brighton and hove albion",
  psg: "paris saint germain",
  "paris sg": "paris saint germain",
  bayern: "bayern munich",
  "bayern munchen": "bayern munich",
  "bayer 04 leverkusen": "bayer leverkusen",
  "stade rennais": "rennes",
  lille: "lille osc",
  losc: "lille osc",
  "olympique lyonnais": "olympique lyon",
  leverkusen: "bayer leverkusen",
  linz: "lask",
  "lask linz": "lask",
  psv: "psv eindhoven",
  "slavia praha": "slavia prague",
  "slovan bratisl": "slovan bratislava",
  inter: "inter milan",
  internazionale: "inter milan",
  atletico: "atletico madrid",
  "atletico de madrid": "atletico madrid",
  barca: "barcelona",
  "deportivo alaves": "alaves",
  // UEFA Conference League participant labels reconciled from the existing fixture corpus.
  hearts: "heart of midlothian",
  agf: "aarhus",
  "agf aarhus": "aarhus",
  kopenhagen: "copenhagen",
  "zska sofia": "cska sofia",
  paphos: "pafos",
  "st truiden": "sint truidense",
  "sint truiden": "sint truidense",
  "sint truidense vv": "sint truidense",
  "l red imps": "lincoln red imps",
  "univ craiova": "universitatea craiova",
  "cs universitatea craiova": "universitatea craiova",
  "inter club d escaldes": "inter escaldes",
  "roter stern belgrad": "crvena zvezda",
  "fc iberia 1999 tiflis": "iberia tbilisi",
  "iberia 1999 tiflis": "iberia tbilisi",
  kairat: "kairat almaty",
  "vv sint truiden": "sint truidense",
  "fk kairat": "kairat almaty",
  "iberia 1999": "iberia tbilisi",
  "borac banja luka": "borac",

  // LaLiga publishers abbreviate these clubs differently; signatures must resolve to one canonical identity.
  athletic: "athletic bilbao",
  "espanyol barcelona": "espanyol",
  "rcd espanyol de barcelona": "espanyol",
  "espanyol de barcelona": "espanyol",
  "rc deportivo": "deportivo la coruna",
  "r racing club": "racing santander",
  "r racing": "racing santander",
  celta: "celta vigo",
  "ca osasuna": "osasuna",
  "levante ud": "levante",
  depor: "deportivo la coruna",
  sundowns: "mamelodi sundowns",
  pirates: "orlando pirates",
  chiefs: "kaizer chiefs",
  arrows: "golden arrows",
  "lamontville golden arrows": "golden arrows",
  gallants: "marumo gallants",
  usuthu: "amazulu",
};

export function normaliseTeam(name: string): string {
  // Some publisher tables prefix clubs with a three-letter code (e.g. RAC R. Racing Club or ATM Atlético de Madrid).
  // Strip an uppercase code before canonicalizing so those rows match publishers that omit the code.
  const trimmed = name.trim();
  // RC is part of the official club name in "RC Deportivo", not a publisher table code.
  const withoutCode = trimmed === "RC Deportivo" ? trimmed : trimmed.replace(/^[A-Z]{2,4}\s+/, "");
  const rawBase = withoutCode
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
  // "Paris FC" is a distinct Ligue 1 club. Dropping the FC suffix collapses it to the ambiguous name "Paris"
  // and can collide with Paris Saint-Germain in publisher result tables.
  if (rawBase === "paris fc" || rawBase === "paris football club") return "paris fc";
  const base = rawBase
    .split(/\s+/)
    .filter((t) => t && !DROP_TOKENS.has(t))
    .join(" ");
  return ALIASES[base] ?? base;
}

export function teamSlug(name: string): string {
  return normaliseTeam(name).replace(/ /g, "-");
}

/** Generic one-word labels are not safe to introduce as new canonical teams. */
export function isGenericTeamName(name: string): boolean {
  const value = normaliseTeam(name);
  return !value || GENERIC.has(value);
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
  const rawName = name.trim().toLocaleLowerCase();
  const exactRaw = known.find((team) => team.trim().toLocaleLowerCase() === rawName);
  if (exactRaw) return exactRaw;

  const n = normaliseTeam(name);
  if (!n || GENERIC.has(n)) return null;
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
  "paris",
]);
