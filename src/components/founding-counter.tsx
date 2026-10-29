import { useTranslation } from "react-i18next";

import { useAsync } from "@/hooks/use-async";
import { getFoundingSpots } from "@/lib/founding.functions";

/** "63 of 100 Founding spots left", or "Founding spots are full". Shows nothing if the count cannot be read. */
export function FoundingCounter({ className = "" }: { className?: string }) {
  const { t } = useTranslation("common");
  const { data } = useAsync(() => getFoundingSpots(), []);
  if (!data) return null;
  return (
    <p
      className={`inline-block border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary tnum ${className}`}
      aria-live="polite"
    >
      {data.left > 0 ? t("founding.left", { left: data.left, cap: data.cap }) : t("founding.full")}
    </p>
  );
}
