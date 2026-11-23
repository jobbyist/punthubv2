import { readFile } from "node:fs/promises";
import { supabaseRest } from "./lib/db.mjs";

const slug = process.env.SYNTHETIC_EXPERIMENT_SLUG || "puntr-30-day-synthetic-2026-11-23";
const file = JSON.parse(await readFile(new URL("./personas.json", import.meta.url), "utf8"));
const rows = await supabaseRest(`synthetic_experiments?slug=eq.${encodeURIComponent(slug)}&select=id,status,starts_at,ends_at,budget_cap_usd,spent_usd,reserved_usd`);
const experiment = rows?.[0];
if (!experiment) throw new Error("Experiment row missing. Apply the synthetic experiment migration first.");
const payload = file.personas.map(persona => ({
  experiment_id: experiment.id,
  persona_key: persona.persona_id,
  persona,
  active: true
}));
await supabaseRest("synthetic_personas?on_conflict=experiment_id,persona_key", {
  method: "POST",
  body: payload,
  prefer: "resolution=merge-duplicates,return=minimal"
});
console.log(JSON.stringify({ experiment_id: experiment.id, status: experiment.status, personas_seeded: payload.length, budget_cap_usd: experiment.budget_cap_usd, spent_usd: experiment.spent_usd, reserved_usd: experiment.reserved_usd }, null, 2));
