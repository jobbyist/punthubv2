import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  BellRing,
  Filter,
  Gauge,
  Lock,
  ShieldOff,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
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
] as const;

function Insights() {
  const navigate = useNavigate();
  const { t } = useTranslation("insights");

  return (
    <AppShell>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-10 text-center"
      >
        <motion.span
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto grid size-28 place-items-center rounded-full bg-primary-soft text-primary"
        >
          <Lock className="size-10" strokeWidth={1.5} />
        </motion.span>
        <h1 className="mx-auto mt-7 max-w-xl text-[clamp(1.9rem,4.5vw,2.6rem)] leading-tight">
          {t("title1")} <span className="text-primary">{t("title2")}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{t("body")}</p>
        <div className="mx-auto mt-7 flex max-w-xs flex-col gap-3">
          <Button size="lg" className="h-12" onClick={() => navigate({ to: "/join" })}>
            {t("cta")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12"
            onClick={() => navigate({ to: "/join" })}
          >
            {t("beta")}
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">{t("fine")}</p>
      </motion.section>

      <section className="card-surface p-6">
        <h2 className="text-lg">{t("perks.title")}</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          {PERKS.map(([Icon, k]) => (
            <div key={k} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{t(`perks.${k}.title`)}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {t(`perks.${k}.body`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
