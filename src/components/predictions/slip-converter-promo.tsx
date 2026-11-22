import { Link } from "@tanstack/react-router";
import { BettingSlipGraphic } from "@/components/predictions/betting-slip-graphic";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Camera, ClipboardPaste, Keyboard, ShieldCheck, Swords, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Betting Slip Converter spotlight for the Predictions hub. Its own motion graphic: a paper slip whose legs are
 * scanned line by line and drop out as structured pick chips. CSS/motion only, off with reduced motion.
 */
export function SlipConverterPromo() {
  const { t } = useTranslation("predictions");
  const reduce = useReducedMotion();
  const legs = [0, 1, 2];

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

        <BettingSlipGraphic />

      </div>
    </section>
  );
}


/** Upcoming fantasy competition spotlight, separate from the live slip-conversion feature. */
export function FantasyArenaPromo() {
  const { t } = useTranslation("predictions");
  const reduce = useReducedMotion();
  return (
    <section className="relative mb-10 flex min-w-0 items-center gap-4 overflow-hidden rounded-xl border border-border bg-card p-4 sm:gap-6 sm:p-5" aria-labelledby="fantasy-arena-title">
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-primary">{t("fantasy.eyebrow")}</p>
        <h2 id="fantasy-arena-title" className="text-lg font-extrabold sm:text-xl">{t("fantasy.title")}</h2>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">{t("fantasy.body")}</p>
        <Link to="/fantasy-arena" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">{t("fantasy.cta")} <ArrowRight className="size-3.5" aria-hidden /></Link>
      </div>
      <div aria-hidden className="relative grid size-20 shrink-0 place-items-center sm:size-24">
        <div className="absolute inset-1 rounded-2xl border border-primary/30 bg-primary/5" />
        <div className="absolute inset-3 rounded-xl border border-primary/20" />
        {!reduce && <motion.div className="absolute inset-0 rounded-2xl border-t-2 border-primary" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />}
        <motion.div className="relative grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20" animate={reduce ? undefined : { y: [0, -4, 0], rotate: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}><Trophy className="size-5" /></motion.div>
        <Swords className="absolute -right-1 -top-1 size-5 text-primary" />
      </div>
    </section>
  );
}
