import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Blurred, FoundingGateCard, useGated } from "@/components/intel/guest-gate";
import { useSession } from "@/components/session";
import { TeamLogo } from "@/components/team-logo";
import { useAsync } from "@/hooks/use-async";
import { formatUnits, pct } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { fetchResults, fetchTipsterStats } from "@/lib/records";

export const Route = createFileRoute("/results")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "results");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/results" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.ogDescription") },
      ],
    };
  },
  component: Results,
});

const CHIP = {
  won: "bg-primary-soft text-primary",
  lost: "bg-destructive/10 text-destructive",
  void: "bg-muted text-muted-foreground",
} as const;

function FormChips({ form }: { form: string }) {
  return (
    <span className="inline-flex gap-1" aria-label={form}>
      {form.split("").map((c, i) => (
        <span
          key={i}
          className={`grid size-6 place-items-center text-[11px] fo¶»§q«^