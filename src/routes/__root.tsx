import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";

import appCss from "../styles.css?url";
import { SessionProvider } from "@/components/session";
import { FoundingBar } from "@/components/founding-bar";
import { SiteHeader } from "@/components/layout/site-header";
import { AdminNotch } from "@/components/admin-notch";
import { SecurityPrompt } from "@/components/security-prompt";
import { MfaGate } from "@/components/mfa-gate";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PuntAI } from "@/components/punt-ai";
import { SHOW_PUNT_AI_CHAT } from "@/lib/flags";
import { ConsentBanner } from "@/components/consent-banner";
import { captureUtm } from "@/lib/campaign";
import { Toaster } from "@/components/ui/sonner";
import { Preloader } from "@/components/motion/preloader";
import { PwaExperience } from "@/components/pwa-experience";
import { PushNotificationPrompt } from "@/components/push-notification-prompt";
import { AuthReturnTracker } from "@/components/auth-return-tracker";
import { RouteProgress } from "@/components/motion/route-progress";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { LocaleProvider } from "@/lib/i18n/provider";
import { detectLocale, detectLocaleOnClient } fr¶»§q«^