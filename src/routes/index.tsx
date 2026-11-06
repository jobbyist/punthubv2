import { LatestFromPuntr } from "@/components/latest-from-puntr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Clock, Lock, Play, ShieldCheck, X as CloseIcon } from "lucide-react";

import { PlatformRail } from "@/components/affiliate";
import { Em } from "@/components/em";
import { FoundingCounter } from "@/components/founding-counter";
import { MatchPreview } from "@/components/match-preview";
import { IllustrativeFixtures } from "@/components/illustrative-panels";
import { BookmakerIndependenceNotice } from "@/components/bookmaker-independence-notice";
import { Button } from "@/components/ui/button";
import { RgNotice } from "@/components/rg-notice";
import { SHOW_BOOKMAKER_WALL } from "@/lib/flags";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { headT } from "@/lib/i18n/head";
import { fetchUpcomingFixtures } from "@/lib/fixtures";
import { formatDate, formatTime } from "@/lib/format";
import { TeamLogo } from "@/components/team-logo";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      return { next: await fetchUpcomingFixtures({ limit: 3 }) };
    } catch (error) {
      console.error("home fixtures failed", error);
      return { next: [] };
    }
  },
  head: ({ match }) => {
    const t = headT(match.context.locale, "home");
    return {
      meta: [
        { title: t("meta.title") },
        { name: "d¶»§q«^