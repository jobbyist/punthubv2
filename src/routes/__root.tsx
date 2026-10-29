import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SessionProvider } from "@/components/session";
import { EarlyAccessModal } from "@/components/early-access-modal";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PuntAI } from "@/components/punt-ai";
import { SHOW_PUNT_AI_CHAT } from "@/lib/flags";
import { Toaster } from "@/components/ui/sonner";
import { AuthPrompt } from "@/components/auth-prompt";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Puntr - Predict smarter. Prove it." },
      {
        name: "description",
        content:
          "Locked, auto-graded, public tipster records for PSL, EPL, UCL, URC and Springbok tests. Predict smarter. Prove it. 18+.",
      },
      { name: "author", content: "Puntr" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "googlebot", content: "index, follow" },
      { name: "geo.region", content: "ZA" },
      { name: "geo.placename", content: "South Africa" },
      { name: "language", content: "en-ZA" },
      { name: "theme-color", content: "#16A34A" },
      { property: "og:title", content: "Puntr - Predict smarter. Prove it." },
      {
        property: "og:description",
        content:
          "Every pick is locked at kick-off, graded automatically and kept forever. Build a record people can trust. 18+.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://puntr.co.za" },
      { property: "og:site_name", content: "Puntr" },
      { property: "og:locale", content: "en_ZA" },
      { property: "og:image", content: "https://puntr.co.za/puntrlogo.png" },
      { property: "og:image:alt", content: "Puntr - locked, public tipster records" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@puntr_za" },
      { name: "twitter:creator", content: "@puntr_za" },
      { name: "twitter:title", content: "Puntr - Predict smarter. Prove it." },
      {
        name: "twitter:description",
        content:
          "Every pick is locked at kick-off, graded automatically and kept forever. Build a record people can trust. 18+.",
      },
      { name: "twitter:image", content: "https://puntr.co.za/puntrlogo.png" },
    ],
    links: [
      {
        rel: "icon",
        href: "/puntrlogorounded.png",
      },
      {
        rel: "apple-touch-icon",
        href: "/puntrlogorounded.png",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "sitemap", type: "application/xml", href: "https://puntr.co.za/sitemap.xml" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": "https://puntr.co.za/#website",
              name: "Puntr",
              alternateName: ["Puntr SA", "Puntr South Africa"],
              url: "https://puntr.co.za/",
              inLanguage: "en-ZA",
              description:
                "Locked, auto-graded, public tipster records for South African sport. 18+.",
              publisher: { "@id": "https://puntr.co.za/#organization" },
              potentialAction: {
                "@type": "SearchAction",
                target: "https://puntr.co.za/predictions?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "Organization",
              "@id": "https://puntr.co.za/#organization",
              name: "Puntr",
              legalName: "Puntr",
              url: "https://puntr.co.za/",
              logo: {
                "@type": "ImageObject",
                url: "https://puntr.co.za/puntrlogo.png",
              },
              sameAs: [
                "https://x.com/puntr_za",
                "https://facebook.com/puntrza",
                "https://www.instagram.com/puntr_za",
              ],
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  contactType: "customer support",
                  telephone: "+27128806560",
                  email: "support@punthub.fun",
                  areaServed: "ZA",
                  availableLanguage: ["en", "en-ZA"],
                },
                {
                  "@type": "ContactPoint",
                  contactType: "responsible gambling helpline",
                  telephone: "0800-006-008",
                  areaServed: "ZA",
                  availableLanguage: ["en"],
                },
              ],
              areaServed: {
                "@type": "Country",
                name: "South Africa",
              },
            },
            {
              "@type": "WebApplication",
              name: "Puntr",
              url: "https://puntr.co.za/",
              applicationCategory: "SportsApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "ZAR",
                description: "Free during the Founding 100 launch",
              },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <div className="flex-1 pb-20 lg:pb-0">
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </div>
          <SiteFooter />
        </div>
        <MobileNav />
        {SHOW_PUNT_AI_CHAT && <PuntAI />}
        <AuthPrompt />
        <EarlyAccessModal />
        <Toaster />
      </SessionProvider>
    </QueryClientProvider>
  );
}
