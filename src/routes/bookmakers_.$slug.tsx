import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BookmakerDetail } from "@/components/bookmakers/bookmaker-detail";
import { AppShell } from "@/components/layout/app-shell";
import { bookmakerBySlug } from "@/lib/bookmaker-directory";
import { headT } from "@/lib/i18n/head";

const BASE = "https://puntr.co.za/bookmakers";

export const Route = createFileRoute("/bookmakers_/$slug")({
  loader: ({ params }) => {
    const item = bookmakerBySlug(params.slug);
    if (!item) throw notFound();
    return { item };
  },
  head: ({ match, loaderData }) => {
    const item = loaderData?.item;
    if (!item) return {};
    const t = headT(match.context.locale, "bookmakers");
    const title = t("meta.profileTitle", { name: item.name });
    const description = t("meta.profileDescription", { name: item.name });
    const url = `${BASE}/${item.slug}`;
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
    };
  },
  component: BookmakerPage,
  notFoundComponent: BookmakerNotFound,
});

function BackLink() {
  const { t } = useTranslation("bookmakers");
  return (
    <Link
      to="/bookmakers"
      className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      {t("detail.back")}
    </Link>
  );
}

function BookmakerPage() {
  const { item } = Route.useLoaderData();
  return (
    <AppShell>
      <BackLink />
      <div className="card-surface mx-auto max-w-2xl p-5 sm:p-6">
        <BookmakerDetail item={item} />
      </div>
    </AppShell>
  );
}

function BookmakerNotFound() {
  const { t } = useTranslation("bookmakers");
  return (
    <AppShell>
      <BackLink />
      <p className="card-surface p-8 text-center text-sm">{t("detail.notFound")}</p>
    </AppShell>
  );
}
