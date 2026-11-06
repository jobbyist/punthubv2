import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Target } from "lucide-react";
import { CommunityDiscussions } from "@/components/community-discussions";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { PickCard } from "@/components/pick-card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";
import { headT } from "@/lib/i18n/head";
import { fetchFeed, type FeedPick, type FeedSort } from "@/lib/pick-data";

const PAGE = 20;

export const Route = createFileRoute("/community")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "community");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/community" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.title") },
        { property: "og:description", content: t("meta.ogDescription") },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: t("ld.name"),
            description: t("ld.description"),
            url: "https://puntr.co.za/community",
            isPartOf: ¶»§q«^