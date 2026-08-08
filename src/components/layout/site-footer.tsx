import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Facebook, Instagram, MessageCircle, Phone, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/brand";

const columns = [
  {
    title: "Platform",
    links: [
      ["Predictions", "/predictions"],
      ["Leaderboards", "/leaderboards"],
      ["Results", "/results"],
      ["Insights", "/insights"],
      ["Pricing", "/pricing"],
    ],
  },
  {
    title: "Community",
    links: [
      ["Community Feed", "/community"],
      ["How it works", "/how-it-works"],
      ["PuntPoints", "/leaderboards"],
      ["Support", "/support"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About Us", "/how-it-works"],
      ["About Us", "/about"],
      ["Privacy Policy", "/privacy"],
      ["Cookie Preferences", "/cookies"],
      ["Contact Us", "/support"],
    ],
  },
] as const;

export function ResponsibleGambling() {
  return (
    <section
      aria-label="Responsible gambling"
      className="mx-auto grid max-w-[1400px] gap-5 rounded-2xl border border-border bg-card px-6 py-6 shadow-soft md:grid-cols-[1.4fr_1fr] md:items-center"
    >
      <div className="flex items-start gap-4">
        <ShieldCheck className="mt-0.5 size-8 shrink-0 text-ink" strokeWidth={1.6} />
        <div>
          <h3 className="text-lg">Bet Responsibly</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Betting should be fun. Stay in control and never bet more than you can afford to lose.
          </p>
        </div>
      </div>
      <div className="md:border-l md:border-border md:pl-6">
        <p className="text-sm font-semibold">Need help?</p>
        <p className="text-xs text-muted-foreground">
          Contact the South African Responsible Gambling Foundation
        </p>
        <a href="tel:0800006008" className="mt-1.5 flex items-center gap-2 text-lg font-bold text-primary tnum">
          <Phone className="size-4" /> 0800 006 008
        </a>
      </div>
    </section>
  );
}

function XIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={props.className}>
      <path d="M18.9 2H22l-7 8 8.2 12h-6.4l-5-7.3L5.9 22H2.8l7.5-8.6L2.4 2h6.6l4.5 6.7L18.9 2Zm-1.1 18.2h1.7L7.3 3.7H5.5l12.3 16.5Z" />
    </svg>
  );
}

function YouTubeIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={props.className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function TikTokIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={props.className}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function ComingSoonBadge({ store }: { store: "apple" | "google" }) {
  return (
    <div className="flex h-12 items-center gap-2.5 rounded-lg bg-ink px-3.5 text-ink-foreground">
      {store === "apple" ? (
        <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
          <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.2 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.2-2.6 0 0-2.4-.9-2.4-3.5ZM14.2 5.8c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.9 1 .1 2-.5 2.7-1.3Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
          <path d="M3.6 2.3 13.4 12 3.6 21.7c-.4-.2-.6-.6-.6-1.1V3.4c0-.5.2-.9.6-1.1Zm11.2 10.5 2.6 2.6-9.6 5.5 7-8.1Zm0-1.6-7-8.1 9.6 5.5-2.6 2.6Zm3.9-1.6 2.4 1.4c.7.4.7 1.6 0 2l-2.4 1.4L15.9 12l2.8-2.4Z" />
        </svg>
      )}
      <span className="leading-tight">
        <span className="block text-[9px] uppercase tracking-wide opacity-80">Coming soon to</span>
        <span className="block text-[13px] font-semibold">{store === "apple" ? "the App Store" : "Google Play"}</span>
      </span>
    </div>
  );
}

export function SiteFooter() {
  const [currentDateTime, setCurrentDateTime] = useState<string>("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Africa/Johannesburg",
        dateStyle: "full",
        timeStyle: "long",
      };
      setCurrentDateTime(now.toLocaleString("en-ZA", options));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="mt-10 bg-surface">
      <div className="px-4 pb-8 sm:px-6">
        <ResponsibleGambling />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 pb-8 text-center text-xs leading-relaxed text-muted-foreground sm:px-6">
        <p>Puntr promotes responsible gambling. No persons under the age of 18 are permitted to gamble.</p>
        <p>
          National Responsible Gambling Programme Toll-Free Counselling Helpline:{" "}
          <span className="font-semibold text-foreground tnum">0800 006 008</span>
        </p>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_repeat(3,1fr)_1.2fr]">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">Predict. Earn. Win together.</p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-sm font-extrabold">{col.title}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="font-display text-sm font-extrabold">Follow us</h4>
            <div className="mt-3 flex items-center gap-3">
              <a
                href="https://twitter.com/puntr_za"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Puntr on X"
                className="text-foreground transition-colors hover:text-primary"
              >
                <XIcon className="size-5" />
              </a>
              <a
                href="https://chat.whatsapp.com/F7wPY6NrXSc7OPrqq3os7w"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Join the Puntr WhatsApp community"
                className="text-foreground transition-colors hover:text-primary"
              >
                <MessageCircle className="size-5" />
              </a>
              <a
                href="https://facebook.com/puntrza"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Puntr on Facebook"
                className="text-foreground transition-colors hover:text-primary"
              >
                <Facebook className="size-5" />
              </a>
              <a
                href="https://www.youtube.com/@puntr_za"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Puntr on YouTube"
                className="text-foreground transition-colors hover:text-primary"
              >
                <YouTubeIcon className="size-5" />
              </a>
              <a
                href="https://www.instagram.com/puntr_za"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Puntr on Instagram"
                className="text-foreground transition-colors hover:text-primary"
              >
                <Instagram className="size-5" />
              </a>
              <a
                href="https://www.tiktok.com/@puntr_za"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Puntr on TikTok"
                className="text-foreground transition-colors hover:text-primary"
              >
                <TikTokIcon className="size-5" />
              </a>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ComingSoonBadge store="apple" />
              <ComingSoonBadge store="google" />
            </div>
          </div>
        </div>

        <p className="border-t border-border py-5 text-center text-xs text-muted-foreground">
          <span className="block">© 2026 Puntr (Pty) Ltd. All rights reserved. 18+ only.</span>
          {currentDateTime && (
            <span className="mt-2 block">
              {currentDateTime}
            </span>
          )}
        </p>
      </div>
    </footer>
  );
}
