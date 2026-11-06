import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SocialLinks } from "@/components/social-links";
import { HELPLINE_DISPLAY, RgNotice } from "@/components/rg-notice";
import { formatDateTime } from "@/lib/format";

const columns = [
  {
    key: "platform",
    links: [
      ["predictions", "/predictions"],
      ["leaderboards", "/leaderboards"],
      ["results", "/results"],
      ["insights", "/insights"],
      ["founding", "/founding"],
      ["roadmap", "/roadmap"],
      ["pricing", "/pricing"],
    ],
  },
  {
    key: "communityCol",
    links: [
      ["feed", "/community"],
      ["howItWorks", "/how-it-works"],
      ["puntPoints", "/leaderboards"],
      ["support", "/support"],
    ],
  },
  {
    key: "company",
    links: [
      ["about", "/about"],
      ["terms", "/terms"],
      ["privacy", "/privacy"],
      ["privacyChoices", "/cookies"],
      ["affiliate", "/affiliate-disclosure"],
      ["refunds", "/refunds"],
    ],
  },
] as const;

function ComingSoonBadge({ store }: { store: "apple" | "google" }) {
  const { t } = useTranslation("nav");
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
        <span className="block text-[9px] uppercase tracking-wide opacity-80">
          {t("footer.store.comingSoonTo")}
        </span>
        <span className="block text-[13px] font-semibold">
          {store === "apple" ? t("footer.store.appStore") : t("footer.store.googlePlay")}
        </span>
      </span>
    </div>
  );
}

export function SiteFooter() {
  const { t } = useTranslation("nav");
  const { t: tRg } = useTranslation("rg");
  const { t: tc } = useTranslation("common");
  const [currentDateTime, setCurrentDateTime] = useState<string>("");

  useEffect(() => {
    const update = () => setCurrentDateTime(formatDateTime(new Date()));
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="mt-10 bg-surface pb-28 lg:pb-0">
      <div className="px-4 pb-8 sm:px-6">
        <RgNotice />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 pb-8 text-center text-xs leading-relaxed text-muted-foreground sm:px-6">
        <p>{tRg("footer.promote")}</p>
        <p>
          {tRg("footer.helpline")}{" "}
          <span className="font-semibold text-foreground tnum">{HELPLINE_DISPLAY}</span>
        </p>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_repeat(3,1fr)_1.2fr]">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">{tc("brand.tagline")}</p>
          </div>

          {columns.map((col) => (
            <div key={col.key}>
              <h4 className="font-display text-sm font-extrabold">{t(`footer.${col.key}`)}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map(([label, to]) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {t(`footer.link.${label}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="font-display text-sm font-extrabold">{t("footer.followUs")}</h4>
            <SocialLinks className="mt-3" />
            <LanguageSwitcher className="mt-4" />
            <div className="mt-4 flex flex-wrap gap-2">
              <ComingSoonBadge store="apple" />
              <ComingSoonBadge store="google" />
            </div>
          </div>
        </div>

        <p className="border-t border-border py-5 text-center text-xs text-muted-foreground">
          <span className="block">{t("footer.copyright")}</span>
          {currentDateTime && <span className="mt-2 block">{currentDateTime}</span>}
        </p>
      </div>
    </footer>
  );
}
