import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Flame, Target, Trophy, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { IllustrativeLeaderboard } from "@/components/illustrative-panels";
import { useSession } from "@/components/session";
import { Blurred, FoundingGateCard, useGated } from "@/components/intel/guest-gate";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { PRIZES_ENABLED } from "@/lib/flags";
import { formatUnits, pct } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { currentWeekStart } from "@/lib/pick-data";
import {
  fetchWeeklyBoard,
  picksNeeded,
  previousWeekStart,
  weekRange,
  type BoardRow,
} from "@/lib/records";

export const Route = createFileRoute("/leaderboards")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "leaderboards");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/leaderboards" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.ogDescription") },
      ],
    };
  },
  component: Leaderboards,
});

const HOW = ["s1", "s2", "s3", "s¶»§q«^