/**
 * bun run i18n:check
 * 1. Lists keys present in en-ZA but missing from each other language.
 * 2. Lists hard-coded user-facing text left in JSX.
 * Warn only for now: always exits 0. Pass --strict to exit 1 when anything is found.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const LOCALES = join(ROOT, "src/locales");
const BASE = "en-ZA";
const OTHERS = ["af", "zu", "xh"];

// Full legal pages stay in English by design; generated and UI-kit files are not product copy.
const SKIP_FILES = [
  "src/components/ui/",
  "src/routeTree.gen.ts",
  "src/routes/terms.tsx",
  "src/routes/privacy.tsx",
  "src/routes/privacy_.request.tsx",
  "src/routes/cookies.tsx",
  "src/routes/refunds.tsx",
  "src/routes/affiliate-disclosure.tsx",
  "src/routes/sitemap",
  "src/components/early-access-modal.tsx", // replaced in P6
  "src/components/auth-prompt.tsx", // replaced in P6
  "src/components/punt-ai.tsx", // hidden behind SHOW_PUNT_AI_CHAT
  "src/components/session.tsx", // reason strings move with P6
];

function flatten(obj: unknown, prefix = "", out: string[] = []): string[] {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else out.push(prefix);
  return out;
}

// Plural suffixes count as the same key.
const stripPlural = (k: string) => k.replace(/_(zero|one|two|few|many|other)$/, "");

function loadKeys(lang: string): Map<string, Set<string>> {
  const dir = join(LOCALES, lang);
  const map = new Map<string, Set<string>>();
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    /* language folder not created yet */
  }
  for (const f of files) {
    const json = JSON.parse(readFileSync(join(dir, f), "utf8"));
    map.set(f.replace(/\.json$/, ""), new Set(flatten(json).map(stripPlural)));
  }
  return map;
}

let findings = 0;

const base = loadKeys(BASE);
console.log("— Missing translations (against en-ZA) —");
for (const lang of OTHERS) {
  const have = loadKeys(lang);
  let missing = 0;
  for (const [ns, keys] of base) {
    for (const k of keys) if (!have.get(ns)?.has(k)) missing += 1;
  }
  const total = [...base.values()].reduce((n, s) => n + s.size, 0);
  console.log(`${lang}: ${missing} of ${total} keys missing`);
  findings += missing;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const TEXT_NODE = />\s*([A-Za-z][^<>{}=;]*[A-Za-z.!?:])\s*</g;
const ATTR = /\b(aria-label|placeholder|title|alt)="([^"{}]*[A-Za-z][^"{}]*)"/g;
// Short tokens that are brands, symbols or units, not sentences.
const IGNORE = /^(Puntr|PP|X|f|ig|yt|tt|ZAR|UTC|SAST|\d+[\w+%]*)$/;

console.log("\n— Hard-coded text in JSX —");
for (const file of walk(join(ROOT, "src"))) {
  const rel = relative(ROOT, file);
  if (SKIP_FILES.some((s) => rel.startsWith(s))) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  const hits: string[] = [];
  lines.forEach((line, i) => {
    if (/^\s*(import|\/\/|\*|\/\*)/.test(line) || (/className=/.test(line) === false && false))
      return;
    for (const m of line.matchAll(TEXT_NODE)) {
      const text = (m[1] ?? "").trim();
      if (text.length > 1 && !IGNORE.test(text) && !/^[a-z-]+$/.test(text))
        hits.push(`${i + 1}: ${text}`);
    }
    for (const m of line.matchAll(ATTR)) {
      const text = (m[2] ?? "").trim();
      if (!IGNORE.test(text)) hits.push(`${i + 1}: [${m[1]}] ${text}`);
    }
  });
  if (hits.length) {
    console.log(`${rel} (${hits.length})`);
    for (const h of hits.slice(0, 6)) console.log(`   ${h}`);
    if (hits.length > 6) console.log(`   … ${hits.length - 6} more`);
    findings += hits.length;
  }
}

console.log(
  `\n${findings} finding(s). ${process.argv.includes("--strict") ? "" : "Warn only: exit 0."}`,
);
process.exit(process.argv.includes("--strict") && findings > 0 ? 1 : 0);
