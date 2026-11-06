import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Trans, useTranslation } from "react-i18next";
import {
  BellRing,
  Filter,
  Gauge,
  Gift,
  Lock,
  ShieldOff,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { IllustrativeInsights } from "@/components/illustrative-insights";
import { Button } from "@/components/ui/button";
import { Em } from "@/components/em";
import { headT } from "@/lib/i18n/head";

export const Route = createFileRoute("/insights")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "insights");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/insights" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.title") },
        { property: "og:description", content: t("meta.ogDescription") },
      ],
    };
  },
  component: Insights,
});

const PERKS = [
  [Sparkles, "insights"],
  [Users, "premium"],
  [TrendingUp, "trends"],
  [Filter, "filters"],
  [BellRing, "alerts"],
  [Gauge, "tracking"],
  [ShieldOff, "adfree"],
  [Gift, "tipsterSupport"],
] as const;

function Insights() {
  const navigate = useNavigate();
  const { t } = useTranslation("insights");

  return (
    <AppShell>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        anim¶»§q«^