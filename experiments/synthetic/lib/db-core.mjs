const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasDatabaseConfig() {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

export async function supabaseRest(path, { method = "GET", body, prefer } = {}) {
  if (!hasDatabaseConfig()) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const response = await fetch(new URL(`/rest/v1/${path}`, SUPABASE_URL), {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${method} ${path} failed (${response.status}): ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

export async function getExperimentId(slug = "puntr-30-day-synthetic-2026-11-27") {
  const rows = await supabaseRest(`synthetic_experiments?slug=eq.${encodeURIComponent(slug)}&select=id,status,budget_cap_usd,spent_usd,reserved_usd`);
  if (!rows?.[0]) throw new Error("Experiment row missing. Apply the synthetic experiment migration first.");
  if (rows[0].status !== "active") throw new Error(`Experiment is ${rows[0].status}; an admin must explicitly activate it before any run.`);
  return rows[0];
}

export async function logSession(row) {
  return supabaseRest("synthetic_sessions", { method: "POST", body: row, prefer: "return=minimal" });
}
