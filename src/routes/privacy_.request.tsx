import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

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

const KINDS: [string, string][] = [
  ["access", "Send me a copy of my information"],
  ["correction", "Correct my information"],
  ["deletion", "Delete my information"],
  ["objection", "Stop using my information for something"],
  ["complaint", "I have a complaint"],
];

function PrivacyRequest() {
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
      toast.error(
        error.message === "too_many_requests"
          ? "Too many requests today. Please try again tomorrow."
          : "Could not send your request. Check the email address and try again.",
      );
      return;
    }
    setDone(true);
  };

  return (
    <AppShell>
      <PageHeading title="Privacy request" subtitle="We aim to reply within 30 days." />
      <div className="card-surface max-w-xl p-6">
        {done ? (
          <p className="text-sm">
            Request received. We will reply to {email}. For anything urgent write to
            privacy@puntr.co.za.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="pr-email">Email you used with Puntr</Label>
              <Input
                id="pr-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pr-kind">What do you need?</Label>
              <select
                id="pr-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="mt-1 w-full border border-input bg-background px-3 py-2 text-sm"
              >
                {KINDS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="pr-details">Details (optional)</Label>
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
              {busy ? "Sending…" : "Send request"}
            </Button>
          </form>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          18+ only. Gambling helpline: 0800 006 008.
        </p>
      </div>
    </AppShell>
  );
}
