import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CrowdSplit } from "@/components/crowd-split";
import { AppShell } from "@/components/layout/app-shell";
import { PickCard } from "@/components/pick-card";
import { PickForm } from "@/components/pick-form";
import { TeamLogo } from "@/components/team-logo";
import { useNow } from "@/hooks/use-now";
import { rememberRef } from "@/lib/ref-store";
import { formatDate, formatTime } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { fetchFixture, fetchPicksForFixture, type PickRow } from "@/lib/pick-data";
import { countdownTo, formatSpan } from "@/lib/picks";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/match/$fixtureId")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } =>
    typeof search["ref"] === "string" && search["ref"] ? { ref: search["ref"].slice(0, 32) } : {},
  loader: async ({ params }) => {
    if (!UUID.test(params.fixtureId)) throw notFound();
    const fixture = await fetchFixture(params.fixtureId);
    if (!fixture) throw notFound();
    return { fixture };
  },
  head: ({ match, loaderData, params }) => {
    const t = headT(match.context.locale, "match");
    const f = loaderData?.fixture;
    if (!f) return { meta: [{ title: t("meta.notFound") }] };
    cons¶»§q«^