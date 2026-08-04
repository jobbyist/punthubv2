import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Preferences | Puntr" },
      {
        name: "description",
        content:
          "Manage your cookie preferences on Puntr. Learn about the cookies we use and how to control them.",
      },
      { property: "og:title", content: "Cookie Preferences | Puntr" },
      { property: "og:description", content: "Manage how Puntr uses cookies to improve your experience." },
    ],
  }),
  component: Cookies,
});

function Cookies() {
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);
  const [functional, setFunctional] = useState(true);

  const handleSavePreferences = () => {
    // In a real implementation, this would save preferences to localStorage or backend
    toast.success("Cookie preferences saved", {
      description: "Your cookie preferences have been updated successfully.",
    });
  };

  const handleAcceptAll = () => {
    setAnalytics(true);
    setMarketing(true);
    setFunctional(true);
    toast.success("All cookies accepted", {
      description: "You've enabled all cookie types for the best experience.",
    });
  };

  const handleRejectOptional = () => {
    setAnalytics(false);
    setMarketing(false);
    setFunctional(true);
    toast.success("Optional cookies rejected", {
      description: "Only essential and functional cookies are enabled.",
    });
  };

  return (
    <AppShell>
      <PageHeading
        title="Cookie Preferences"
        subtitle="Manage how we use cookies to enhance your experience on Puntr."
      />

      <div className="card-surface p-6 sm:p-8">
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-muted-foreground">
            <strong>Last Updated:</strong> 1 January 2025
          </p>

          <Separator className="my-6" />

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">What Are Cookies?</h2>
            <p className="leading-relaxed text-muted-foreground">
              Cookies are small text files that are placed on your device when you visit a website. They help us
              provide you with a better experience by remembering your preferences, analyzing how you use our Service,
              and delivering relevant content.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">How We Use Cookies</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Puntr uses different types of cookies for various purposes:
            </p>
          </section>

          <section className="mb-6">
            <div className="rounded-lg border border-border p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Essential Cookies</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    These cookies are necessary for the website to function properly. They enable core functionality
                    such as security, network management, and accessibility. You cannot opt out of these cookies.
                  </p>
                  <ul className="mt-3 ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                    <li>Authentication and session management</li>
                    <li>Security and fraud prevention</li>
                    <li>Load balancing</li>
                    <li>Basic website functionality</li>
                  </ul>
                </div>
                <div className="ml-4 flex items-center">
                  <span className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium">Always Active</span>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <div className="rounded-lg border border-border p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Functional Cookies</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    These cookies enable enhanced functionality and personalization, such as remembering your
                    preferences and settings.
                  </p>
                  <ul className="mt-3 ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                    <li>Remember your login details</li>
                    <li>Save your language and region preferences</li>
                    <li>Remember your cookie preferences</li>
                    <li>Personalize content based on your activity</li>
                  </ul>
                </div>
                <div className="ml-4 flex items-center">
                  <Switch id="functional" checked={functional} onCheckedChange={setFunctional} />
                  <Label htmlFor="functional" className="sr-only">
                    Enable functional cookies
                  </Label>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <div className="rounded-lg border border-border p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Analytics Cookies</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    These cookies help us understand how visitors interact with our website by collecting and reporting
                    information anonymously.
                  </p>
                  <ul className="mt-3 ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                    <li>Track pages visited and features used</li>
                    <li>Measure website performance</li>
                    <li>Understand user behavior patterns</li>
                    <li>Improve our Service based on usage data</li>
                  </ul>
                </div>
                <div className="ml-4 flex items-center">
                  <Switch id="analytics" checked={analytics} onCheckedChange={setAnalytics} />
                  <Label htmlFor="analytics" className="sr-only">
                    Enable analytics cookies
                  </Label>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <div className="rounded-lg border border-border p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Marketing Cookies</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    These cookies track your online activity to help us deliver more relevant advertising and measure
                    campaign effectiveness.
                  </p>
                  <ul className="mt-3 ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                    <li>Show personalized ads and promotions</li>
                    <li>Track conversion from marketing campaigns</li>
                    <li>Prevent showing the same ad repeatedly</li>
                    <li>Measure ad performance and engagement</li>
                  </ul>
                </div>
                <div className="ml-4 flex items-center">
                  <Switch id="marketing" checked={marketing} onCheckedChange={setMarketing} />
                  <Label htmlFor="marketing" className="sr-only">
                    Enable marketing cookies
                  </Label>
                </div>
              </div>
            </div>
          </section>

          <Separator className="my-6" />

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">Managing Your Cookie Preferences</h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              You can manage your cookie preferences at any time using the controls above. You can also control cookies
              through your browser settings. Note that disabling certain cookies may affect the functionality of the
              website.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSavePreferences}>Save Preferences</Button>
              <Button variant="outline" onClick={handleAcceptAll}>
                Accept All
              </Button>
              <Button variant="outline" onClick={handleRejectOptional}>
                Reject Optional
              </Button>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">Third-Party Cookies</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Some of our pages may contain content from third-party services (such as embedded videos, social media
              widgets, or affiliate platforms). These third parties may set their own cookies. We do not control these
              cookies, and you should check the relevant third-party websites for more information.
            </p>
            <p className="leading-relaxed text-muted-foreground">Third-party services we use include:</p>
            <ul className="mt-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Partner bookmakers and betting platforms</li>
              <li>Analytics providers (e.g., for usage statistics)</li>
              <li>Social media platforms (e.g., for sharing features)</li>
              <li>Payment processors</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">Browser Controls</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Most web browsers allow you to control cookies through their settings. You can:
            </p>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>View and delete cookies stored on your device</li>
              <li>Block cookies from all or specific websites</li>
              <li>Clear all cookies when you close your browser</li>
              <li>Enable "Do Not Track" mode</li>
            </ul>
            <p className="leading-relaxed text-muted-foreground">
              Please note that blocking or deleting cookies may impact your experience on Puntr and prevent certain
              features from working properly.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">Contact Us</h2>
            <p className="leading-relaxed text-muted-foreground">
              If you have questions about our use of cookies, please contact us at:{" "}
              <a href="mailto:privacy@punthub.fun" className="font-semibold text-primary">
                privacy@punthub.fun
              </a>
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
