import { PageArt } from "@/components/motion/page-art";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { RgNotice } from "@/components/rg-notice";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { submitForm } from "@/lib/forms.functions";
import { headT } from "@/lib/i18n/head";

export const Route = createFileRoute("/feedback")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "feedback");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/feedback" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.description") },
      ],
    };
  },
  component: Feedback,
});

type Kind = "single" | "multi" | "text" | "pass" | "final";
const STEPS: readonly { id: string; kind: Kind; opts?: readonly string[] }[] = [
  { id: "who", kind: "single", opts: ["tipster", "bettor", "analyst", "curious"] },
  { id: "freq", kind: "single", opts: ["daily", "weekly", "weekends", "rarely"] },
  { id: "leagues", kind: "multi", opts: ["psl", "epl", "ucl", "laliga", "other"] },
  {
    id: "expect",
    kind: "multi",
    opts: ["record", "board", "insights", "ai", "points", "community"],
  },
  {
    id: "sports",
    kind: "multi",
    opts: ["basketball", "rugby", "racing", "combat", "cricket", "tennis"],
  },
  { id: "trust", kind: "single", opts: ["graded", "locked", "history", "reasoning"] },
  { id: "frustration", kind: "text" },
  { id: "price", kind: "single", opts: ["too_high", "fair", "good_value", "unsure"] },
  { id: "pass", kind: "pass", opts: ["interested", "maybe", "not_now", "already"] },
  { id: "final", kind: "final" },
];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`w-full border px-4 py-3 text-left text-sm font-medium transition-colors ${
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:border-primary"
      }`}
    >
      {children}
    </button>
  );
}

function Feedback() {
  const { t } = useTranslation("feedback");
  const { isSignedIn, profile } = useSession();
  const [step, setStep] = useState(-1); // -1 = welcome
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [rating, setRating] = useState(0);
  const [improve, setImprove] = useState("");
  const [draw, setDraw] = useState(false);
  const [contact, setContact] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "already" | "error">("idle");
  const [formError, setFormError] = useState("");

  const cur = step >= 0 ? STEPS[step] : undefined;
  const isFounding = !!profile && profile.founding_number !== null;
  const passInterest = answers["pass"];

  const toggle = (id: string, v: string) =>
    setAnswers((a) => {
      const prev = Array.isArray(a[id]) ? (a[id] as string[]) : [];
      return { ...a, [id]: prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v] };
    });

  function next() {
    if (cur && (cur.kind === "single" || cur.kind === "pass") && !answers[cur.id]) {
      setFormError(t("pickOne"));
      return;
    }
    setFormError("");
    setStep((n) => n + 1);
  }

  async function submit() {
    if (!profile) return;
    if (rating < 1) {
      setFormError(t("pickRating"));
      return;
    }
    setFormError("");
    setState("sending");
    const { final: _f, pass: _p, ...rest } = answers as Record<string, string | string[]>;
    // survey_responses gained columns in a migration; loose view until types.ts is regenerated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("survey_responses").insert({
      user_id: profile.id,
      rating,
      improve: improve.trim() || null,
      liked: null,
      wanted_features: Array.isArray(answers["expect"]) ? answers["expect"] : [],
      pricing_view: typeof answers["price"] === "string" ? answers["price"] : null,
      pass_interest: typeof answers["pass"] === "string" ? answers["pass"] : null,
      answers: rest,
      survey_version: 2,
      draw_entry: draw,
      contact_ok: contact,
    });
    if (error) {
      setState(error.code === "23505" ? "already" : "error");
      return;
    }
    analytics.surveySubmitted(draw);
    void submitForm({
      data: {
        form: "survey",
        ...(improve.trim() ? { message: improve.trim().slice(0, 4000) } : {}),
        meta: {
          member: String(profile.founding_number ?? ""),
          username: String(profile.username ?? ""),
          rating: String(rating),
          price: String(typeof answers["price"] === "string" ? answers["price"] : ""),
          pass: String(passInterest ?? ""),
          follow_up_ok: contact ? "yes" : "no",
        },
      },
    }).catch(() => undefined);
    setState("done");
  }

  const total = STEPS.length;
  const showUpsell = state === "done" && passInterest !== "already";

  return (
    <div className="relative mx-auto max-w-[720px] px-4 py-10 sm:px-6 sm:py-14">
      <PageArt
        kind="chat"
        className="absolute right-4 top-8 hidden h-24 w-40 opacity-90 sm:right-6 md:block"
      />
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-[clamp(2rem,6vw,3.2rem)] leading-[1.05]">
        {t("title1")} <span className="text-primary">{t("title2")}</span>
      </h1>

      {!isSignedIn || !profile ? (
        <div className="card-surface mt-8 p-6">
          <p className="text-sm">{t("signIn")}</p>
          <Button asChild className="mt-4">
            <Link to="/join">{t("signInCta")}</Link>
          </Button>
        </div>
      ) : !isFounding ? (
        <div className="card-surface mt-8 p-6">
          <p className="text-sm">{t("membersOnly")}</p>
          <Button asChild className="mt-4">
            <Link to="/founding">{t("membersOnlyCta")}</Link>
          </Button>
        </div>
      ) : state === "already" ? (
        <p className="card-surface mt-8 p-6 text-sm">{t("already")}</p>
      ) : state === "done" ? (
        <div className="mt-8 space-y-4">
          <p className="card-surface p-6 text-sm font-semibold">
            {t("done")} {draw ? t("doneDraw") : ""}
          </p>
          {showUpsell && (
            <div className="border border-primary bg-card p-6">
              <h2 className="text-xl">{t("upsell.title")}</h2>
              <p className="mt-2 text-sm leading-relaxed">{t("upsell.body")}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t("upsell.note")}</p>
              <Button asChild className="mt-4">
                <Link to="/founding">{t("upsell.cta")}</Link>
              </Button>
            </div>
          )}
        </div>
      ) : step === -1 ? (
        <div className="card-surface mt-8 p-6">
          <p className="text-sm leading-relaxed">{t("lead")}</p>
          <Button className="mt-5" onClick={() => setStep(0)}>
            {t("start")}
          </Button>
        </div>
      ) : cur ? (
        <div className="card-surface mt-8 p-6">
          <div className="h-1 w-full bg-muted" aria-hidden="true">
            <div
              className="h-1 bg-primary transition-all"
              style={{ width: `${((step + 1) / total) * 100}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("stepOf", { n: step + 1, total })}
          </p>
          <h2 className="mt-2 text-xl leading-snug">{t(`steps.${cur.id}.q`)}</h2>
          {(cur.kind === "multi" || cur.id === "final") && (
            <p className="mt-1 text-xs text-muted-foreground">{t(`steps.${cur.id}.hint`)}</p>
          )}

          <div className="mt-4 space-y-2">
            {(cur.kind === "single" || cur.kind === "pass") &&
              cur.opts?.map((o) => (
                <Chip
                  key={o}
                  on={answers[cur.id] === o}
                  onClick={() => setAnswers((a) => ({ ...a, [cur.id]: o }))}
                >
                  {t(`steps.${cur.id}.opts.${o}`)}
                </Chip>
              ))}
            {cur.kind === "multi" &&
              cur.opts?.map((o) => (
                <Chip
                  key={o}
                  on={Array.isArray(answers[cur.id]) && (answers[cur.id] as string[]).includes(o)}
                  onClick={() => toggle(cur.id, o)}
                >
                  {t(`steps.${cur.id}.opts.${o}`)}
                </Chip>
              ))}
            {cur.kind === "text" && (
              <Textarea
                rows={4}
                maxLength={1000}
                placeholder={t(`steps.${cur.id}.ph`)}
                value={typeof answers[cur.id] === "string" ? (answers[cur.id] as string) : ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [cur.id]: e.target.value }))}
              />
            )}
            {cur.kind === "final" && (
              <div className="space-y-4">
                <div className="flex gap-2" role="radiogroup" aria-label={t("steps.final.q")}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      onClick={() => setRating(n)}
                      className={`h-12 w-12 border text-base font-bold ${
                        rating === n
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fb-improve">{t("steps.final.improveLabel")}</Label>
                  <Textarea
                    id="fb-improve"
                    rows={3}
                    maxLength={1000}
                    placeholder={t("steps.final.improvePh")}
                    value={improve}
                    onChange={(e) => setImprove(e.target.value)}
                  />
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={draw}
                    onChange={(e) => setDraw(e.target.checked)}
                  />
                  {t("draw")}
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={contact}
                    onChange={(e) => setContact(e.target.checked)}
                  />
                  {t("contact")}
                </label>
                <p className="text-xs leading-relaxed text-muted-foreground">{t("rules")}</p>
                <section aria-labelledby="draw-rules-title" className="border border-border p-3">
                  <h3 id="draw-rules-title" className="text-xs font-bold uppercase tracking-wide">
                    {t("drawRules.title")}
                  </h3>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                    {(t("drawRules.items", { returnObjects: true }) as unknown as string[]).map(
                      (line) => (
                        <li key={line}>{line}</li>
                      ),
                    )}
                  </ul>
                </section>
                <p className="text-xs text-muted-foreground">
                  {t("privacy")}{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    /privacy
                  </Link>
                </p>
              </div>
            )}
          </div>

          {formError && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {formError}
            </p>
          )}
          {state === "error" && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {t("error")}
            </p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormError("");
                setStep((n) => n - 1);
              }}
            >
              {t("back")}
            </Button>
            {cur.kind === "final" ? (
              <Button type="button" onClick={submit} disabled={state === "sending"}>
                {state === "sending" ? t("sending") : t("submit")}
              </Button>
            ) : (
              <Button type="button" onClick={next}>
                {t("next")}
              </Button>
            )}
            {(cur.kind === "multi" || cur.kind === "text") && (
              <button
                type="button"
                className="text-sm text-muted-foreground underline"
                onClick={next}
              >
                {t("skip")}
              </button>
            )}
          </div>
        </div>
      ) : null}

      <RgNotice variant="compact" className="mt-10" />
    </div>
  );
}
