import { readFile } from "node:fs/promises";

const baseUrl = process.env.PUNTR_BASE_URL;
const cronSecret = process.env.CRON_SECRET;
if (!baseUrl) throw new Error("PUNTR_BASE_URL is required");
if (!cronSecret) throw new Error("CRON_SECRET is required");
if (!process.argv[2]) throw new Error("Usage: node decisions.mjs ./fixture.json");

const fixture = JSON.parse(await readFile(process.argv[2], "utf8"));
const personaIds = process.env.SYNTHETIC_PERSONA_IDS
  ?.split(",")
  .map(value => value.trim())
  .filter(Boolean);
const url = new URL("/api/cron/synthetic-decisions", baseUrl);
const response = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${cronSecret}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    experiment_slug: process.env.SYNTHETIC_EXPERIMENT_SLUG || "puntr-30-day-synthetic-2026-11-23",
    fixture,
    ...(personaIds?.length ? { persona_ids: personaIds } : {})
  }),
  signal: AbortSignal.timeout(60_000)
});
const text = await response.text();
let result;
try { result = JSON.parse(text); } catch { result = { raw: text.slice(0, 1000) }; }
if (!response.ok) throw new Error(`Synthetic Decisions endpoint failed (${response.status}): ${JSON.stringify(result)}`);
console.log(JSON.stringify(result, null, 2));
