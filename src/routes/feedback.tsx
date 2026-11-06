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

const FEATURES = ["picks", "board", "insights", "ai", "points", "sports", "app"] as const;
const PRICING = ["too_high", "fair", "good_value", "unsure"] as const;
type Pricing = (typeof PRICING)[number];

function Feedback() {
  const { t } = useTranslation("feedback");
  const { isSignedIn, profile } = useSession();
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState("");
  const [improve, setImprove] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [pricing, setPricing] = useState<Pricing | "">("");
  const [draw, setDraw] = useState(false);
  const [contact, setContact] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "already" | "error">("idle");
  const [formError, setFormError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (rating < 1) {
      setFormError(t("pickRating"));
      return;
    }
    setFormError("");
    setState("sending");
    const { error } = await supabase.from("survey_responses").insert({
      user_id: profile.id,
      rating,
      liked: liked.trim() || null,
      improve: improve.trim() || null,
      wanted_features: features,
      pricing_view: pricing || null,
      draw_entry: draw,
      contact_ok: contact,
    });
    if (error) {
      setState(error.code === "23505" ? "already" : "error");
      return;
    }
    analytics.surveySubmitted(draw);
    setState("done");
  }

  return (
    <div className="mx-auto max-w-[720px] px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-[clamp(2rem,6vw,3.2rem)] leading-[1.05]">
        {t("title1")}
        <br />
        <span className="text-primary">{t("title2")}</span>
      </h1>
      <p className="mt-4 text-muted-foreground">{t("lead")}</p>

      {!isSignedIn && (
        <div className="mt-8 border border-border p-5">
          <p className="text-sm">{t("signIn")}</p>
          <Button asChild className="mt-4">
            <Link to="/join">{t("signInCta")}</Link>
          </Button>
        </div>
      )}

      {isSignedIn && (state === "done" || state === "already") && (
        <div className="mt-8 border border-primary/30 bg-primary-soft p-5" role="status">
          <p className="font-semibold">{state === "done" ? t("done") : t("already")}</p>
          {state === "done" && draw && <p className="mt-1 text-sm">{t("doneDraw")}</p>}
        </div>
      )}

      {isSignedIn && state !== "done" && state !== "already" && (
        <form onSubmit={submit} className="mt-8 space-y-7" noValidate>
          <fieldset>
            <legend className="font-semibold">{t("q1")}</legend>
            <p className="text-xs text-muted-foreground">{t("q1hint")}</p>
            <div className="mt-3 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={rating === n}
                  onClick={() => setRating(n)}
                  className={`size-11 border text-sm font-bold tnum ${
                    rating === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <Label htmlFor="liked">{t("q2")}</Label>
            <Textarea
              id="liked"
              value={liked}
              onChange={(e) => setLiked(e.target.value)}
              maxLength={1000}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="improve">{t("q3")}</Label>
            <Textarea
              id="improve"
              value={improve}
              onChange={(e) => setImprove(e.target.value)}
              maxLength={1000}
              className="mt-2"
            />
          </div>

          <fieldset>
            <legend className="font-semibold">{t("q4")}</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={features.includes(f)}
                    onChange={(e) =>
                      setFeatures((prev) =>
                        e.target.checked ? [...prev, f] : prev.filter((x) => x !== f),
                      )
                    }
                  />
                  {t(`features.${f}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-semibold">{t("q5")}</legend>
            <div className="mt-3 flex flex-wrap gap-4">
              {PRICING.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pricing"
                    checked={pricing === p}
                    onChange={() => setPricing(p)}
                  />
                  {t(`pricing.${p}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-3 border-t border-border pt-5">
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
            <p className="text-xs text-muted-foreground">
              {t("privacy")}{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                /privacy
              </Link>
            </p>
          </div>

          {(formError || state === "error") && (
            <p className="text-sm text-destructive" role="alert">
              {formError || t("error")}
            </p>
          )}
          <Button type="submit" size="lg" disabled={state === "sending"}>
            {state === "sending" ? t("sending") : t("submit")}
          </Button>
        </form>
      )}

      <RgNotice variant="compact" className="mt-10" />
    </div>
  );
}
