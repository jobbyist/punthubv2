import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { checkIdDocument, idDocumentPath } from "@/lib/identity";
import { submitIdentityDocument } from "@/lib/identity.functions";

type Row = {
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  reject_reason: string | null;
} | null;

// identity_verifications is new: read through a loose view until types.ts is regenerated.
const table = () =>
  supabase.from("identity_verifications" as never) as unknown as {
    select: (c: string) => {
      eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> };
    };
  };

/** Manual identity verification (phase 1): upload an ID document for an admin to check. */
export function IdentityCard() {
  const { t } = useTranslation("account");
  const { profile } = useSession();
  const submit = useServerFn(submitIdentityDocument);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);
  const { data: row } = useAsync(async (): Promise<Row> => {
    if (!profile) return null;
    const { data } = await table()
      .select("status, submitted_at, reviewed_at, reject_reason")
      .eq("user_id", profile.id)
      .maybeSingle();
    return (data as Row) ?? null;
  }, [profile?.id, tick]);
  if (!profile) return null;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const check = checkIdDocument(file);
    if (!check.ok) {
      setNote({ text: t(`identity.${check.reason}`), error: true });
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const path = idDocumentPath(profile.id, file.type, crypto.randomUUID());
      const { error: upErr } = await supabase.storage
        .from("id-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const res = await submit({ data: { path } });
      if (!res.ok) throw new Error(res.error);
      setNote({ text: t("identity.sent"), error: false });
      setTick((n) => n + 1);
    } catch (err) {
      console.error("id upload failed", err);
      setNote({ text: t("identity.failed"), error: true });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const status = row?.status;
  const statusText =
    status === "approved"
      ? t("identity.status.approved", {
          date: formatDate(row?.reviewed_at ?? row?.submitted_at ?? ""),
        })
      : status === "pending"
        ? t("identity.status.pending", { date: formatDate(row?.submitted_at ?? "") })
        : status === "rejected"
          ? t("identity.status.rejected", { reason: row?.reject_reason || t("identity.noReason") })
          : t("identity.status.none");

  return (
    <section id="identity" className="card-surface mt-6 p-4" aria-labelledby="identity-title">
      <h2 id="identity-title" className="text-base font-semibold">
        {t("identity.title")}
      </h2>
      <p
        className={`mt-2 text-sm font-semibold ${status === "approved" ? "text-primary" : ""}`}
        aria-live="polite"
      >
        {statusText}
      </p>
      {status !== "approved" && (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{t("identity.why")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("identity.how")}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("identity.detailsHint")}</p>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            id="id-document-file"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            size="sm"
            className="mt-3"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy
              ? t("identity.working")
              : status === "pending" || status === "rejected"
                ? t("identity.replace")
                : t("identity.upload")}
          </Button>
        </>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{t("identity.privacy")}</p>
      {note && (
        <p className={`mt-2 text-sm ${note.error ? "text-destructive" : "text-primary"}`}>
          {note.text}
        </p>
      )}
    </section>
  );
}
