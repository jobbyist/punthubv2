import { spawnSync } from "node:child_process";
import { supabaseRest } from "./lib/db.mjs";

const countArg = process.argv.find(arg => arg.startsWith("--count="))?.split("=")[1] ?? "1";
const count = Number(countArg);
if (!Number.isInteger(count) || count < 1 || count > 3) {
  throw new Error("Use --count=1, --count=2 or --count=3. Maximum concurrency is three.");
}

const slug = process.env.SYNTHETIC_EXPERIMENT_SLUG || "puntr-30-day-synthetic-2026-11-23";
const experiments = await supabaseRest(`synthetic_experiments?slug=eq.${encodeURIComponent(slug)}&select=id,status,starts_at,ends_at`);
const experiment = experiments?.[0];
if (!experiment) {
  console.log("Synthetic QA skipped: apply the migration before enabling scheduled runs.");
  process.exit(0);
}
if (experiment.status !== "active") {
  console.log(`Synthetic QA skipped: experiment status is ${experiment.status}.`);
  process.exit(0);
}
const now = Date.now();
if (now < Date.parse(experiment.starts_at) || now > Date.parse(experiment.ends_at)) {
  console.log("Synthetic QA skipped: outside the configured 30-day experiment window.");
  process.exit(0);
}

const rows = await supabaseRest(
  `synthetic_personas?experiment_id=eq.${experiment.id}&active=eq.true&select=persona_key&order=last_run_at.asc.nullsfirst,persona_key.asc&limit=${count}`
);
if (!rows?.length) {
  console.log("Synthetic QA skipped: seed the 50 personas before activating the experiment.");
  process.exit(0);
}

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
