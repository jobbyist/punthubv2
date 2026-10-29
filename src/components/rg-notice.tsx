import { Phone, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

/** The helpline number is identical in every language and is never passed through translation. */
export const HELPLINE_DISPLAY = "0800 006 008";
export const HELPLINE_TEL = "tel:0800006008";

type Variant = "full" | "compact";

/**
 * The only place the responsible-gambling message is written. Use <RgNotice /> everywhere;
 * never copy the text into a page.
 */
export function RgNotice({
  variant = "full",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const { t } = useTranslation("rg");

  if (variant === "compact") {
    return (
      <p className={`text-xs leading-relaxed text-muted-foreground ${className}`}>
        {t("compact.line")}{" "}
        <a href={HELPLINE_TEL} className="font-semibold text-foreground tnum">
          {HELPLINE_DISPLAY}
        </a>
      </p>
    );
  }

  return (
    <section
      aria-label={t("aria")}
      className={`mx-auto grid max-w-[1400px] gap-5 border border-border bg-card px-6 py-6 md:grid-cols-[1.4fr_1fr] md:items-center ${className}`}
    >
      <div className="flex items-start gap-4">
        <ShieldCheck className="mt-0.5 size-8 shrink-0 text-ink" strokeWidth={1.6} />
        <div>
          <h3 className="text-lg">
            <span className="mr-2 border border-foreground px-1.5 py-0.5 text-sm font-extrabold">
              18+
            </span>
            {t("title")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("body")}</p>
        </div>
      </div>
      <div className="md:border-l md:border-border md:pl-6">
        <p className="text-sm font-semibold">{t("help.title")}</p>
        <p className="text-xs text-muted-foreground">{t("help.body")}</p>
        <a
          href={HELPLINE_TEL}
          className="mt-1.5 flex items-center gap-2 text-lg font-bold text-primary tnum"
        >
          <Phone className="size-4" /> {HELPLINE_DISPLAY}
        </a>
      </div>
    </section>
  );
}
