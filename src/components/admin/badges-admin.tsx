import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAsync } from "@/hooks/use-async";
import {
  adminBadgeOverview,
  adminRejectBadge,
  adminRunBadges,
  adminSetBadge,
  type BadgeRow,
} from "@/lib/badges.functions";
import { formatDateTime } from "@/lib/format";

/** Team badges: every team in fixtures must carry its real badge before its fixtures are listed. */
export function TeamBadgesPanel() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data, loading } = useAsync(() => adminBadgeOverview(), [tick]);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const r = await adminRunBadges();
      if (r.ok)
        toast.success(t("badges.ran", { verified: r.verified, failed: r.failed, due: r.due }));
      else toast.error(r.message);
      setTick((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  const missing = (data ?? []).filter((r) => r.status !== "verified").length;

  return (
    <section className="card-surface p-5">
      <h2 className="text-lg">{t("badges.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("badges.body")}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Parallel searches and verifies badges first. Add a manual image URL only ¶»§q«^