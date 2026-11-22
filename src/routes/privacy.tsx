import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { PrivacyAf } from "@/content/legal/af/privacy";
import { useLocale } from "@/lib/i18n/provider";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/privacy" }],
    meta: [
      { title: "Privacy Policy | Puntr" },
      {
        name: "description",
        content:
          "How Puntr collects, uses and protects your personal information under POPIA, in plain English.",
      },
      { property: "og:title", content: "Privacy Policy | Puntr" },
      {
        property: "og:description",
        content: "What we collect, why, how long we keep it, and your rights.",
      },
    ],
  }),
  component: Privacy,
});

const PURPOSES: [string, string, string, string][] = [
  [
    "Early-access list",
    "Name, email, optional phone, chosen plan, whether you opted in to marketing, and a held Founding spot",
    "Your request (consent)",
    "Until you sign up, unsubscribe or ask us to delete it [attorney review]",
  ],
  [
    "Launch messages",
    "Email address, and phone number if you gave one and opted in",
    "Your request; marketing consent for reminders",
    "Until you unsubscribe or ask us to delete it",
  ],
  [
    "Running your account",
    "Email (from your email or Google sign-in), a one-way hash of your password if you set one, username, dis¶»§q«^