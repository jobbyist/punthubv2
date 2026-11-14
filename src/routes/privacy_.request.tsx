import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { submitForm } from "@/lib/forms.functions";
import { LegalTranslationNotice } from "@/components/legal-translation-notice";
import { privacyRequestAf, privacyRequestEn } from "@/content/legal/af/privacy-request";
import { useLocale } from "@/lib/i18n/provider";

export const Route = createFileRoute("/privacy_/request")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/privacy/request" }],
    meta: [
      { title: "Privacy request | Puntr" },
      { name: "description", content: "Ask to see, correct or delete your personal information." },
    ],
  }),
  component: PrivacyRequest,
});

function PrivacyRequest() {
  const { locale } = useLocale();
  const c = locale === "af" ? privacyRequestAf : privacyRequestEn;
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState("access");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("submit_privacy_request", {
      p_email: email,
      p_kind: kind,
      p_details: details,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message === "too_many_requests" ? c.tooMany : c.failed);
      return;
    }
    // Tell support@puntr.co.za a request arrived (type and address only; the details stay in the database).
    void submitForm({
      data: { form: "privacy_request", email, meta: { type: kind } },
    }).catch(() => undefined);
    setDone(true);
  };

  return (
    <AppShell>
      <PageHeading art="shield" title={c.title} subtitle={c.subtitle} />
      {locale === "af" && <LegalTranslationNotice />}
      <div className="card-surface max-w-xl p-6">
        {done ? (
          <p className="text-sm">{c.done(email)}</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="pr-email">{c.email}</Label>
              <Input
                id="pr-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pr-kind">{c.kind}</Label>
              <select
                id="pr-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="mt-1 w-full border border-input bg-background px-3 py-2 text-sm"
              >
                {c.kinds.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="pr-details">{c.details}</Label>
              <textarea
                id="pr-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={1000}
                className="mt-1 w-full border border-input bg-background px-3 py-2 text-sm"
                rows={4}
              />
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? c.sending : c.send}
            </Button>
          </form>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{c.fine}</p>
      </div>
    </AppShell>
  );
}
