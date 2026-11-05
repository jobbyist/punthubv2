import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { formatDate } from "@/lib/format";
import { DEFAULT_LAUNCH_DATE } from "@/lib/launch";

/** The sitewide Founding Member strip. Hidden on the sign-up and landing pages and for signed-in members. */
export function FoundingBar() {
  const { t } = useTranslation("common");
  const { profile } = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (profile || path === "/join" || path === "/founding" || path.startsWith("/admin")) return null;
  return (
    <div className="bg-foreground px-4 py-2 text-center text-xs text-background sm:text-sm">
      <span className="font-semibold">
        {t("foundingBar.text", { launch: formatDate(`${DEFAULT_LAUNCH_DATE}T12:00:00+02:00`) })}
      </span>{" "}
      <Link to="/founding" className="font-bold text-primary underline underline-offset-2">
        {t("foundingBar.cta")}
      </Link>
    </div>
  );
}
