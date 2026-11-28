import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ExternalLink,
  Globe,
  ShieldCheck,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { BookmakerLogo } from "@/components/bookmakers/bookmaker-logo";
import { RgNotice } from "@/components/rg-notice";
import { useSession } from "@/components/session";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { NGB_REGISTER_URL, type BookmakerListing } from "@/lib/bookmaker-directory";
import { bookmakerProfile, POPULARITY_SOURCE, type SourceRef } from "@/lib/bookmaker-profiles";
import {
  deleteBookmakerReview,
  fetchBookmakerReviews,
  fetchMyBookmakerReview,
  REVIEW_BODY_MAX,
  saveBookmakerReview,
  type MyBookmakerReview,
} from "@/lib/bookmakers/reviews";
import { AFFILIATES_ENABLED } from "@/lib/flags";

const AGE_KEY = "puntr:affiliate-age-confirmed";

type Partner = { id: string; name: string; tracking_link: string; website_url: string | null };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const host = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

/** Live affiliate partner for this bookmaker, from the public view that lists only status 'live' partners. */
export function useAffiliatePartner(item: BookmakerListing): Partner | null {
  const { data } = useAsync(async () => {
    if (!AFFILIATES_ENABLED) return [] as Partner[];
    const { data: rows, error } = await supabase
      .from("public_affiliate_partners")
      .select("id, name, tracking_link, website_url");
    if (error) throw error;
    return (rows ?? []) as Partner[];
  }, []);
  const name = norm(item.name);
  return (
    data?.find(
      (p) =>
        p.tracking_link?.startsWith("https://") &&
        (norm(p.name) === name || (item.domain && host(p.website_url) === item.domain)),
    ) ?? null
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Star;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-4">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        {title}
      </h3>
      <div className="mt-2 text-sm">{children}</div>
    </section>
  );
}

function SourceLink({ source }: { source: SourceRef }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="underline underline-offset-2 hover:text-foreground"
    >
      {source.label}
    </a>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {items.map((m) => (
        <li key={m} className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs">
          {m}
        </li>
      ))}
    </ul>
  );
}

function StarsInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const { t } = useTranslation("bookmakers");
  return (
    <fieldset className="flex items-center justify-between gap-3">
      <legend className="sr-only">{label}</legend>
      <span className="text-xs font-medium" aria-hidden="true">
        {label}
      </span>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${label}: ${t("detail.reviews.star", { n, count: n })}`}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className="p-0.5"
          >
            <Star
              className={`size-5 ${n <= value ? "fill-primary text-primary" : "text-muted-foreground"}`}
              aria-hidden="true"
            />
          </button>
        ))}
      </span>
    </fieldset>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <span className="block h-full bg-primary" style={{ width: `${(value / 5) * 100}%` }} />
      </span>
      <span className="w-8 text-right font-semibold tnum">{value.toFixed(1)}</span>
    </div>
  );
}

function AffiliateCta({ item, partner }: { item: BookmakerListing; partner: Partner }) {
  const { t } = useTranslation("bookmakers");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  useEffect(() => {
    try {
      setAgeConfirmed(window.sessionStorage.getItem(AGE_KEY) === "yes");
    } catch {
      setAgeConfirmed(false);
    }
  }, []);
  const confirm = () => {
    try {
      window.sessionStorage.setItem(AGE_KEY, "yes");
    } catch {
      // The confirmation still applies while this page is open.
    }
    setAgeConfirmed(true);
  };
  return (
    <aside className="rounded-lg border border-primary/30 bg-primary-soft/20 p-3">
      <div className="flex items-center gap-2">
        <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
          {t("detail.affiliate.ad")}
        </span>
        <p className="text-sm font-bold">{t("detail.affiliate.title", { name: item.name })}</p>
      </div>
      {item.licenceType === "offshore" && (
        <p className="mt-2 flex gap-2 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {t("detail.affiliate.offshoreWarning", { name: item.name })}
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {t("detail.affiliate.body")}
      </p>
      {ageConfirmed ? (
        <a
          href={partner.tracking_link}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          onClick={() =>
            trackEvent("affiliate_partner_click", {
              partner_id: partner.id,
              partner_name: partner.name,
              placement: "bookmaker_profile",
            })
          }
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
        >
          {t("detail.affiliate.cta", { name: item.name })}
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/60 p-2">
          <p className="text-xs font-medium">{t("detail.affiliate.agePrompt")}</p>
          <button
            type="button"
            onClick={confirm}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            {t("detail.affiliate.confirm")}
          </button>
        </div>
      )}
      <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
        {t("detail.affiliate.terms")}
      </p>
    </aside>
  );
}

const EMPTY: MyBookmakerReview = { overall: 0, easeOfUse: 0, payouts: 0, support: 0, body: "" };

function ReviewForm({ slug, onSaved }: { slug: string; onSaved: () => void }) {
  const { t } = useTranslation("bookmakers");
  const { user } = useSession();
  const [form, setForm] = useState<MyBookmakerReview>(EMPTY);
  const [existing, setExisting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let live = true;
    fetchMyBookmakerReview(user.id, slug)
      .then((r) => {
        if (!live) return;
        setExisting(Boolean(r));
        setForm(r ? { ...r, body: r.body ?? "" } : EMPTY);
      })
      .catch((e) => console.error("my review load failed", e));
    return () => {
      live = false;
    };
  }, [user, slug]);

  if (!user) {
    return (
      <Link
        to="/join"
        className="mt-3 inline-flex text-sm font-semibold text-primary underline underline-offset-4"
      >
        {t("detail.reviews.signIn")}
      </Link>
    );
  }

  const complete = form.overall && form.easeOfUse && form.payouts && form.support;
  const set = (k: keyof MyBookmakerReview) => (n: number) => setForm((f) => ({ ...f, [k]: n }));

  const save = async () => {
    if (!complete) {
      toast.error(t("detail.reviews.rateAll"));
      return;
    }
    setBusy(true);
    try {
      await saveBookmakerReview(user.id, slug, form);
      setExisting(true);
      toast.success(t("detail.reviews.saved"));
      trackEvent("bookmaker_review_saved", { bookmaker: slug });
      onSaved();
    } catch (e) {
      console.error("review save failed", e);
      toast.error(t("detail.reviews.failed"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteBookmakerReview(user.id, slug);
      setExisting(false);
      setForm(EMPTY);
      toast.success(t("detail.reviews.deleted"));
      onSaved();
    } catch (e) {
      console.error("review delete failed", e);
      toast.error(t("detail.reviews.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
      <p className="text-xs font-bold">
        {existing ? t("detail.reviews.yours") : t("detail.reviews.write")}
      </p>
      <StarsInput
        label={t("detail.ratings.overall")}
        value={form.overall}
        onChange={set("overall")}
      />
      <StarsInput
        label={t("detail.ratings.easeOfUse")}
        value={form.easeOfUse}
        onChange={set("easeOfUse")}
      />
      <StarsInput
        label={t("detail.ratings.payouts")}
        value={form.payouts}
        onChange={set("payouts")}
      />
      <StarsInput
        label={t("detail.ratings.support")}
        value={form.support}
        onChange={set("support")}
      />
      <label className="block">
        <span className="text-xs font-medium">{t("detail.reviews.comment")}</span>
        <textarea
          value={form.body ?? ""}
          maxLength={REVIEW_BODY_MAX}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          rows={3}
          className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm outline-none focus:border-primary"
        />
        <span className="text-[11px] text-muted-foreground">
          {t("detail.reviews.commentHint", { max: REVIEW_BODY_MAX })}
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
        >
          {existing ? t("detail.reviews.update") : t("detail.reviews.save")}
        </button>
        {existing && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
          >
            {t("detail.reviews.delete")}
          </button>
        )}
      </div>
    </div>
  );
}

export function BookmakerDetail({
  item,
  showPageLink = false,
}: {
  item: BookmakerListing;
  showPageLink?: boolean;
}) {
  const { t, i18n } = useTranslation("bookmakers");
  const profile = bookmakerProfile(item.slug);
  const partner = useAffiliatePartner(item);
  const [reload, setReload] = useState(0);
  const { data: reviews } = useAsync(() => fetchBookmakerReviews(item.slug), [item.slug, reload]);
  const offshore = item.licenceType === "offshore";
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const sources: SourceRef[] = [
    {
      label: offshore
        ? "Curaçao Gaming Authority certificate"
        : "National Gambling Board Verified Operators register",
      url: item.verifyUrl ?? NGB_REGISTER_URL,
      checked: offshore ? "2026-11-28" : "2026-11-22",
    },
    ...(profile.popularity || item.domain ? [POPULARITY_SOURCE] : []),
    ...(profile.payments?.sources ?? []),
    ...(profile.externalRatings?.map((r) => r.source) ?? []),
    ...(profile.otherLicences?.map((l) => l.source) ?? []),
    ...(profile.flags?.map((f) => f.source) ?? []),
  ].filter((s, i, all) => all.findIndex((x) => x.url === s.url) === i);

  return (
    <article className="space-y-4">
      <header className="flex items-start gap-3">
        <BookmakerLogo item={item} size="lg" />
        <div className="min-w-0">
          <h2 className="font-display text-xl font-extrabold">{item.name}</h2>
          <span
            className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              offshore
                ? "border-amber-500/50 text-amber-800 dark:text-amber-300"
                : "border-primary/40 text-primary"
            }`}
          >
            {offshore ? t("detail.licence.offshoreBadge") : t("detail.licence.saBadge")}
          </span>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="size-3.5" aria-hidden="true" />
            {item.domain ? (
              <>
                {t("detail.website")}:{" "}
                <span className="font-medium text-foreground">{item.domain}</span>
              </>
            ) : (
              t("detail.websiteUnknown")
            )}
          </p>
        </div>
      </header>

      {partner && <AffiliateCta item={item} partner={partner} />}

      <Section icon={ShieldCheck} title={t("detail.sections.licence")}>
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t("detail.licence.holder")}</dt>
            <dd className="font-medium">{item.licenceHolder}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("detail.licence.regulator")}</dt>
            <dd className="font-medium">{item.regulator}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("detail.licence.province")}</dt>
            <dd className="font-medium">{item.province}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("detail.licence.reference")}</dt>
            <dd className="font-semibold">{item.licenceReference}</dd>
          </div>
        </dl>
        {item.verificationNote && (
          <p className="mt-2 border-l-2 border-amber-500 pl-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
            {item.verificationNote}
          </p>
        )}
        {profile.otherLicences?.length ? (
          <div className="mt-2">
            <p className="text-xs font-semibold">{t("detail.licence.otherLicences")}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
              {profile.otherLicences.map((l) => (
                <li key={l.text}>{l.text}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {profile.flags?.length ? (
          <div className="mt-2 rounded-md bg-amber-500/10 p-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              {t("detail.licence.flagsTitle")}
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
              {profile.flags.map((f) => (
                <li key={f.text}>{f.text}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <a
          href={item.verifyUrl ?? NGB_REGISTER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-4"
        >
          {offshore ? t("detail.licence.verifyOffshore") : t("detail.licence.verifyNgb")}
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </Section>

      <Section icon={TrendingUp} title={t("detail.sections.popularity")}>
        {profile.popularity ? (
          <>
            <p className="font-semibold">
              {t("detail.popularity.rank", { rank: profile.popularity.rank })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("detail.popularity.visits", {
                visits: profile.popularity.visits,
                domain: profile.popularity.domain,
              })}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {item.domain ? t("detail.popularity.outside") : t("detail.popularity.noDomain")}
          </p>
        )}
      </Section>

      <Section icon={Wallet} title={t("detail.sections.payments")}>
        {profile.payments ? (
          <div className="space-y-2">
            {(profile.payments.unverified || profile.payments.partial) && (
              <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                {profile.payments.unverified
                  ? t("detail.payments.unverified")
                  : t("detail.payments.partial")}
              </p>
            )}
            <div>
              <p className="text-xs font-semibold">{t("detail.payments.deposits")}</p>
              {profile.payments.deposits.length ? (
                <Chips items={profile.payments.deposits} />
              ) : (
                <p className="text-xs text-muted-foreground">{t("detail.payments.none")}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold">{t("detail.payments.withdrawals")}</p>
              {profile.payments.withdrawals.length ? (
                <Chips items={profile.payments.withdrawals} />
              ) : (
                <p className="text-xs text-muted-foreground">{t("detail.payments.none")}</p>
              )}
            </div>
            {profile.payments.note && (
              <p className="text-xs text-muted-foreground">{profile.payments.note}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("detail.payments.noData")}</p>
        )}
      </Section>

      <Section icon={Star} title={t("detail.sections.ratings")}>
        {reviews?.available === false ? (
          <p className="text-xs text-muted-foreground">{t("detail.ratings.unavailable")}</p>
        ) : reviews?.stats ? (
          <div className="space-y-1.5">
            <RatingBar label={t("detail.ratings.overall")} value={reviews.stats.overall} />
            <RatingBar label={t("detail.ratings.easeOfUse")} value={reviews.stats.easeOfUse} />
            <RatingBar label={t("detail.ratings.payouts")} value={reviews.stats.payouts} />
            <RatingBar label={t("detail.ratings.support")} value={reviews.stats.support} />
            <p className="text-[11px] text-muted-foreground">
              {t("detail.ratings.based", { count: reviews.stats.count })}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("detail.ratings.none")}</p>
        )}
        {profile.externalRatings?.map((r) => (
          <p key={r.label} className="mt-2 text-xs text-muted-foreground">
            {t("detail.ratings.external", {
              label: r.label,
              score: r.score,
              outOf: r.outOf,
              count: r.count,
            })}
          </p>
        ))}
      </Section>

      {reviews?.available && (
        <Section icon={Star} title={t("detail.sections.reviews")}>
          {reviews.reviews.length ? (
            <ul className="space-y-2">
              {reviews.reviews.map((r) => (
                <li key={r.id} className="rounded-md border border-border p-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold">
                      {r.displayName || r.username || t("detail.reviews.member")}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Star className="size-3 fill-primary text-primary" aria-hidden="true" />
                      <span className="tnum">{r.overall}/5</span> · {date(r.createdAt)}
                    </span>
                  </div>
                  {r.body && (
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed">{r.body}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">{t("detail.reviews.empty")}</p>
          )}
          <ReviewForm slug={item.slug} onSaved={() => setReload((n) => n + 1)} />
        </Section>
      )}

      <Section icon={ExternalLink} title={t("detail.sections.sources")}>
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          {sources.map((s) => (
            <li key={s.url}>
              <SourceLink source={s} /> ({date(s.checked)})
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {t("detail.disclaimer")}
        </p>
      </Section>

      <RgNotice variant="compact" />

      {showPageLink && (
        <Link
          to="/bookmakers/$slug"
          params={{ slug: item.slug }}
          className="inline-flex text-xs font-semibold text-primary underline underline-offset-4"
        >
          {t("detail.openPage")}
        </Link>
      )}
    </article>
  );
}
