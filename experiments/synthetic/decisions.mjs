import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { supabaseRest, getExperimentId } from "./lib/db.mjs";

const API_KEY = process.env.PARALLEL_API_KEY;
const slug = process.env.SYNTHETIC_EXPERIMENT_SLUG || "puntr-30-day-synthetic-2026-11-23";
const estimateUsd = Number(process.env.SYNTHETIC_DECISION_RESERVE_USD || "0.001");
if (!API_KEY) throw new Error("PARALLEL_API_KEY is required");
if (!process.argv[2]) throw new Error("Usage: node decisions.mjs ./fixture.json");
if (!(estimateUsd > 0 && estimateUsd <= 0.25)) throw new Error("Decision reserve must be > 0 and <= $0.25");

const fixture = JSON.parse(await readFile(process.argv[2], "utf8"));
for (const field of ["fixture_id", "home_team", "away_team", "competition", "kickoff_utc"]) {
  if (!fixture[field]) throw new Error(`Fixture JSON is missing ${field}`);
}
const personaFile = JSON.parse(await readFile(new URL("./personas.json", import.meta.url), "utf8"));
const requested = process.env.SYNTHETIC_PERSONA_IDS?.split(",").map(value => value.trim()).filter(Boolean);
const personas = requested?.length
  ? personaFile.personas.filter(persona => requested.includes(persona.persona_id))
  : personaFile.personas;
if (!personas.length || personas.length > 100) throw new Error("Select between 1 and 100 personas per shared fixture request");
if (requested?.length && personas.length !== requested.length) throw new Error("Unknown persona ID in SYNTHETIC_PERSONA_IDS");

const marketOptions = {
  "1X2": {
    home: "The home team wins in regulation time.",
    draw: "The match ends in a draw after regulation time.",
    away: "The away team wins in regulation time.",
    no_pick: "Evidence is insufficient, stale, contradictory, or the fixture is not eligible for a pre-match forecast."
  },
  "OU25": {
    over: "The match has at least three total goals.",
    under: "The match has zero, one, or two total goals.",
    no_pick: "Evidence is insufficient, stale, contradictory, or the fixture is not eligible for a pre-match forecast."
  },
  "BTTS": {
    yes: "Both teams score at least one goal.",
    no: "At least one team does not score.",
    no_pick: "Evidence is insufficient, stale, contradictory, or the fixture is not eligible for a pre-match forecast."
  }
};

const questions = {};
for (const persona of personas) {
  const market = persona.market_interests[0];
  const criteria = marketOptions[market];
  questions[persona.persona_id] = {
    type: "choice",
    instructions: [
      `Evaluate the pre-match ${market} forecast for ${fixture.home_team} vs ${fixture.away_team}.`,
      `Use this analytical lens: ${persona.research_style}.`,
      `The persona follows ${persona.competitions.join(", ")} and prefers ${persona.market_interests.join(", ")}.`,
      "Use current, credible, independent web evidence. Do not invent team news, lineups, statistics or results.",
      "Choose no_pick if the fixture has started, finished, been postponed, evidence is insufficient, or sources materially disagree.",
      "This is an informational forecast for QA and accuracy evaluation, not advice to place a bet."
    ].join(" "),
    criteria
  };
}

const experiment = await getExperimentId(slug);
const fixtureKey = String(fixture.fixture_id);
const existing = await supabaseRest(
  `synthetic_research?experiment_id=eq.${experiment.id}&fixture_key=eq.${encodeURIComponent(fixtureKey)}&provider=eq.parallel-decisions&select=response_json,source_urls`
);
if (existing?.[0]) {
  console.log(JSON.stringify({ cached: true, fixture_key: fixtureKey, result: existing[0].response_json }, null, 2));
  process.exit(0);
}

const retryWindow = new Date().toISOString().slice(0, 13);
const requestKey = createHash("sha256").update(`${experiment.id}:${fixtureKey}:parallel-decisions:${retryWindow}`).digest("hex");
const reserved = await supabaseRest("rpc/reserve_synthetic_budget", {
  method: "POST",
  body: {
    p_experiment_id: experiment.id,
    p_request_key: requestKey,
    p_provider: "parallel-decisions",
    p_operation: "persona_fixture_decisions",
    p_estimated_usd: estimateUsd
  }
});
if (reserved !== true) throw new Error("Budget reservation denied, duplicate request, or experiment is not active");

let decisionId = null;
try {
  const response = await fetch("https://api.parallel.ai/v1/decisions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
    body: JSON.stringify({
      mode: "fast",
      state: {
        fixture,
        rule: "Pre-match only. Never use post-kickoff information. Do not recommend stakes, bookmakers or wagering actions."
      },
      questions
    }),
    signal: AbortSignal.timeout(45_000)
  });
  const body = await response.json();
  decisionId = body.decision_id || null;
  if (!response.ok) throw new Error(`Parallel Decisions API error ${response.status}: ${JSON.stringify(body).slice(0, 600)}`);

  const citations = Array.isArray(body.citations) ? body.citations : [];
  const domains = [...new Set(citations.map(item => {
    try { return new URL(item.url).hostname.replace(/^www\\./, ""); } catch { return ""; }
  }).filter(Boolean))];
  const enoughSources = domains.length >= 2;

  const decisions = personas.map(persona => {
    const market = persona.market_interests[0];
    const answer = body.answers?.[persona.persona_id];
    if (!enoughSources || !answer || answer.type !== "choice") {
      return {
        persona_id: persona.persona_id,
        market,
        selection: "no_pick",
        status: enoughSources ? "refused_or_missing" : "insufficient_sources",
        probabilities: answer?.probabilities || {},
        selected_probability: null,
        confidence: "none"
      };
    }
    const selection = answer.choice;
    const probability = typeof answer.probabilities?.[selection] === "number" ? answer.probabilities[selection] : null;
    const confidence = probability === null ? "none" : probability >= 0.7 ? "high" : probability >= 0.55 ? "medium" : "low";
    return {
      persona_id: persona.persona_id,
      market,
      selection: marketOptions[market][selection] ? selection : "no_pick",
      status: marketOptions[market][selection] ? "evaluated" : "invalid_choice",
      probabilities: answer.probabilities || {},
      selected_probability: probability,
      confidence
    };
  });

  const result = {
    fixture: fixtureKey,
    fixture_context: fixture,
    provider: "parallel-decisions",
    decision_id: decisionId,
    persona_count: personas.length,
    source_domains: domains,
    citations,
    decisions
  };

  await supabaseRest("synthetic_research", {
    method: "POST",
    prefer: "return=minimal",
    body: {
      experiment_id: experiment.id,
      fixture_key: fixtureKey,
      provider: "parallel-decisions",
      response_json: result,
      source_urls: citations.map(item => item.url).filter(Boolean)
    }
  });
  await supabaseRest("rpc/settle_synthetic_budget", {
    method: "POST",
    body: { p_request_key: requestKey, p_settled_usd: null, p_provider_request_id: decisionId, p_failed: false }
  });
  console.log(JSON.stringify({ cached: false, decision_id: decisionId, fixture_key: fixtureKey, persona_count: personas.length, source_domains: domains, decisions }, null, 2));
} catch (error) {
  await supabaseRest("rpc/settle_synthetic_budget", {
    method: "POST",
    body: { p_request_key: requestKey, p_settled_usd: null, p_provider_request_id: decisionId, p_failed: true }
  }).catch(() => {});
  throw error;
}
