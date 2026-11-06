import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { isPickId, verifyPick, type VerifyResult } from "@/lib/verify";

export const Route = createFileRoute("/verify")({
  validateSearch: (search: Record<string, unknown>): { id?: string } =>
    typeof search["id"] === "string" && search["id"] ? { id: search["id"].slice(0, 64) } : {},
  head: ({ match }) => {
    const t = headT(match.context.locale, "verify");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/verify" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.description") },
      ],
    };
  },
  component: Verify,
});

const PICK_COLUMNS =
  "id, seq, prev_hash, hash, user_id, fixture_id, market, selection, line, odds, created_at";

type Outcome =
  | { state: "idle" }
  | { state: "working" }
 ¶»§q«^