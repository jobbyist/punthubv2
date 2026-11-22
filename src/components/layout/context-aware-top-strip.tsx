import { useEffect, useState } from "react";

import { useSession } from "@/components/session";
import { FoundingBar } from "@/components/founding-bar";
import { FixtureTickerBar } from "@/components/layout/fixture-ticker-bar";
import { DEFAULT_LAUNCH_DATE } from "@/lib/launch";

/**
 * SSR starts in the pre-launch state. The launch phase is resolved after hydration so the server
 * and first client render are deterministic; the authenticated session then selects the member strip.
 */
export function ContextAwareTopStrip() {
  const { loading, isSignedIn } = useSession();
  const [postLaunch, setPostLaunch] = useState(false);

  useEffect(() => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Johannesburg",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    setPostLaunch(today >= DEFAULT_LAUNCH_DATE);
  }, []);

  if (loading || (!isSignedIn && !postLaunch)) return <FoundingBar />;
  return <FixtureTickerBar />;
}
