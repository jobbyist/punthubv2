import { PageArt } from "@/components/motion/page-art";
import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, FileText, Sparkles, Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { headT } from "@/lib/i18n/head";

export const Route = createFileRoute("/tools")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "pages");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/tools" }],
      meta: [
        { title: t("tools.meta.title") },
        { name: "description", content: t("tools.meta.description") },
      ],
    };
  },
  component: ToolsPage,
});

const TOOLS = [
  { key: "converter", icon: FileText, paid: false },
  { key: "edge", icon: Sparkles, paid: true },
  { key: "chat", icon: Bot, paid: true },
] as const;

function ToolsPage() {
  const { t } = useTranslation("pages");
  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] py-4 sm:py-8">
        <div className="flex items-center gap-8">
          <div className="puntr-rise min-w-0 max-w-2xl flex-1">
            <span className="inline-flex items-center gap-2 border border-primary/30 bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
              <Wrench className="size-3.5" /> {t("tools.eyebrow")}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
              {t("tools.title1")} <span className="text-primary">{t("tools.title2")}</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("tools.lead")}
            </p>
          </div>
          <PageArt kind="radar" className="hidden h-44 w-72 shrink-0 md:block" />
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {TOOLS.map((tool) => (
            <article
              key={tool.key}
              className="card-surface card-interactive flex h-full flex-col p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <tool.icon className="size-5" />
                </span>
                <span
                  className={
                    tool.paid
                      ? "border border-primary/30 bg-primary-soft px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary"
                      : "border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                  }
                >
                  {t(tool.paid ? "tools.access.pro" : "tools.access.free")}
                </span>
              </div>
              <h2 className="mt-5 text-lg font-bold leading-snug">
                {t(`tools.items.${tool.key}.name`)}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {t(`tools.items.${tool.key}.description`)}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs font-semibold text-muted-foreground">
                  {t(tool.paid ? "tools.status.paid" : "tools.status.soon")}
                </span>
                {tool.paid && (
                  <span className="text-xs font-bold text-primary">{t("tools.price")}</span>
                )}
              </div>
            </article>
          ))}
        </div>
        <section className="mt-7 flex flex-col gap-4 border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-bold">{t("tools.pro.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("tools.pro.body")}</p>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/pricing">
              {t("tools.pro.cta")} <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{t("tools.fine")}</p>
      </div>
    </AppShell>
  );
}
