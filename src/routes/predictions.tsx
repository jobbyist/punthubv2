import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Blurred, FoundingGateCard, FREE_ITEMS, useGated } from "@/components/intel/guest-gate";
import { IntelPanel } from "@/components/intel/intel-panel";
import { TeamLogo } from "@/components/team-logo";
import { IllustrativeFixtures } from "@/components/illustrative-panels";
import { fetchUpcomingFixtures, groupFixturesByDay } from "@/lib/fixtures";
import { formatTime } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import type { Sport } from "@/lib/sports/types";

type Search = { sport?: Sport; competition?: string };

export const Route = createFileRoute("/predictions")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const out: Search = {};
    if (search["sport"] === "soccer" || search["sport"] === "rugby") out.sport = search["sport"];
    if (typeof search["competition"] === "string" && search["competition"])
      out.competition = search["competition"].slice(0, 80);
    return out;
  },
  loaderDeps: ({ search }) => ({ sport: search.sport }),
  loader: async ({ deps }) => {
    try {
      return { fixtures: await fetchUpcomingFixtures({ sport: deps.sport }), failed: false };
    } catch (error) {
      console.error("fixtures load failed", error);
      return { fixtures: [], failed: true };
    }
  },
  head: ¶»§q«^