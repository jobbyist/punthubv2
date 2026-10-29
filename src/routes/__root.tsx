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
import { ConsentBanner } from "@/components/consent-banner";
import { Toaster } from "@/components/ui/sonner";
import { AuthPrompt } from "@/components/auth-prompt";
import { LocaleProvider } from "@/lib/i18n/provider";
import { detectLocale, detectLocaleOnClient } from "@/lib/i18n/locale";
import { DEFAULT_LOCALE, type LocaleCode } from "@/locales/config";
import { useTranslation } from "react-i18next";
import { headT } from "@/lib/i18n/head";

function NotFoundComponent() {
  const { t } = useTranslation("errors");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("notFound.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFound.body")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("notFound.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const { t } = useTranslation("errors");
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("generic.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("generic.body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("generic.retry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("notFound.home")}
          </a>
        </div>
      </div>
    </div>
  );
}

let clientLocale: LocaleCode | undefined;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Profile language, then cookie, then Accept-Language. The profile layer arrives with accounts (P6).
  beforeLoad: async (): Promise<{ locale: LocaleCode }> => {
    if (typeof document !== "undefined") {
      clientLocale ??= detectLocaleOnClient();
      return { locale: clientLocale };
    }
    return { locale: await detectLocale() };
  },
  head: ({ match }) => {
    const t = headT(match.context.locale, "common");
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { name: "author", content: "Puntr" },
        {
          name: "robots",
          content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },
        { name: "googlebot", content: "index, follow" },
        { name: "geo.region", content: "ZA" },
        { name: "geo.placename", content: "South Africa" },
        { name: "language", content: match.context.locale },
        { name: "theme-color", content: "#16A34A" },
        { property: "og:title", content: t("meta.title") },
        { property: "og:description", content: t("meta.ogDescription") },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://puntr.co.za" },
        { property: "og:site_name", content: "Puntr" },
        {
          property: "og:locale",
          content:
            match.context.locale === "en-ZA" ? "en_ZA" : match.context.locale.replace("-", "_"),
        },
        { property: "og:image", content: "https://puntr.co.za/puntrlogo.png" },
        { property: "og:image:alt", content: t("meta.ogImageAlt") },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@puntr_za" },
        { name: "twitter:creator", content: "@puntr_za" },
        { name: "twitter:title", content: t("meta.title") },
        { name: "twitter:description", content: t("meta.ogDescription") },
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
                inLanguage: match.context.locale,
                description: t("meta.orgDescription"),
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
                    email: "support@puntr.co.za",
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
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const locale = Route.useRouteContext({ select: (c) => c.locale }) ?? DEFAULT_LOCALE;
  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        {/* The provider sits in the shell so the 404 and error screens are translated too. */}
        <LocaleProvider initial={locale}>{children}</LocaleProvider>
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
        <ConsentBanner />
        <Toaster />
      </SessionProvider>
    </QueryClientProvider>
  );
}
