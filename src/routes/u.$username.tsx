import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    links: [{ rel: "canonical", href: `https://puntr.co.za/u/${params.username}` }],
    meta: [{ title: `${params.username} | Puntr` }],
  }),
  component: PublicProfile,
});

type Row = { username: string | null; founding_number: number | null; created_at: string | null };

/** Minimal public profile. The record, history and form chips arrive with settlement (P9). */
function PublicProfile() {
  const { t } = useTranslation("account");
  const { username } = Route.useParams();
  const [row, setRow] = useState<Row | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    supabase
      .from("public_profiles")
      .select("username, founding_number, created_at")
      .eq("username", username.toLowerCase())
      .maybeSingle()
      .then(({ data }) => {
        if (active) setRow(data ?? null);
      });
    return () => {
      active = false;
    };
  }, [username]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {row === undefined ? null : row === null ? (
        <>
          <p className="text-sm text-muted-foreground">{t("record.notFound")}</p>
          <Link to="/" className="mt-3 inline-block text-sm underline">
            ←
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-3xl">{row.username}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {row.founding_number
              ? t("record.founding", { number: row.founding_number })
              : t("record.member")}
            {row.created_at && ` · ${t("record.joined", { date: formatDate(row.created_at) })}`}
          </p>
          <p className="card-surface mt-6 p-5 text-sm">{t("record.soon")}</p>
          <p className="mt-4 text-xs text-muted-foreground">{t("record.note")}</p>
        </>
      )}
    </div>
  );
}
