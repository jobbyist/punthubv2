import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { Em } from "@/components/em";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { PAYMENTS_ENABLED } from "@/lib/flags";
import { money } from "@/lib/format";
import { headT } from "@/lib/i18n/head";

export const Route = createFileRoute("/pricing")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "pricing");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/pricing" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.ogDescription") },
      ],
    };
  },
  component: Pricing,
});

const FOUNDING = ["f1", "f2", "f3"] as const;
const PRO = ["f1", "f2", "f3", "f4", "f5", "f6"] as const;

const PACKS = [
  ["starter", 25, 25],
  ["matchday", 60, 65],
  ["season", 120, 140],
] as const;

const USES = [
  ["preview", 5],
  ["slip", 3],
  ["stats", 2],
] as const;

const FAQS = ["1", "2", "3", "4", "5"] as const;

/** Puntr Pro is R99 per month. Shown as coming soon: nothing can be bought while PAYMENTS_ENABLED is false. */
export const PRO_MONTHLY_RAND = 99;

function Pricing() {
  const { t } = useTranslation("pricing");
¶»§q«^