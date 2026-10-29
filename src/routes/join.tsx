import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Trans, useTranslation } from "react-i18next";

import { RgNotice } from "@/components/rg-notice";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { completeSignup, discardUnderageSignup } from "@/lib/accounts.functions";
import { analytics } from "@/lib/analytics";
import { FOUNDING_CAP } from "@/lib/flags";
import { headT } from "@/lib/i18n/head";
import { useLocale } from "@/lib/i18n/provider";
import { enabledLocales, locales, type LocaleCode } from "@/locales/config";

export const Route = createFileRoute("/join")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } =>
    typeof search["ref"] === "string" && search["ref"] ? { ref: search["ref"].slice(0, 32) } : {},
  head: ({ match }) => {
    const t = headT(match.context.locale, "auth");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/join" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.description") },
      ],
    };
  },
  component: Join,
});

type Step = "email" | "code" | "onboarding" | "done" | "blocked";

const REF_KEY = "puntr:ref";
const RESEND_SECONDS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The referral code is not personal information. It waits in localStorage until the profile exists. */
function rememberRef(ref: string | undefined) {
  try {
    if (ref) window.localStorage.setItem(REF_KEY, ref);
  } catch {
    /* storage can be blocked; the link still works for this visit */
  }
}
function storedRef(): string | null {
  try {
    return window.localStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}
function forgetRef() {
  try {
    window.localStorage.removeItem(REF_KEY);
  } catch {
    /* nothing to do */
  }
}

function Join() {
  const { t } = useTranslation("auth");
  const { ref } = Route.useSearch();
  const { user, profile, loading, refreshProfile } = useSession();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [foundingNumber, setFoundingNumber] = useState<number | null>(null);

  useEffect(() => rememberRef(ref), [ref]);

  // Follow the session: signed in with a profile means done; signed in without one means onboarding.
  useEffect(() => {
    if (loading) return;
    if (profile) {
      setFoundingNumber((n) => n ?? profile.founding_number);
      setStep((s) => (s === "done" ? s : "done"));
    } else if (user) {
      setEmail((e) => e || user.email || "");
      setStep((s) => (s === "email" || s === "code" ? "onboarding" : s));
    }
  }, [loading, profile, user]);

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl">{t("join.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("join.subtitle")}</p>

      <div className="card-surface mt-6 p-6">
        {step === "email" && (
          <EmailStep
            onSent={(e) => {
              setEmail(e);
              setStep("code");
            }}
          />
        )}
        {step === "code" && (
          <CodeStep
            email={email}
            onChangeEmail={() => setStep("email")}
            onVerified={() => setStep("onboarding")}
          />
        )}
        {step === "blocked" && (
          <div className="space-y-4">
            <p role="alert" className="text-sm">
              {t("join.error.under18")}
            </p>
            <Button asChild variant="outline">
              <Link to="/">{t("join.blocked.home")}</Link>
            </Button>
          </div>
        )}
        {step === "onboarding" && (
          <OnboardingStep
            onBlocked={() => setStep("blocked")}
            onDone={async (n) => {
              setFoundingNumber(n);
              await refreshProfile();
              setStep("done");
            }}
          />
        )}
        {step === "done" && <DoneStep foundingNumber={foundingNumber} />}
      </div>

      <RgNotice variant="compact" className="mt-6" />
    </div>
  );
}

function LegalLinks({ i18nKey }: { i18nKey: string }) {
  const { t } = useTranslation("auth");
  return (
    <Trans
      t={t}
      i18nKey={i18nKey}
      components={{
        1: <Link to="/terms" className="underline" target="_blank" />,
        2: <Link to="/privacy" className="underline" target="_blank" />,
      }}
    />
  );
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) return setError(t("join.error.email"));
    if (!adult) return setError(t("join.error.ageRequired"));
    setBusy(true);
    analytics.joinStarted();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (err) {
      return setError(err.status === 429 ? t("join.error.rate") : t("join.error.generic"));
    }
    onSent(clean);
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="j-email">{t("join.emailStep.label")}</Label>
        <Input
          id="j-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t("join.emailStep.placeholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t("join.emailStep.signedOutHint")}</p>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox id="j-age" checked={adult} onCheckedChange={(v) => setAdult(v === true)} />
        <Label htmlFor="j-age" className="text-sm font-normal leading-snug">
          {t("join.emailStep.age")}
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">
        <LegalLinks i18nKey="join.emailStep.terms" />
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? t("join.emailStep.sending") : t("join.emailStep.send")}
      </Button>
    </form>
  );
}

function CodeStep({
  email,
  onChangeEmail,
  onVerified,
}: {
  email: string;
  onChangeEmail: () => void;
  onVerified: () => void;
}) {
  const { t } = useTranslation("auth");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const submitted = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const verify = async (token: string) => {
    if (busy || token.length !== 6) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setBusy(false);
    if (err) {
      submitted.current = false;
      return setError(err.status === 429 ? t("join.error.rate") : t("join.error.code"));
    }
    analytics.otpVerified();
    onVerified();
  };

  const resend = async () => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (err) return setError(err.status === 429 ? t("join.error.rate") : t("join.error.generic"));
    setCooldown(RESEND_SECONDS);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void verify(code);
      }}
      className="space-y-4"
    >
      <h2 className="text-xl">{t("join.codeStep.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("join.codeStep.body", { email })}</p>
      <InputOTP
        maxLength={6}
        value={code}
        inputMode="numeric"
        autoFocus
        onChange={setCode}
        onComplete={(v) => {
          if (submitted.current) return;
          submitted.current = true;
          void verify(v);
        }}
      >
        <InputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || code.length !== 6} className="w-full">
        {busy ? t("join.codeStep.verifying") : t("join.codeStep.verify")}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={cooldown > 0}
          className="underline disabled:no-underline disabled:opacity-60"
        >
          {cooldown > 0
            ? t("join.codeStep.resendIn", { seconds: cooldown })
            : t("join.codeStep.resend")}
        </button>
        <button type="button" onClick={onChangeEmail} className="underline">
          {t("join.codeStep.change")}
        </button>
      </div>
    </form>
  );
}

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";

function OnboardingStep({
  onDone,
  onBlocked,
}: {
  onDone: (founding: number | null) => void | Promise<void>;
  onBlocked: () => void;
}) {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { locale, setLocale } = useLocale();
  const languages = enabledLocales();

  const [language, setLanguage] = useState<LocaleCode>(locale);
  const [username, setUsername] = useState("");
  const [availability, setAvailability] = useState<Availability>("idle");
  const [birthYear, setBirthYear] = useState("");
  const [adult, setAdult] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [marketingWhatsapp, setMarketingWhatsapp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live availability, debounced. The server re-checks on submit.
  useEffect(() => {
    const name = username.trim().toLowerCase();
    if (!name) return setAvailability("idle");
    if (!/^[a-z0-9_]{3,20}$/.test(name)) return setAvailability("invalid");
    setAvailability("checking");
    let active = true;
    const id = setTimeout(async () => {
      const { data } = await supabase.rpc("username_available", { p_username: name });
      if (active) setAvailability(data ? "available" : "taken");
    }, 350);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [username]);

  const year = Number(birthYear);
  const thisYear = new Date().getFullYear();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!Number.isInteger(year) || year < 1900 || year > thisYear) {
      return setError(t("join.error.yearInvalid"));
    }
    if (year > thisYear - 18) {
      // Blocked in the browser. The only call made removes the bare sign-in (and the email); no details are sent.
      setBusy(true);
      await discardUnderageSignup().catch(() => null);
      await supabase.auth.signOut({ scope: "local" });
      setBusy(false);
      onBlocked();
      return;
    }
    if (!adult) return setError(t("join.error.ageRequired"));
    if (!accepted) return setError(t("join.error.consentRequired"));
    if (availability === "invalid") return setError(t("join.error.usernameInvalid"));
    if (availability === "taken") return setError(t("join.error.usernameTaken"));

    setBusy(true);
    const result = await completeSignup({
      data: {
        username: username.trim().toLowerCase(),
        birthYear: year,
        language: locales.some((l) => l.code === language) ? language : "en-ZA",
        marketingEmail,
        marketingWhatsapp,
        ref: storedRef(),
      },
    }).catch(() => null);
    setBusy(false);

    if (!result) return setError(t("join.error.generic"));
    if (!result.ok) {
      if (result.code === "under_18") {
        await supabase.auth.signOut({ scope: "local" });
        onBlocked();
        return;
      }
      if (result.code === "username_taken") return setError(t("join.error.usernameTaken"));
      if (result.code === "invalid_username") return setError(t("join.error.usernameInvalid"));
      if (result.code === "already_has_profile") {
        void navigate({ to: "/predictions" });
        return;
      }
      return setError(t("join.error.generic"));
    }
    forgetRef();
    analytics.profileCreated();
    await onDone(result.foundingNumber);
  };

  const hint: Record<Availability, string> = {
    idle: "",
    checking: t("join.onboarding.checking"),
    available: t("join.onboarding.available"),
    taken: t("join.onboarding.taken"),
    invalid: t("join.onboarding.invalid"),
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <h2 className="text-xl">{t("join.onboarding.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("join.onboarding.subtitle")}</p>
      </div>

      {languages.length > 1 && (
        <div className="space-y-1.5">
          <Label htmlFor="o-lang">{t("join.onboarding.language")}</Label>
          <select
            id="o-lang"
            value={language}
            onChange={(e) => {
              const code = e.target.value as LocaleCode;
              setLanguage(code);
              setLocale(code);
            }}
            className="h-10 w-full border border-input bg-background px-3 text-sm"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code} lang={l.code}>
                {l.nativeName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="o-username">{t("join.onboarding.username")}</Label>
        <Input
          id="o-username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-describedby="o-username-hint"
        />
        <p
          id="o-username-hint"
          className={`text-xs ${
            availability === "available"
              ? "text-primary"
              : availability === "taken" || availability === "invalid"
                ? "text-destructive"
                : "text-muted-foreground"
          }`}
        >
          {hint[availability] || t("join.onboarding.usernameHint")}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="o-year">{t("join.onboarding.birthYear")}</Label>
        <Input
          id="o-year"
          inputMode="numeric"
          autoComplete="bday-year"
          maxLength={4}
          placeholder="1990"
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, ""))}
        />
        <p className="text-xs text-muted-foreground">{t("join.onboarding.birthYearHint")}</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox id="o-age" checked={adult} onCheckedChange={(v) => setAdult(v === true)} />
          <Label htmlFor="o-age" className="text-sm font-normal leading-snug">
            {t("join.onboarding.age")}
          </Label>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="o-accept"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
          />
          <Label htmlFor="o-accept" className="text-sm font-normal leading-snug">
            <LegalLinks i18nKey="join.onboarding.accept" />
          </Label>
        </div>
        {/* Two separate, unticked boxes. Marketing is never a condition of joining. */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="o-mail"
            checked={marketingEmail}
            onCheckedChange={(v) => setMarketingEmail(v === true)}
          />
          <Label htmlFor="o-mail" className="text-sm font-normal leading-snug">
            {t("join.onboarding.marketingEmail")}
          </Label>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="o-wa"
            checked={marketingWhatsapp}
            onCheckedChange={(v) => setMarketingWhatsapp(v === true)}
          />
          <Label htmlFor="o-wa" className="text-sm font-normal leading-snug">
            {t("join.onboarding.marketingWhatsapp")}
          </Label>
        </div>
      </div>

      <p className="border border-border bg-muted/40 p-3 text-sm">
        {t("join.onboarding.publicRecord")}
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? t("join.onboarding.submitting") : t("join.onboarding.submit")}
      </Button>
    </form>
  );
}

function DoneStep({ foundingNumber }: { foundingNumber: number | null }) {
  const { t } = useTranslation("auth");
  const { profile } = useSession();
  return (
    <div className="space-y-4">
      <h2 className="text-2xl">
        {foundingNumber
          ? t("join.done.founding", { number: foundingNumber, cap: FOUNDING_CAP })
          : t("join.done.full")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("join.done.body")}</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/predictions">{t("join.done.cta")}</Link>
        </Button>
        {profile && (
          <Button asChild variant="outline">
            <Link to="/u/$username" params={{ username: profile.username }}>
              {t("join.done.record")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
