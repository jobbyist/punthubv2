import { ArrowRight, Sparkles, Star, Target } from "lucide-react";
import { PageArt } from "@/components/motion/page-art";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Trans, useTranslation } from "react-i18next";

import { MfaChallenge } from "@/components/mfa-challenge";
import { RgNotice } from "@/components/rg-notice";
import { AnnualPassClaim } from "@/components/annual-pass-claim";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  completeSignup,
  discardUnderageSignup,
  signInWithUsername,
} from "@/lib/accounts.functions";
import { analytics, trackEvent } from "@/lib/analytics";
import { parseIdentifier } from "@/lib/identifier";
import { mfaRequired } from "@/lib/mfa";
import { validatePassword } from "@/lib/password";
import { FoundingCounter } from "@/components/founding-counter";
import { QuestsChecklist } from "@/components/quests-checklist";
import { forgetRef, rememberRef, storedRef } from "@/lib/ref-store";
import { FOUNDING_CAP } from "@/lib/flags";
import { safeNext } from "@/lib/email/auth-emails";
import { headT } from "@/lib/i18n/head";
import { useLocale } from "@/lib/i18n/provider";
import { enabledLocales, locales, type LocaleCode } from "@/locales/config";

export const Route = createFileRoute("/join")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { ref?: string; next?: string; mode?: "signin" | "create" } => ({
    ...(typeof search["ref"] === "string" && search["ref"]
      ? { ref: search["ref"].slice(0, 32) }
      : {}),
    ...(typeof search["next"] === "string" ? { next: search["next"].slice(0, 200) } : {}),
    ...(search["mode"] === "signin" || search["mode"] === "create" ? { mode: search["mode"] } : {}),
  }),
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

type Step = "email" | "code" | "mfa" | "onboarding" | "done" | "blocked";
type CodeKind = "email" | "signup";

const RESEND_SECONDS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Join() {
  const { t } = useTranslation("auth");
  const { ref, next, mode } = Route.useSearch();
  const navigate = useNavigate();
  // Discover is the home base after signing in (and the PWA start page), unless a page sent the member here.
  const returnTo = safeNext(next, "/discover");
  const { user, profile, loading, refreshProfile } = useSession();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [codeKind, setCodeKind] = useState<CodeKind>("email");
  const [mfaTick, setMfaTick] = useState(0);
  const [foundingNumber, setFoundingNumber] = useState<number | null>(null);
  // A brand-new member sees the welcome screen with their first moves; a returning member goes straight back.
  const [justJoined, setJustJoined] = useState(false);
  useEffect(() => rememberRef(ref), [ref]);

  // Follow the session: a member with two-factor on must pass it first; then a profile means done, and no
  // profile means onboarding.
  useEffect(() => {
    if (loading) return;
    let active = true;
    void (async () => {
      if (user && (await mfaRequired())) {
        if (active) setStep("mfa");
        return;
      }
      if (!active) return;
      if (profile) {
        setFoundingNumber((n) => n ?? profile.founding_number);
        setStep("done");
        rememberAccount();
        if (!justJoined) void navigate({ to: returnTo as never });
      } else if (user) {
        setEmail((e) => e || user.email || "");
        setStep((s) => (s === "email" || s === "code" || s === "mfa" ? "onboarding" : s));
      }
    })();
    return () => {
      active = false;
    };
  }, [loading, profile, user, mfaTick, navigate, returnTo, justJoined]);

  const stepIndex =
    step === "email" ? 0 : step === "code" || step === "mfa" ? 1 : step === "onboarding" ? 2 : 3;
  const showProgress =
    step === "code" || step === "onboarding" || (step === "email" && mode !== "signin");

  return (
    <div className="relative mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <PageArt
        kind="podium"
        className="absolute right-4 top-6 hidden h-20 w-32 opacity-80 sm:right-6 sm:block"
      />
      <h1 className="puntr-rise text-3xl">
        {step === "done" && justJoined ? t("join.done.title") : t("join.title")}
      </h1>
      <p className="puntr-rise mt-1 text-sm text-muted-foreground">
        {step === "done" && justJoined ? t("join.done.subtitle") : t("join.subtitle")}
      </p>
      {step === "email" && <FoundingCounter className="mt-3" />}

      {showProgress && <JoinProgress current={stepIndex} />}

      <div className="card-surface mt-6 p-6">
        {step === "email" && (
          <AuthStep
            initialMode={mode ?? (hasAccountOnDevice() ? "signin" : "create")}
            redirectTo={returnTo}
            onNeedsCode={(e, kind) => {
              setEmail(e);
              setCodeKind(kind);
              setStep("code");
            }}
          />
        )}
        {step === "code" && (
          <CodeStep
            email={email}
            kind={codeKind}
            redirectTo={returnTo}
            onChangeEmail={() => setStep("email")}
            onVerified={() => setMfaTick((n) => n + 1)}
          />
        )}
        {step === "mfa" && (
          <MfaChallenge
            onVerified={() => setMfaTick((n) => n + 1)}
            onCancel={() => {
              void supabase.auth.signOut();
              setStep("email");
            }}
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
              setJustJoined(true);
              setFoundingNumber(n);
              await refreshProfile();
              setStep("done");
            }}
          />
        )}
        {step === "done" && <DoneStep foundingNumber={foundingNumber} returnTo={returnTo} />}
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

/** Remembers (on this device only) that someone has signed in here, so /join opens on Sign in next time. */
const ACCOUNT_KEY = "puntr:has-account";
function rememberAccount() {
  try {
    window.localStorage.setItem(ACCOUNT_KEY, "1");
  } catch {
    // Storage blocked: the form just opens on Create account.
  }
}
function hasAccountOnDevice() {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(ACCOUNT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Three short steps, so new members always know how far along they are. */
function JoinProgress({ current }: { current: number }) {
  const { t } = useTranslation("auth");
  const steps = ["account", "confirm", "profile"] as const;
  return (
    <ol className="mt-6 grid grid-cols-3 gap-2" aria-label={t("join.progress.label")}>
      {steps.map((key, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={key} aria-current={state === "current" ? "step" : undefined} className="min-w-0">
            <span
              className={`block h-1.5 rounded-full transition-colors duration-500 ${state === "todo" ? "bg-muted" : "bg-primary"}`}
            />
            <span
              className={`mt-1.5 block truncate text-[11px] font-semibold ${state === "current" ? "text-foreground" : "text-muted-foreground"}`}
            >
              {i + 1}. {t(`join.progress.${key}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.1 5.3-4.5 6.9l7.3 5.7c4.3-4 6.9-9.9 6.9-17z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.6 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

// Supabase answers these when an emailed code is requested for an address with no account. They are treated as
// success so the screen never reveals whether an address is registered.
const NO_ACCOUNT_CODES = new Set(["otp_disabled", "signup_disabled", "user_not_found"]);

function AuthStep({
  onNeedsCode,
  redirectTo,
  initialMode,
}: {
  onNeedsCode: (email: string, kind: CodeKind) => void;
  redirectTo: string;
  initialMode: "create" | "signin";
}) {
  const { t } = useTranslation("auth");
  const [mode, setMode] = useState<"create" | "signin">(initialMode);
  // New members get the shortest path (no password to invent); returning members usually have a password.
  const [method, setMethod] = useState<"password" | "code">(
    initialMode === "create" ? "code" : "password",
  );
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = mode === "create";
  const usesPassword = method === "password";
  const redirectOption =
    typeof window === "undefined"
      ? {}
      : { emailRedirectTo: `${window.location.origin}${redirectTo}` };

  const google = async () => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (err) setError(t("join.error.oauth"));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const id = parseIdentifier(identifier);
    const email = id.kind === "email" ? id.value : "";
    const username = id.kind === "username" ? id.value : "";

    // Creating an account always needs an email (a username is chosen later, in onboarding).
    if (create && id.kind !== "email") return setError(t("join.error.email"));
    if (create) {
      if (usesPassword) {
        const problem = validatePassword(password, email);
        if (problem) return setError(t(`join.error.password.${problem}`));
      }
    } else if (id.kind === "invalid") {
      return setError(t(usesPassword ? "join.error.identifier" : "join.error.email"));
    } else if (!usesPassword && id.kind !== "email") {
      return setError(t("join.error.email"));
    } else if (usesPassword && !password) {
      return setError(t("join.error.credentials"));
    }

    setBusy(true);
    try {
      // Passwordless: a code and a link arrive in the same email. Signing up this way needs no password.
      if (!usesPassword) {
        if (create) analytics.joinStarted();
        const { error: err } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: create, ...redirectOption },
        });
        if (err && !(err.code && NO_ACCOUNT_CODES.has(err.code))) {
          return setError(err.status === 429 ? t("join.error.rate") : t("join.error.generic"));
        }
        return onNeedsCode(email, "email");
      }

      if (create) {
        analytics.joinStarted();
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { ...redirectOption },
        });
        if (err) {
          if (err.status === 429) return setError(t("join.error.rate"));
          if (err.code === "user_already_exists" || /already/i.test(err.message)) {
            return setError(t("join.error.exists"));
          }
          return setError(t("join.error.generic"));
        }
        // No session means the project still asks for email confirmation: carry on with the emailed code.
        if (!data.session) onNeedsCode(email, "signup");
        return;
      }

      // Sign in with a password: by email directly, by username through the server.
      if (id.kind === "email") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err?.code === "email_not_confirmed") {
          // Signed up but never confirmed: send a fresh code and continue on the code step.
          const { error: resendErr } = await supabase.auth.resend({
            type: "signup",
            email,
            options: { ...redirectOption },
          });
          if (resendErr) {
            setError(resendErr.status === 429 ? t("join.error.rate") : t("join.error.generic"));
            return;
          }
          return onNeedsCode(email, "signup");
        }
        if (err) setError(err.status === 429 ? t("join.error.rate") : t("join.error.credentials"));
        return;
      }
      const r = await signInWithUsername({ data: { username, password } });
      if (!r.ok) {
        return setError(
          r.code === "rate"
            ? t("join.error.rate")
            : r.code === "unavailable"
              ? t("join.error.generic")
              : t("join.error.credentials"),
        );
      }
      const { error: err } = await supabase.auth.setSession({
        access_token: r.accessToken,
        refresh_token: r.refreshToken,
      });
      if (err) setError(t("join.error.generic"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div
        className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
        role="group"
        aria-label={t("join.mode.label")}
      >
        {(["create", "signin"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setMethod(m === "create" ? "code" : "password");
              setError(null);
            }}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              mode === m
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`join.mode.${m}`)}
          </button>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full gap-2"
        onClick={() => void google()}
      >
        <GoogleLogo /> {t("join.google")}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t("join.or")}</p>

      <div className="space-y-1.5">
        <Label htmlFor="j-email">
          {!create && usesPassword ? t("join.emailStep.identifier") : t("join.emailStep.label")}
        </Label>
        <Input
          id="j-email"
          type={!create && usesPassword ? "text" : "email"}
          autoComplete={!create && usesPassword ? "username" : "email"}
          inputMode="email"
          autoCapitalize="none"
          placeholder={
            !create && usesPassword
              ? t("join.emailStep.identifierPlaceholder")
              : t("join.emailStep.placeholder")
          }
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
      </div>

      {usesPassword ? (
        <div className="space-y-1.5">
          <Label htmlFor="j-password">{t("join.passwordStep.label")}</Label>
          <Input
            id="j-password"
            type="password"
            autoComplete={create ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {create ? (
            <p className="text-xs text-muted-foreground">{t("join.passwordStep.hint")}</p>
          ) : (
            <p className="text-xs">
              <Link
                to="/reset-password"
                search={{ next: redirectTo }}
                className="font-semibold text-primary hover:underline"
              >
                {t("join.forgot")}
              </Link>
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("join.method.codeHint")}</p>
      )}
      <button
        type="button"
        onClick={() => {
          setMethod(usesPassword ? "code" : "password");
          setError(null);
        }}
        className="text-xs font-semibold text-primary hover:underline"
      >
        {usesPassword ? t("join.method.switchToCode") : t("join.method.switchToPassword")}
      </button>
      {create && (
        <p className="text-xs text-muted-foreground">
          <LegalLinks i18nKey="join.emailStep.terms" />
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="h-11 w-full">
        {busy
          ? t("join.emailStep.sending")
          : !usesPassword
            ? t("join.emailStep.sendCode")
            : create
              ? t("join.emailStep.create")
              : t("join.emailStep.signin")}
      </Button>
    </form>
  );
}

function CodeStep({
  email,
  kind,
  redirectTo,
  onChangeEmail,
  onVerified,
}: {
  email: string;
  kind: CodeKind;
  redirectTo: string;
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
    const { error: err } = await supabase.auth.verifyOtp({ email, token, type: kind });
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
    const { error: err } =
      kind === "signup"
        ? await supabase.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
          })
        : await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: false,
              emailRedirectTo: `${window.location.origin}${redirectTo}`,
            },
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
  const [birthYear, setBirthYear] = useState("");
  const [adult, setAdult] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [marketingWhatsapp, setMarketingWhatsapp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setBusy(true);
    const result = await completeSignup({
      data: {
        username: "",
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
    analytics.signupCompleted(result.foundingNumber !== null);
    await onDone(result.foundingNumber);
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

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold">{t("join.onboarding.usernameAutoTitle")}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("join.onboarding.usernameAutoBody")}
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
        <p className="pt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("join.onboarding.optional")}
        </p>
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
      <Button type="submit" disabled={busy} className="h-11 w-full">
        {busy ? t("join.onboarding.submitting") : t("join.onboarding.submit")}
      </Button>
    </form>
  );
}

function DoneStep({
  foundingNumber,
  returnTo,
}: {
  foundingNumber: number | null;
  returnTo: string;
}) {
  const { t } = useTranslation("auth");
  const { profile, emailConfirmed } = useSession();
  const number = foundingNumber ?? profile?.founding_number ?? null;
  // Three clear first moves instead of a wall of options. Each is one tap from here.
  const moves = [
    { key: "predict", to: "/discover", icon: Target },
    { key: "teams", to: "/account", hash: "favourites", icon: Star },
    { key: "practice", to: "/practice", icon: Sparkles },
  ] as const;
  return (
    <div className="space-y-5">
      <div className="puntr-pop rounded-xl border border-primary/40 bg-primary-soft/50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
          {number ? t("join.done.celebrationEyebrow") : t("join.done.welcomeEyebrow")}
        </p>
        <h2 className="mt-2 text-2xl">
          {number
            ? t("join.done.founding", { number, cap: FOUNDING_CAP })
            : emailConfirmed
              ? t("join.done.full")
              : t("join.done.unconfirmed")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("join.done.body")}</p>
      </div>
      {!emailConfirmed && (
        <p className="border border-border bg-muted/40 p-3 text-sm">
          {t("join.done.confirmPrompt")}{" "}
          <Link to="/account/security" className="font-semibold underline">
            {t("join.done.confirmCta")}
          </Link>
        </p>
      )}
      <div>
        <h3 className="text-sm font-bold">{t("join.done.movesTitle")}</h3>
        <ul className="mt-3 grid gap-2">
          {moves.map(({ key, to, icon: Icon, ...rest }, i) => (
            <li key={key} className="puntr-rise" style={{ ["--i" as string]: i + 1 }}>
              <Link
                to={to}
                hash={"hash" in rest ? rest.hash : undefined}
                onClick={() => trackEvent("onboarding_move_clicked", { move: key })}
                className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/50 hover:bg-muted/40"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary transition-transform group-hover:scale-105">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {t(`join.done.moves.${key}.title`)}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t(`join.done.moves.${key}.body`)}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {emailConfirmed && <AnnualPassClaim onboarding />}
      <QuestsChecklist compact />
      <Button asChild className="h-11 w-full">
        <Link to={returnTo as never}>{t("join.done.continue")}</Link>
      </Button>
    </div>
  );
}
