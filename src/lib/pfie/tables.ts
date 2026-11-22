/**
 * Daily standings and history sync. Each cron call handles at most `maxJobs` due jobs (standings first, then a
 * one-time history backfill), so a run stays inside the function time limit and the API quotas. Jobs are
 * idempotent: a table replaces the previous one atomically, history rows skip duplicates, and every attempt is
 * recorded in `sync_status` (failures back off and stop after three tries a day).
 */
import { DEFAULT_PFIE_MODELS, parseModelList } from "@/lib/content/config";
import { AllModelsFailed, createModelRouter } from "@/lib/content/model-router";
import { cleanText, domainOf, isBlockedDomain } from "@/lib/content/research";
import type { ExtractProvider, LlmProvider, SearchProvider } from "@/lib/content/types";
import { sastDate } from "@/lib/sast";
import { competitions, seasonFor, type CompetitionKey } from "@/lib/sports/competitions";

import { extractionRequest, parseObservations, validateObservations } from "./extract";
import { ARCHIVE_SOURCES } from "./archive";
import { archiveJobsDue, runArchiveJob } from "./archive-run";
import { verifyHistory, needsBackfill, type HistoryRow } from "./history";
import { PFIE_SOURCES, tierOf } from "./provider";
import {
  STANDINGS_COMPETITIONS,
  chooseTable,
  independentSourceKey,
  parseStandings,
  tableRegression,
  standingsRequest,
  standingsDisagreementHint,
  validateTables,
  type StandingRow,
} from "./standings";
import type { PfieSource } from "./types";

export type TableJob = "standings" | "¶»§q«^