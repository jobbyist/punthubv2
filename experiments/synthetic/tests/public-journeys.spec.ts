import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const personas = JSON.parse(await readFile(resolve("personas.json"), "utf8"));
const requested = process.env.SYNTHETIC_PERSONA_IDS?.split(",").map(x => x.trim()).filter(Boolean);
const selected = requested?.length ? personas.filter(p => requested.includes(p.persona_id)) : personas;
const allowedPaths = new Set(["/", "/founding", "/predictions", "/fixtures", "/results", "/newsroom", "/roadmap"]);

if (requested?.length && selected.length !== requested.length) {
  throw new Error("One or more SYNTHETIC_PERSONA_IDS were not found in personas.json");
}

async function recordSession(payload) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const experimentId = process.env.SYNTHETIC_EXPERIMENT_ID;
  if (!url || !key || !experimentId) return;
  const response = await fetch(new URL("/rest/v1/synthetic_sessions", url), {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({ experiment_id: experimentId, ...payload })
  });
  if (!response.ok) throw new Error(`Synthetic session logging failed: ${response.status} ${(await response.text()).slice(0,300)}`);
}

test.describe("Puntr production read-only synthetic QA", () => {
  test.describe.configure({ mode: "parallel" });

  for (const persona of selected) {
    test(`@smoke ${persona.persona_id} — ${persona.segment}`, async ({ page }) => {
      const startedAt = new Date().toISOString();
      const visited = [];
      let outcome = "passed";
      let errorCode = null;
      try {
        for (const path of persona.journey_paths) {
          if (!allowedPaths.has(path)) throw new Error(`Blocked non-allowlisted path: ${path}`);
          const response = await page.goto(path, { waitUntil: "domcontentloaded" });
          const status = response?.status() ?? 0;
          expect(status, `${path} returned HTTP ${status}`).toBeGreaterThanOrEqual(200);
          expect(status, `${path} returned HTTP ${status}`).toBeLessThan(500);
          visited.push(path);
          // Small deterministic pauses make rendering and client-side navigation observable.
          // This is test pacing, not stealth or an attempt to imitate genuine customers.
          await page.waitForTimeout(250 + ((persona.persona_id.charCodeAt(persona.persona_id.length - 1) + visited.length * 137) % 500));
        }
      } catch (error) {
        outcome = "failed";
        errorCode = error instanceof Error ? error.message.slice(0, 240) : "unknown_error";
        throw error;
      } finally {
        await recordSession({
          persona_key: persona.persona_id,
          session_type: "read_only_browser",
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          outcome,
          page_paths: visited,
          error_code: errorCode,
          metadata: { segment: persona.segment, marker: "synthetic_qa", account_mode: persona.account_mode }
        });
      }
    });
  }
});
