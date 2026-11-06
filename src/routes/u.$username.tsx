import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { PickCard } from "@/components/pick-card";
import { ReferralCard } from "@/components/referral-card";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useAsync } from "@/hooks/use-async";
import { formatDate, formatUnits, pct } from "@/lib/format";
import { fetchFeed, type FeedPick } from "@/lib/pick-data";
import { fetchPublicProfile, fetchTipsterStats } from "@/lib/records";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    links: [{ rel: "canonical", href: `https://puntr.co.za/u/${params.username}` }],
    meta: [{ title: `${params.username} | Puntr` }],
  }),
  component: PublicProfile,
});

const PAGE = 20;
const CHIP: Record<string, string> = {
  W: "bg-primary-soft text-primary",
  L: "bg-destructive/10 text-destructive",
  V: "bg-muted text-muted-foreground",
};

/** A member's public record: stats, form and every pick. Nothing here can be edited or removed. */
function PublicProfile() {
  const { t } = useTranslation("account");
  const { username } = Route.useParams();
  const { profile: me } = useSession();
  const {
    data: profile,
    failed,
    loading,
  } = useAsync(() => fetchPublicProfile(username), [username]);
  const userId = ¶»§q«^