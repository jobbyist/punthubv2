import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { supabaseRest, getExperimentId } from "./lib/db.mjs";

const API_KEY = process.env.PARALLEL_API_KEY;
const slug = process.env.SYNTHETIC_EXPERIMENT_SLUG || "puntr-30-day-synthetic-2026-11-23";
const estimateUsd = Number(process.env.SYNTHETIC_RESERVE_PER_REQUEST_USD || "0.25");
const schema = {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "fixture": {
      "type": "string"
    },
    "as_of": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "actionable",
        "insufficient_evidence",
        "postponed",
        "started",
        "finished"
      ]
    },
    "forecast": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "market": {
          "type": "string",
          "enum": [
            "1X2",
            "OU25",
            "BTTS",
            "none"
          ]
        },
        "selection": {
          "type": "string",
          "enum": [
            "home",
            "draw",
            "away",
            "over",
            "under",
            "yes",
            "no",
            "no_pick"
          ]
        },
        "probability_percent": {
          "type": [
            "number",
            "null"
          ],
          "minimum": 0,
          "maximum": 100
        },
        "confidence": {
          "type": "string",
          "enum": [
            "low",
            "medium",
            "high"
          ]
        },
        "rationale": {
          "type": "string"
        }
      },
      "required": [
        "market",
        "selection",
        "probability_percent",
        "confidence",
        "rationale"
      ]
    },
    "key_factors": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "uncertainty": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "sources": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "title": {
            "type": "string"
          },
          "url": {
            "type": "string"
          },
          "publisher": {
            "type": "string"
          },
          "published_at": {
            "type": [
              "string",
              "null"
            ]
          },
          "supports": {
            "type": "string"
          }
        },
        "required": [
          "title",
          "url",
          "publisher",
          "published_at",
          "supports"
        ]
      }
    }
  },
  "required": [
    "fixture",
    "as_of",
    "status",
    "forecast",
    "key_factors",
    "uncertainty",
    "sources"
  ]
};

if (!API_KEY) throw new Error("PARALLEL_API_KEY is required");
if (!process.argv[2]) throw new Error("Usage: node research.mjs ./fixture.json");
if (!(estimateUsd > 0 && estimateUsd <= 0.25)) throw new Error("Reserve must be > 0 and <= $0.25 per Responses request");

const fixture = JSON.parse(await readFile(process.argv[2], "utf8"));
for (const field of ["fixture_id", "home_team", "away_team", "competition", "kickoff_utc"]) {
  if (!fixture[field]) throw new Error(`Fixture JSON is missing ${field}`);
}
const fixtureKey = String(fixture.fixture_id);
const experiment = await getExperimentId(slug);
const existing = await supabaseRest(`synthetic_research?experiment_id=eq.${experiment.id}&fixture_key=eq.${encodeURIComponent(fixtureKey)}&select=response_json,source_urls`);
if (existing?.[0]) {
  console.log(JSON.stringify({ cached: true, fixture_key: fixtureKey, result: existing[0].response_json }, null, 2));
  process.exit(0);
}

const retryWindow = new Date().toISOString().slice(0, 13); // permits a controlled retry in a later hour
const requestKey = createHash("sha256").update(`${experiment.id}:${fixtureKey}:parallel-responses:${retryWindow}`).digest("hex");
const reserve = await supabaseRest("rpc/reserve_synthetic_budget", {
  method: "POST",
  body: { p_experiment_id: experiment.id, p_request_key: requestKey, p_provider: "parallel-responses", p_operation: "fixture_forecast", p_estimated_usd: estimateUsd }
});
if (reserve !== true) throw new Error("Budget reservation denied, duplicate request, or experiment is not active");

let responseId = null;
try {
  const prompt = [
    "Produce a neutral, evidence-based football fixture forecast for product QA and later accuracy evaluation.",
    "Do not advise placing a bet, recommend a stake, name a bookmaker, provide bankroll advice, or promise an outcome.",
    "Use only information available before kickoff. Check current fixture status and kickoff time.",
    "Use at least two independent, credible sources for an actionable forecast. If evidence is thin, contradictory, stale, or the match has started/finished, return an appropriate non-actionable status and no_pick.",
    "Do not invent injuries, lineups, statistics, odds, or source URLs. Distinguish verified facts from uncertainty.",
    "Fixture context: " + JSON.stringify(fixture)
  ].join("\n");

  const apiResponse = await fetch("https://api.parallel.ai/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "parallel",
      input: [
        { role: "system", content: "You are a sports research analyst. Return only schema-conforming JSON. Cite sources and express uncertainty." },
        { role: "user", content: prompt }
      ],
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "puntr_fixture_forecast", strict: true, schema } }
    }),
    signal: AbortSignal.timeout(90_000)
  });
  const body = await apiResponse.json();
  responseId = body.id || null;
  if (!apiResponse.ok) throw new Error(`Parallel Responses API error ${apiResponse.status}: ${JSON.stringify(body).slice(0,600)}`);

  const message = body.output?.find(item => item.type === "message");
  const textBlock = message?.content?.find(item => item.type === "output_text");
  if (!textBlock?.text) throw new Error("Parallel response did not contain structured output text");
  const result = JSON.parse(textBlock.text);

  const hosts = [...new Set((result.sources || []).map(s => {
    try { return new URL(s.url).hostname.replace(/^www\./, ""); } catch { return ""; }
  }).filter(Boolean))];
  if (result.status === "actionable" && hosts.length < 2) {
    throw new Error("Forecast rejected: fewer than two independent source domains");
  }
  if ((result.status !== "actionable") && result.forecast.selection !== "no_pick") {
    throw new Error("Forecast rejected: non-actionable fixture must return no_pick");
  }

  await supabaseRest("synthetic_research", {
    method: "POST",
    prefer: "return=minimal",
    body: {
      experiment_id: experiment.id,
      fixture_key: fixtureKey,
      provider: "parallel-responses",
      response_json: result,
      source_urls: (result.sources || []).map(s => s.url)
    }
  });
  await supabaseRest("rpc/settle_synthetic_budget", {
    method: "POST",
    body: { p_request_key: requestKey, p_settled_usd: null, p_provider_request_id: responseId, p_failed: false }
  });
  console.log(JSON.stringify({ cached: false, request_id: responseId, fixture_key: fixtureKey, result }, null, 2));
} catch (error) {
  await supabaseRest("rpc/settle_synthetic_budget", {
    method: "POST",
    body: { p_request_key: requestKey, p_settled_usd: null, p_provider_request_id: responseId, p_failed: true }
  }).catch(() => {});
  throw error;
}
