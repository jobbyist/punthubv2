import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { readConsent, writeConsent } from "@/lib/consent";
import { supabase } from "@/integrations/supabase/client";
import { setPfieLearningConsent } from "@/lib/pfie-learning.functions";
import { toast } from "sonner";

import { CookiesAf } from "@/content/legal/af/cookies";
import { useLocale } from "@/lib/i18n/provider";

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
  const { locale } = useLocale();
  const [analytics, setAnalytics] = useState(false);
  const [affiliate, setAffiliate] = useState(false);
  const [pfieLearning, setPfieLearning] = useState(false);

  useEffect(() => {
    const c = readConsent();
    if (c) {
      setAnalytics(c.analytics);
      setAffiliate(c.affiliate_tracking);
      setPfieLearning(c.pfie_learning);
    }
  }, []);

  const save = async (a: boolean, f: boolean, p: boolean) => {
    setAnalytics(a);
    setAffiliate(f);
    setPfieLearning(p);
    const { data: session } = await supabase.auth.getSession();
    if (session.session) {
      try {
        await setPfieLearningConsent({ data: { granted: p } });
      } catch {
        toast.error(
          locale === "af"
            ? "Kon nie PFIE-leertoestemming stoor nie"
            : "Could not save the PFIE learning choice",
        );
        return;
      }
    }
    writeConsent({ analytics: a, affiliate_tracking: f, pfie_learning: p });
    toast.success(locale === "af" ? "Privaatheidskeuses gestoor" : "Privacy choices saved");
  };

  if (locale === "af") {
    return (
      <CookiesAf
        analytics={analytics}
        affiliate={affiliate}
        pfieLearning={pfieLearning}
        setAnalytics={setAnalytics}
        setAffiliate={setAffiliate}
        setPfieLearning={setPfieLearning}
        save={save}
      />
    );
  }

  return (
    <AppShell>
      <PageHeading
        art="shield"
        title="Privacy choices"
        subtitle="Cookies and tracking on Puntr. Everything optional is off unless you turn it on."
      />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Puntr South Africa is operated by Gravitas Industries (Pty) Ltd (CK No.: 2024/596436/07),
          a company registered in South Africa.
        </p>
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
              Cookie <code>puntr_lang_preview</code> (30 days): set only when a Puntr admin previews
              a language that is still being reviewed, so the preview survives a page reload.
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
              Browser storage <code>puntr:context:v1</code>: remembers on this device how many times
              you have visited, the last few Puntr pages and match you opened, and tips you hid, so
              Discover and the homepage can show the next step that fits you. It never leaves your
              browser.
            </li>
            <li>
              Browser storage <code>puntr:has-account</code>: remembers that someone has signed in
              on this device, so the sign-in form opens first.
            </li>
            <li>
              Browser storage <code>puntr:search:recent</code>: your last six searches on this
              device, shown when you open search. Clear them from the search window.
            </li>
            <li>
              Browser session storage <code>puntr:claim:…</code>: stops the same one-off
              Founding-spot check from running twice in a visit.
            </li>
            <li>
              Browser session storage <code>puntr:affiliate-age-confirmed</code>: remembers for this
              visit that you confirmed you are 18+, so sponsored partner offers can be shown.
            </li>
            <li>
              Browser session storage <code>puntr:ads:overlay</code>: counts pages viewed in this
              visit so a full-screen advertisement appears rarely (at most three times a visit, at
              least three minutes apart) and never on sign-up, payment, help or legal pages. It is
              cleared when you close the tab. Puntr Pro members see no advertisements.
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
        <section className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="pfie-learning" className="font-display text-lg font-bold">
              PFIE learning (optional)
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Lets Puntr use pseudonymous feature engagement and published pick actions to improve
              PFIE sporting intelligence. Separate from analytics; off unless you opt in. You can
              withdraw in Account privacy.
            </p>
          </div>
          <Switch id="pfie-learning" checked={pfieLearning} onCheckedChange={setPfieLearning} />
        </section>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => void save(false, false, false)}>
            Reject all
          </Button>
          <Button variant="outline" onClick={() => void save(true, true, true)}>
            Accept all
          </Button>
          <Button onClick={() => void save(analytics, affiliate, pfieLearning)}>
            Save choices
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          You must be 18+ to use Puntr. Gambling helpline: 0800 006 008.
        </p>
      </div>
    </AppShell>
  );
}
