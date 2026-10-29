import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AccountPage, RequireMember } from "@/components/account-gate";
import { useSession } from "@/components/session";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/accounts.functions";
import { openConsentBanner } from "@/lib/consent";
import { formatDate } from "@/lib/format";
import { headT } from "@/lib/i18n/head";

export const Route = createFileRoute("/account/privacy")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "account");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/account/privacy" }],
      meta: [
        { title: t("meta.privacyTitle") },
        { name: "description", content: t("meta.description") },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: AccountPrivacy,
});

type MarketingPurpose = "marketing_email" | "marketing_whatsapp";

function AccountPrivacy() {
  const { t } = useTranslation("account");
  return (
    <RequireMember>
      {(profile) => (
        <AccountPage>
          <h1 className="text-3xl">{t("privacy.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Trans
              t={t}
              i18nKey="privacy.subtitle"
              components={{ 1: <Link to="/privacy" className="underline" /> }}
            />
          </p>
          <ExportSection />
          <MarketingSection userId={profile.id} />
          <TrackingSection />
          <RequestSection />
          <DeleteSection />
        </AccountPage>
      )}
    </RequireMember>
  );
}

function Section({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="card-surface mt-6 p-5">
      <h2 className="text-lg">{title}</h2>
      {body && <p className="mt-1 text-sm text-muted-foreground">{body}</p>}
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

function ExportSection() {
  const { t } = useTranslation("account");
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("export_my_data");
    setBusy(false);
    if (error || !data) return void toast.error(t("privacy.export.error"));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `puntr-my-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Section title={t("privacy.export.title")} body={t("privacy.export.body")}>
      <Button variant="outline" onClick={() => void download()} disabled={busy}>
        {busy ? t("privacy.export.working") : t("privacy.export.cta")}
      </Button>
    </Section>
  );
}

function MarketingSection({ userId }: { userId: string }) {
  const { t } = useTranslation("account");
  const { refreshProfile } = useSession();
  const [state, setState] = useState<Record<MarketingPurpose, boolean>>({
    marketing_email: false,
    marketing_whatsapp: false,
  });
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: consents }, { data: notice }] = await Promise.all([
        supabase.from("current_consents").select("purpose, granted").eq("user_id", userId),
        supabase
          .from("notice_versions")
          .select("version")
          .eq("kind", "marketing")
          .order("effective_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!active) return;
      setVersion(notice?.version ?? null);
      setState((s) => {
        const next = { ...s };
        for (const c of consents ?? []) {
          if (c.purpose === "marketing_email" || c.purpose === "marketing_whatsapp") {
            next[c.purpose] = c.granted === true;
          }
        }
        return next;
      });
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const change = async (purpose: MarketingPurpose, granted: boolean) => {
    if (!version) return;
    const previous = state[purpose];
    setState((s) => ({ ...s, [purpose]: granted }));
    const { error } = await supabase.rpc("record_consent", {
      p_purpose: purpose,
      p_granted: granted,
      p_notice_version: version,
      p_source: "account",
    });
    if (!error && purpose === "marketing_email") {
      await supabase.from("profiles").update({ marketing_opt_in: granted }).eq("id", userId);
      await refreshProfile();
    }
    if (error) {
      setState((s) => ({ ...s, [purpose]: previous }));
      toast.error(t("privacy.marketing.error"));
    } else {
      toast.success(t("privacy.marketing.saved"));
    }
  };

  return (
    <Section title={t("privacy.marketing.title")} body={t("privacy.marketing.body")}>
      <div className="space-y-3">
        {(
          [
            ["marketing_email", "privacy.marketing.email"],
            ["marketing_whatsapp", "privacy.marketing.whatsapp"],
          ] as const
        ).map(([purpose, key]) => (
          <div key={purpose} className="flex items-start gap-3">
            <Checkbox
              id={`m-${purpose}`}
              checked={state[purpose]}
              disabled={!version}
              onCheckedChange={(v) => void change(purpose, v === true)}
            />
            <Label htmlFor={`m-${purpose}`} className="text-sm font-normal leading-snug">
              {t(key)}
            </Label>
          </div>
        ))}
      </div>
    </Section>
  );
}

function TrackingSection() {
  const { t } = useTranslation("account");
  return (
    <Section title={t("privacy.tracking.title")} body={t("privacy.tracking.body")}>
      <Button variant="outline" onClick={openConsentBanner}>
        {t("privacy.tracking.cta")}
      </Button>
    </Section>
  );
}

function RequestSection() {
  const { t } = useTranslation("account");
  return (
    <Section title={t("privacy.request.title")} body={t("privacy.request.body")}>
      <Button asChild variant="outline">
        <Link to="/privacy/request">{t("privacy.request.cta")}</Link>
      </Button>
    </Section>
  );
}

function DeleteSection() {
  const { t } = useTranslation("account");
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const word = t("privacy.delete.confirmWord");

  const remove = async () => {
    setBusy(true);
    const result = await deleteMyAccount().catch(() => ({ ok: false }));
    setBusy(false);
    if (!result.ok) return void toast.error(t("privacy.delete.error"));
    await supabase.auth.signOut({ scope: "local" });
    toast.success(t("privacy.delete.done"));
    void navigate({ to: "/" });
  };

  return (
    <Section title={t("privacy.delete.title")} body={t("privacy.delete.body")}>
      <p className="mb-4 text-sm">{t("privacy.delete.record")}</p>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        {t("privacy.delete.cta")}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("privacy.delete.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("privacy.delete.confirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label={word}
            autoComplete="off"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("privacy.delete.cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={busy || typed.trim() !== word}
              onClick={() => void remove()}
            >
              {busy ? t("privacy.delete.working") : t("privacy.delete.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
