import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RgNotice } from "@/components/rg-notice";
import { ReferralCard } from "@/components/referral-card";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { AccountPage } from "@/components/account-gate";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, points } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { affordability, needsGamblingLabels, redeemErrorKey, ruleLimit } from "@/lib/rewards";
import {
  fetchBalance,
  fetchHistory,
  fetchRedemptions,
  fetchRewards,
  fetchRewardsStatus,
  fetchRules,
  notifyPointsChanged,
} from "@/lib/rewards-data";

export const Route = createFileRoute("/rewards")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "rewards");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/rewards" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.title") },
        { property: "og:description", content: t("meta.description") },
      ],
    };
  },
  component: Rewards,
});

function Earn() {
  const { t } = useTranslation("rewards");
  const { data } = useA¶»§q«^