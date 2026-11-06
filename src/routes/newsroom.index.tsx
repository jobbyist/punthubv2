import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useAsync } from "@/hooks/use-async";
import { analytics } from "@/lib/analytics";
import { formatDate } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import {
  fetchPublished,
  isCategory,
  NEWSROOM_CATEGORIES,
  type NewsroomCategory,
} from "@/lib/newsroom";

export const Route = createFileRoute("/newsroom/")({
  validateSearch: (search: Record<string, unknown>): { category?: NewsroomCategory } =>
    isCategory(search["category"]) ? { category: search["category"] } : {},
  head: ({ match }) => {
    const t = headT(match.context.locale, "newsroom");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/newsroom" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.description") },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://puntr.co.za/newsroom" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Newsroom,
});

function Newsroom() {
  const { t } = useTranslation("newsroom");
  const { category } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, failed, loading } = use¶»§q«^