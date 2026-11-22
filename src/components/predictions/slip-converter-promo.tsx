import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Camera, ClipboardPaste, Keyboard, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Reusable motion graphic shared by the Predictions spotlight and the Betting Slips page. */
export function SlipConverterVisual() {
  const reduce = useReducedMotion();
  const legs = [0, 1, 2];
  return (
    <div aria-hidden className="relative mx-auto h-56 w-full max-w-xs">
      <div className="absolute left-2 top-2 w-44 rotate-[-4deg] rounded-lg border border-border bg-card p-3 shadow-md">
        <div className="mb-2 h-2 w-16 rounded bg-foreground/80" />
        {legs.map((i) => (
          <div key={i} className="mb-2 space-y-1">
            <div className="h-1.5 w-full rounded bg-muted-foreground/30" />
            <div className="flex justify-between">
              <div className="h-1.5 w-20 rounded bg-muted-foreground/20" />
              <div className="h-1.5 w-6 rounded bg-primary/60" />
            </div>
          </div>
        ))}
        <div className="mt-3 h-2 w-full rounded bg-muted" />
        {!reduce && (
          <motion.div className="absolute inset-x-2 h-6 rounded bg-gradient-to-b from-transparent via-primary/30 to-transparent" initial={{ top: 8 }} animate={{ top: [8, 110, 8] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} />
        )}
      </div>
      <div className="absolute bottom-1 right-0 flex w-44 flex-col gap-2">
        {legs.map((i) => {
          const chip = (
            <>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" />
                <span className="h-1.5 w-14 rounded bg-foreground/60" />
              </span>
              <span className="rounded bg-primary-soft px-1.5 text-[10px] font-bold text-primary">{["1X2", "BTTS", "O/U"][i]}</span>
            </>
          );
          const cls = "flex items-center justify-between rounded-md border border-primary/30 bg-background px-2.5 py-1.5 shadow-sm";
          return reduce ? (
            <div key={i} className={cls}>{chip}</div>
          ) : (
            <motion.div key={i} initial={{ opacity: 0, x: -24, scale: 0.9 }} animate={{ opacity: [0, 1, 1, 0], x: [-24, 0, 0, 8], scale: [0.9, 1, 1, 0.98] }} transition={{ duration: 3.2, delay: 0.5 + i * 0.45, repeat: Infinity, repeatDelay: 0.4 }} className={cls}>
              {chip}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
/**
 * Betting Slip Converter spotlight for the Predictions hub. Its own motion graphic: a paper slip whose legs are
 * scanned line by line and drop out as structured pick chips. CSS/motion only, off with reduced motion.
 */
export function SlipConverterPromo() {
  const { t } = useTranslation("predictions");

  return (
    <section
      aria-labelledby="slip-converter-title"
      className="relative mb-10 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary-soft via-background to-background p-5 sm:p-7"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative grid items-center gap-6 md:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
            {t("converter.eyebrow")}
          </p>
          <h2 id="slip-converter-title" className="text-2xl sm:text-[28px]">
            {t("converter.title")}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("converter.body")}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            {[
              { icon: Camera, key: "photo" },
              { icon: ClipboardPaste, key: "paste" },
              { icon: Keyboard, key: "type" },
            ].map(({ icon: Icon, key }) => (
              <li
                key={key}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5"
              >
                <Icon className="size-3.5 text-primary" aria-hidden />
                {t(`converter.ways.${key}`)}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to="/slips"
              className="group inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              {t("converter.cta")}
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <Link
              to="/tools"
              className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("converter.more")}
            </Link>
          </div>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" aria-hidden />
            {t("converter.privacy")}
          </p>
        </div>

        <SlipConverterVisual />
      </div>
    </section>
  );
}
