import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { readConsent, writeConsent } from "@/lib/consent";
import { toast } from "sonner";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/cookies" }],
    meta: [
      { title: "Cookie Preferences | Puntr" },
      {
        name: "description",
        content:
          "Manage your cookie preferences on Puntr. Learn about the cookies we use and how to control them.",
      },
      { property: "og:title", content: "Cookie Preferences | Puntr" },
      {
        property: "og:description",
        content: "Manage how Puntr uses cookies to improve your experience.",
      },
    ],
  }),
  component: Cookies,
});

function Cookies() {
  const [analytics, setAnalytics] = useState(false);
  const [affiliate, setAffiliate] = useState(false);

  useEffect(() => {
    const c = readConsent();
    if (c) {
      setAnalytics(c.analytics);
      setAffiliate(c.affiliate_tracking);
    }
  }, []);

  const save = (a: boolean, f: boolean) => {
    setAnalytics(a);
    setAffiliate(f);
    writeConsent({ analytics: a, affiliate_tracking: f });
    toast.success("Privacy choices saved");
  };

  return (
    <AppShell>
      <PageHeading
        title="Privacy choices"
        subtitle="Cookies and tracking on Puntr. Everything optional is off unless you turn it on."
      />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <section>
          <h2 className="font-display text-lg font-bold">Essential (always on)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Puntr cannot work without these. They are set only to run features you use, not to track
            you.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              Your sign-in session, kept in your browser&apos;s storage while you are signed in (and
              cleared when you sign out).
            </li>
            <li>
              Cookie <code>puntr_consent</code> (180 days): remembers your choices on this page.
            </li>
            <li>
              Cookie <code>puntr_lang</code> (1 year): remembers the language you pick.
            </li>
            <li>
              Browser storage <code>puntr:ref</code>: the invite code from a link you opened, kept
              until you finish signing up.
            </li>
            <li>
              Browser storage <code>puntr:security-prompt</code>: remembers that you dismissed the
              account security reminder (3 days).
            </li>
            <li>
              Browser session storage <code>puntr:claim:…</code>: stops the same one-off
              Founding-spot check from running twice in a visit.
            </li>
          </ul>
        </section>
        <Separator />
        <section className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="analytics" className="font-display text-lg font-bold">
              Analytics
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Counts page views and button use so we can improve Puntr. Not used for advertising.
            </p>
          </div>
          <Switch id="analytics" checked={analytics} onCheckedChange={setAnalytics} />
        </section>
        <section className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="affiliate" className="font-display text-lg font-bold">
              Affiliate tracking
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Lets a partner know a visit came from Puntr if you click a labelled ad. No personal
              information is put in partner links.
            </p>
          </div>
          <Switch id="affiliate" checked={affiliate} onCheckedChange={setAffiliate} />
        </section>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => save(false, false)}>
            Reject all
          </Button>
          <Button variant="outline" onClick={() => save(true, true)}>
            Accept all
          </Button>
          <Button onClick={() => save(analytics, affiliate)}>Save choices</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          You must be 18+ to use Puntr. Gambling helpline: 0800 006 008.
        </p>
      </div>
    </AppShell>
  );
}
