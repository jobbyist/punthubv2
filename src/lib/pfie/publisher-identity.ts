/** Canonical upstream publisher identity shared by fixture, history and standings verification. */
const ROOTS: Array<[string, readonly string[]]> = [
  ["bbc", ["bbc.com", "bbc.co.uk"]],
  ["efl", ["efl.com"]],
  ["dfb", ["dfb.de"]],
  ["bundesliga", ["bundesliga.com"]],
  ["espn", ["espn.com", "espn.co.uk"]],
  ["sky", ["sky.com", "skysports.com"]],
  ["supersport", ["supersport.com"]],
  ["goal", ["goal.com"]],
  ["uefa", ["uefa.com"]],
  ["fifa", ["fifa.com"]],
  ["premier-league", ["premierleague.com"]],
  ["soccerway", ["soccerway.com"]],
  ["transfermarkt", ["transfermarkt.com"]],
  ["worldfootball", ["worldfootball.net"]],
  ["tactix", ["tactix.football"]],
  ["football-edge-lab", ["footballedgelab.com"]],
  ["caf", ["cafonline.com"]],
  ["psl", ["psl.co.za"]],
  ["reuters", ["reuters.com"]],
  ["ap", ["apnews.com"]],
];

const MULTI_LABEL_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk",
  "com.au", "net.au", "org.au",
  "co.za", "org.za", "net.za",
  "com.ng", "org.ng", "com.gh", "com.ke",
  "com.br", "com.mx", "com.tr", "com.ar",
  "co.in", "firm.in", "net.in", "org.in",
  "com.sg", "com.my", "com.ph", "com.hk",
  "com.tw", "co.jp", "co.kr", "com.cn",
  "com.eg", "org.eg", "com.sa",
]);

function hostname(value: string): string {
  const input = value.trim().toLowerCase();
  try {
    return new URL(input.includes("://") ? input : `https://${input}`)
      .hostname.replace(/^www\./, "").replace(/\.$/, "");
  } catch {
    return input.replace(/^www\./, "").split("/")[0] ?? "";
  }
}

/** Subdomains and regional hostnames belonging to one publisher count as one independent source. */
export function publisherKey(value: string): string {
  const host = hostname(value);
  for (const [publisher, roots] of ROOTS) {
    if (roots.some((root) => host === root || host.endsWith(`.${root}`))) return publisher;
  }
  const labels = host.split(".").filter(Boolean);
  if (labels.length <= 2) return host;
  const suffix = labels.slice(-2).join(".");
  return MULTI_LABEL_SUFFIXES.has(suffix) ? labels.slice(-3).join(".") : suffix;
}
