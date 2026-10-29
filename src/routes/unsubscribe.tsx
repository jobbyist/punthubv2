import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AccountPage } from "@/components/account-gate";
import { Button } from "@/components/ui/button";
import { unsubscribeWaitlist, type UnsubscribeResult } from "@/lib/waitlist.functions";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (search: Record<string, unknown>): { e?: string; t?: string } => ({
    ...(typeof search["e"] === "string" ? { e: search["e"].slice(0, 254) } : {}),
    ...(typeof search["t"] === "string" ? { t: search["t"].slice(0, 128) } : {}),
  }),
  head: () => ({
    meta: [{ title: "Unsubscribe | Puntr" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Unsubscribe,
});

/** Asks for one click, so an email scanner that opens the link cannot unsubscribe anyone by accident. */
function Unsubscribe() {
  const { t } = useTranslation("account");
  const { e, t: token } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UnsubscribeResult | null>(null);

  const confirm = async () => {
    if (!e || !token) return setResult({ ok: false, code: "invalid" });
    setBusy(true);
    const out = await unsubscribeWaitlist({ data: { email: e, token } }).catch(
      (): UnsubscribeResult => ({ ok: false, code: "error" }),
    );
    setBusy(false);
    setResult(out);
  };

  return (
    <AccountPage>
      <h1 className="text-3xl">{t("unsubscribe.title")}</h1>
      {result?.ok ? (
        <p role="status" className="mt-4 text-sm">
          {t("unsubscribe.done")}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            {e ? t("unsubscribe.body", { email: e }) : t("unsubscribe.missing")}
          </p>
          {result && !result.ok && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {t(`unsubscribe.error.${result.code}`)}
            </p>
          )}
          <Button className="mt-5" disabled={busy || !e || !token} onClick={() => void confirm()}>
            {t("unsubscribe.confirm")}
          </Button>
        </>
      )}
      <p className="mt-6 text-xs text-muted-foreground">
        <Link to="/privacy" className="underline">
          {t("unsubscribe.privacy")}
        </Link>
      </p>
    </AccountPage>
  );
}
