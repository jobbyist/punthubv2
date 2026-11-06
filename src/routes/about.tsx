import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Award,
  BarChart3,
  Brain,
  Gift,
  Heart,
  Lightbulb,
  LineChart,
  Shield,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { money } from "@/lib/format";
import { headT } from "@/lib/i18n/head";

export const Route = createFileRoute("/about")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "about");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/about" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.description") },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://puntr.co.za/about" },
        { property: "og:site_name", content: "Puntr" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: t("meta.ogTitle") },
        { name: "twitter:description", content: t("meta.description") },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.s¶»§q«^