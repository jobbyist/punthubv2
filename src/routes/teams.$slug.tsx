import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/app-shell";
import { TeamDetail } from "@/components/teams/team-detail";
import { headT } from "@/lib/i18n/head";
import { fetchDirectory, fetchFollowerCounts } from "@/lib/teams/directory";
import { useTeamFollows } from "@/lib/teams/follows";

const BASE = "https://puntr.co.za/teams";

export const Route = createFileRoute("/teams/$slug")({
  loader: async ({ params }) => {
    const [teams, followers] = await Promise.all([fetchDirectory(), fetchFollowerCounts()]);
    const team = teams.find((x) => x.slug === params.slug);
    if (!team) throw notFound();
    return { team, followers: followers[team.key] };
  },
  head: ({ match, loaderData }) => {
    const team = loaderData?.team;
    if (!team) return {};
    const t = headT(match.context.locale, "teams");
    const competition = team.standing?.competition ?? team.competitions[0]?.name ?? "football";
    const title = t("meta.teamTitle", { team: team.name });
    const description = t("meta.teamDescription", { team: team.name, competition });
    const url = `${BASE}/${team.slug}`;
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:url", content: url },
        ...(team.badge?.startsWith("https://")
          ? [{ property: "og:image", content: team.badge }]
          : []),
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "SportsTeam",
                name: team.name,
                sport: "Football",
                url,
                ...(team.badge?.startsWith("https://") ? { logo: team.badge } : {}),
                memberOf: team.competitions.map((c) => ({
                  "@type": "SportsOrganization",
                  name: c.name,
                })),
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Puntr", item: "https://puntr.co.za/" },
                  { "@type": "ListItem", position: 2, name: t("breadcrumb"), item: BASE },
                  { "@type": "ListItem", position: 3, name: team.name, item: url },
                ],
              },
            ],
          }),
        },
      ],
    };
  },
  component: TeamPage,
});

function TeamPage() {
  const { t } = useTranslation("teams");
  const { team, followers } = Route.useLoaderData();
  const follows = useTeamFollows();
  return (
    <AppShell>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">
          Puntr
        </Link>{" "}
        /{" "}
        <Link to="/teams" className="hover:underline">
          {t("breadcrumb")}
        </Link>{" "}
        / <span aria-current="page">{team.name}</span>
      </nav>
      <div className="mx-auto max-w-2xl">
        <h1 className="sr-only">{team.name}</h1>
        <TeamDetail team={team} follows={follows} followers={followers} source="team_page" />
        <Link
          to="/teams"
          className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("detail.back")}
        </Link>
      </div>
    </AppShell>
  );
}
