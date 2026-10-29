import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CONSENT_OPEN_EVENT, readConsent, writeConsent } from "@/lib/consent";

/** First-visit privacy choices. Reject and Accept carry equal weight; nothing is pre-ticked. */
export function ConsentBanner() {
  const { t } = useTranslation("consent");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!readConsent()) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  if (!open) return null;

  const choose = (on: boolean) => {
    writeConsent({ analytics: on, affiliate_tracking: on });
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label={t("banner.aria")}
      className="fixed inset-x-0 bottom-16 z-50 border-t border-border bg-background p-4 shadow-lg lg:bottom-0"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center">
        <p className="flex-1 text-sm">
          <Trans
            t={t}
            i18nKey="banner.body"
            components={{
              1: <Link to="/cookies" className="underline" />,
              2: <Link to="/privacy" className="underline" />,
            }}
          />
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => choose(false)}>
            {t("banner.reject")}
          </Button>
          <Button variant="outline" onClick={() => choose(true)}>
            {t("banner.accept")}
          </Button>
          <Button asChild variant="ghost">
            <Link to="/cookies" onClick={() => setOpen(false)}>
              {t("banner.choose")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
