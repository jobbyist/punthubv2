import { spawnSync } from "node:child_process";
import { getExperimentId, supabaseRest } from "./lib/db.mjs";

const countArg = process.argv.find(arg => arg.startsWith("--count="))?.split("=")[1] ?? "1";
const count = Number(countArg);
if (!Number.isInteger(count) || count < 1 || count > 3) {
  throw new Error("Use --count=1, --count=2 or --count=3. Maximum concurrency is three.");
}

const experiment = await getExperimentId();
const rows = await supabaseRest(
  `synthetic_personas?experiment_id=eq.${experiment.id}&active=eq.true&select=persona_key&order=last_run_at.asc.nullsfirst,persona_key.asc&limit=${count}`
);
if (!rows?.length) throw new Error("No active synthetic personas are available. Run npm run seed first.");

const personaIds = rows.map(row => row.persona_key);
console.log(`Starting labelled read-only QA batch: ${personaIds.join(", ")}`);

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["playwright", "test"], {
  stdio: "inherit",
  env: {
    ...process.env,
    SYNTHETIC_PERSONA_IDS: personaIds.join(","),
    SYNTHETIC_WORKERS: String(count),
    SYNTHETIC_EXPERIMENT_ID: experiment.id
  }
});

const finishedAt = new Date().toISOString();
for (const personaId of personaIds) {
  await supabaseRest(
    `synthetic_personas?experiment_id=eq.${experiment.id}&persona_key=eq.${encodeURIComponent(personaId)}`,
    { method: "PATCH", body: { last_run_at: finishedAt }, prefer: "return=minimal" }
  );
}

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
