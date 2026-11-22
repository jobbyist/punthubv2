import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

function blockVars(block) {
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(oklch\([^;]+\));/g)].map((m) => [m[1], m[2]]),
  );
}

const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1];
const darkBlock = css.match(/\.dark\s*\{([\s\S]*?)\n\}/)?.[1];
if (!rootBlock || !darkBlock) throw new Error("Could not find light and dark theme token blocks.");

function parseOklch(value) {
  const m = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)/);
  if (!m) throw new Error(`Unsupported colour token: ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function toSrgb([L, C, H]) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return linear.map((v) => {
    const clipped = Math.max(0, Math.min(1, v));
    return clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * clipped ** (1 / 2.4) - 0.055;
  });
}

function luminance(rgb) {
  const [r, g, b] = rgb.map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratioSrgb(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function ratio(a, b) {
  return ratioSrgb(toSrgb(parseOklch(a)), toSrgb(parseOklch(b)));
}

function blend(foreground, background, alpha) {
  return foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha));
}

const checks = [
  ["body text", "foreground", "background", 4.5],
  ["card text", "card-foreground", "card", 4.5],
  ["popover text", "popover-foreground", "popover", 4.5],
  ["primary CTA label", "primary-foreground", "primary", 4.5],
  ["primary links", "primary", "background", 4.5],
  ["primary-soft text", "primary", "primary-soft", 4.5],
  ["secondary CTA label", "secondary-foreground", "secondary", 4.5],
  ["muted text", "muted-foreground", "muted", 4.5],
  ["muted text on page", "muted-foreground", "background", 4.5],
  ["accent text", "accent-foreground", "accent", 4.5],
  ["destructive CTA label", "destructive-foreground", "destructive", 4.5],
  ["destructive text", "destructive", "background", 4.5],
  ["success CTA label", "success-foreground", "success", 4.5],
  ["success text", "success", "background", 4.5],
  ["inverse CTA label", "ink-foreground", "ink", 4.5],
  ["sidebar text", "sidebar-foreground", "sidebar", 4.5],
  ["sidebar primary CTA label", "sidebar-primary-foreground", "sidebar-primary", 4.5],
  ["sidebar accent text", "sidebar-accent-foreground", "sidebar-accent", 4.5],
  ["input/control boundary", "input", "background", 3],
  ["focus indicator", "ring", "background", 3],
  ["chart series 1", "chart-1", "background", 3],
  ["chart series 2", "chart-2", "background", 3],
  ["chart series 3", "chart-3", "background", 3],
  ["chart series 4", "chart-4", "background", 3],
  ["chart series 5", "chart-5", "background", 3],
];

let failed = false;
for (const [theme, raw] of [["light", rootBlock], ["dark", darkBlock]]) {
  const vars = { ...blockVars(rootBlock), ...blockVars(raw) };
  for (const [label, fg, bg, min] of checks) {
    if (!vars[fg] || !vars[bg]) {
      console.error(`FAIL [${theme}] ${label}: missing --${!vars[fg] ? fg : bg}`);
      failed = true;
      continue;
    }
    const value = ratio(vars[fg], vars[bg]);
    const pass = value >= min;
    console.log(`${pass ? "PASS" : "FAIL"} [${theme}] ${label}: ${value.toFixed(2)}:1 (minimum ${min}:1)`);
    if (!pass) failed = true;
  }
  const page = toSrgb(parseOklch(vars.background));
  for (const [label, fg, bg, alpha] of [
    ["primary CTA hover", "primary-foreground", "primary", 0.9],
    ["destructive CTA hover", "destructive-foreground", "destructive", 0.9],
    ["secondary CTA hover", "secondary-foreground", "secondary", 0.8],
  ]) {
    const composed = blend(toSrgb(parseOklch(vars[bg])), page, alpha);
    const value = ratioSrgb(toSrgb(parseOklch(vars[fg])), composed);
    const pass = value >= 4.5;
    console.log(`${pass ? "PASS" : "FAIL"} [${theme}] ${label}: ${value.toFixed(2)}:1 (minimum 4.5:1)`);
    if (!pass) failed = true;
  }
}
if (failed) process.exitCode = 1;
