/**
 * Branded newsroom cover (1200 x 630), drawn as SVG in the same layout as the hand-made covers in
 * public/newsroom: dark panel, green slanted band, white Puntr logo, green category label, title, standfirst, date
 * badge and the responsible-gambling line. Pure function: the route embeds the fonts and logo as data URIs, so the
 * file renders the same everywhere an <img> can show it.
 */

export interface CoverInput {
  title: string;
  category: string;
  excerpt: string;
  date: string;
}

export interface CoverAssets {
  logo: string;
  montserrat800: string;
  inter400: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Greedy word wrap by an average glyph width. Long single words are cut, never overflow. */
export function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const w = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word;
    const next = line ? `${line} ${w}` : w;
    if (next.length <= maxChars) line = next;
    else {
      lines.push(line);
      line = w;
    }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    const last = lines[maxLines - 1] ?? "";
    lines[maxLines - 1] =
      last.length > maxChars - 1 ? `${last.slice(0, maxChars - 1)}…` : `${last}…`;
  }
  return lines;
}

export const CATEGORY_LABELS: Record<string, string> = {
  company: "Company updates",
  product: "Product development",
  pfie: "PFIE and technology",
  features: "Features and improvements",
  community: "Community",
  launch: "Launch announcements",
  sports: "Sports intelligence",
};

export function formatCoverDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(d);
}

export function coverSvg(input: CoverInput, assets: CoverAssets): string {
  const titleSize = input.title.length > 60 ? 56 : input.title.length > 36 ? 64 : 76;
  const titleChars = Math.floor(820 / (titleSize * 0.6));
  const titleLines = wrap(input.title, titleChars, 3);
  const titleTop = 290 - (titleLines.length - 1) * titleSize * 0.35;
  const sub = wrap(input.excerpt, 62, 2);
  const subTop = titleTop + (titleLines.length - 1) * titleSize * 1.12 + titleSize * 0.75 + 44;
  const label = (CATEGORY_LABELS[input.category] ?? input.category).toUpperCase();
  const date = formatCoverDate(input.date);

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="${esc(input.title)}">
<defs><style>
@font-face{font-family:"PM";font-weight:800;src:url(${assets.montserrat800}) format("woff2")}
@font-face{font-family:"PI";font-weight:400;src:url(${assets.inter400}) format("woff2")}
.t{font-family:"PM",Montserrat,Arial,sans-serif;font-weight:800}
.b{font-family:"PI",Inter,Arial,sans-serif}
</style></defs>
<rect width="1200" height="630" fill="#16A34A"/>
<path d="M0 0H1040L960 630H0Z" fill="#0D0D0D"/>
<path d="M1040 0H1110L1030 630H960Z" fill="#1E9752"/>
<rect x="0" y="0" width="18" height="630" fill="#16A34A"/>
<image href="${assets.logo}" x="64" y="48" width="250" height="107"/>
<text x="64" y="176" class="b" font-size="22" font-weight="600" fill="#16A34A" letter-spacing="0.5">${esc(label)}</text>
${titleLines.map((l, i) => `<text x="64" y="${Math.round(titleTop + i * titleSize * 1.12)}" class="t" font-size="${titleSize}" fill="#FFFFFF">${esc(l)}</text>`).join("\n")}
${sub.map((l, i) => `<text x="64" y="${Math.round(subTop + i * 34)}" class="b" font-size="26" fill="#C7CBD1">${esc(l)}</text>`).join("\n")}
${date ? `<rect x="64" y="540" width="${Math.max(140, date.length * 15 + 40)}" height="48" fill="#16A34A"/><text x="84" y="573" class="t" font-size="24" fill="#FFFFFF">${esc(date)}</text>` : ""}
<text x="64" y="612" class="b" font-size="15" fill="#C7CBD1">18+ | T&amp;Cs apply | National Gambling Helpline 0800 006 008</text>
</svg>`;
}
