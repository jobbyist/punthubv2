import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CONSENT_OPEN_EVENT, readConsent, writeConsent } from "@/lib/consent";

/** First-visit privacy choices. Reject and Accept carry equal weight; nothing is pre-ticked. */
export function ConsentBanner() {
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
      aria-label="Privacy choices"
      className="fixed inset-x-0 bottom-16 z-50 border-t border-border bg-background p-4 shadow-lg lg:bottom-0"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center">
        <p className="flex-1 text-sm">
          We use essential cookies to run Puntr. With your permission we also use analytics and
          affiliate tracking. Both are off unless you accept. You can change this any time under{" "}
          <Link to="/cookies" className="underline">Privacy choices</Link>. See our{" "}
          <Link to="/privacy" className="underline">privacy policy</Link>.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => choose(false)}>Reject all</Button>
          <Button variant="outline" onClick={() => choose(true)}>Accept all</Button>
          <Button asChild variant="ghost"><Link to="/cookies" onClick={() => setOpen(false)}>Choose</Link></Button>
        </div>
      </div>
    </div>
  );
}
