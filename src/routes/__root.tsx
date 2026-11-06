import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { SessionProvider } from "@/components/session";
import { FoundingBar } from "@/components/founding-bar";
import { SiteHeader } from "@/components/layout/site-header";
import { SecurityPrompt } from "@/components/security-prompt";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PuntAI } from "@/components/punt-ai";
import { SHOW_PUNT_AI_CHAT } from "@/lib/flags";
import { ConsentBanner } from "@/components/consent-banner";
import { Toaster } from "@/components/ui/sonner";
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
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("notFound.t¶»§q«^