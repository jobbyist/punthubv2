import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AccountPage, RequireMember } from "@/components/account-gate";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { headT } from "@/lib/i18n/head";
import { validatePassword } from "@/lib/password";

export const Route = createFileRoute("/account/security")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "security");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/account/security" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: Security,
});

function OtpInput({
  value,
  onChange,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: (v: string) => void;
}) {
  const done = useRef(false);
  return (
    <InputOTP
      maxLength={6}
      value={value}
      inputMode="numeric"
      onChange={(v) => {
        done.current = false;
        onChange(v);
      }}
      onComplete={(v) => {
        if (done.current) return;
        done.current = true;
        onComplete(v);
      }}
    >
      <InputOTPGroup>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

/** For a sign-in that shared no email (X may not). updateUser sends a code; the member enters it to finish. */
function AddEmailSection() {
  const { t } = useTranslation("security");
  const { refreshSecurity } = useSession();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const clean = (pending ?? email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setError(t("email.addError"));
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ email: clean });
    setBusy(false);
    if (err) return setError(err.status === 429 ? t("email.error.rate") : t("email.addError"));
    setPending(clean);
  };

  const verify = async (token: string) => {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      email: pending,
      token,
      type: "email_change",
    });
    setBusy(false);
    if (err) {
      setCode("");
      return setError(t("email.error.code"));
    }
    await refreshSecurity();
    toast.success(t("email.confirmed"));
  };

  return (
    <section className="card-surface p-5">
      <h2 className="text-lg">{t("email.addTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("email.addWhy")}</p>
      {!pending ? (
        <form onSubmit={(e) => void send(e)} className="mt-3 space-y-3" noValidate>
          <Label htmlFor="s-email">{t("email.addLabel")}</Label>
          <Input
            id="s-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            {t("email.addSend")}
          </Button>
        </form>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted-foreground">{t("email.sent")}</p>
          <OtpInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} />
          <button
            type="button"
            className="text-sm underline"
            disabled={busy}
            onClick={() => void send()}
          >
            {t("email.resend")}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

function EmailSection() {
  const { t } = useTranslation("security");
  const { user, emailConfirmed, refreshSecurity } = useSession();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!user?.email) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resend({ type: "signup", email: user.email });
    setBusy(false);
    if (err) return setError(err.status === 429 ? t("email.error.rate") : t("email.error.generic"));
    setSent(true);
  };

  const verify = async (token: string) => {
    if (!user?.email || busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      email: user.email,
      token,
      type: "signup",
    });
    setBusy(false);
    if (err) {
      setCode("");
      return setError(t("email.error.code"));
    }
    await refreshSecurity();
    toast.success(t("email.confirmed"));
  };

  return (
    <section className="card-surface p-5">
      <h2 className="text-lg">{t("email.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
      {emailConfirmed ? (
        <p className="mt-3 text-sm font-semibold text-primary">{t("email.confirmed")}</p>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm">{t("email.why")}</p>
          {!sent ? (
            <Button disabled={busy} onClick={() => void send()}>
              {t("email.send")}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("email.sent")}</p>
              <OtpInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} />
              <button
                type="button"
                className="text-sm underline"
                disabled={busy}
                onClick={() => void send()}
              >
                {t("email.resend")}
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function PasswordSection() {
  const { t } = useTranslation("security");
  const { user } = useSession();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const problem = validatePassword(password, user?.email ?? "");
    if (problem) return setError(t(`password.error.${problem}`));
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(t("password.error.generic"));
    setPassword("");
    toast.success(t("password.saved"));
  };

  return (
    <form onSubmit={submit} className="card-surface p-5" noValidate>
      <h2 className="text-lg">{t("password.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("password.body")}</p>
      <Label htmlFor="s-pw" className="mt-3 block">
        {t("password.label")}
      </Label>
      <Input
        id="s-pw"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="mt-3">
        {t("password.save")}
      </Button>
    </form>
  );
}

interface Enrolment {
  factorId: string;
  qr: string;
  secret: string;
}

function MfaSection() {
  const { t } = useTranslation("security");
  const { hasMfa, refreshSecurity } = useSession();
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Leaving half-way must not strand an unverified factor, which would block the next attempt.
  const enrolmentRef = useRef<Enrolment | null>(null);
  enrolmentRef.current = enrolment;
  useEffect(
    () => () => {
      const e = enrolmentRef.current;
      if (e) void supabase.auth.mfa.unenroll({ factorId: e.factorId });
    },
    [],
  );

  const start = async () => {
    setBusy(true);
    setError(null);
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) {
      if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error: err } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Puntr",
    });
    setBusy(false);
    if (err || !data) return setError(t("mfa.error.start"));
    setEnrolment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirm = async (token: string) => {
    if (!enrolment || busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolment.factorId,
      code: token,
    });
    setBusy(false);
    if (err) {
      setCode("");
      return setError(t("mfa.error.code"));
    }
    setEnrolment(null);
    setCode("");
    await refreshSecurity();
    toast.success(t("mfa.on"));
  };

  const cancel = async () => {
    if (enrolment) await supabase.auth.mfa.unenroll({ factorId: enrolment.factorId });
    setEnrolment(null);
    setCode("");
  };

  const turnOff = async () => {
    setBusy(true);
    setError(null);
    const { data: list } = await supabase.auth.mfa.listFactors();
    let failed = false;
    for (const f of list?.all ?? []) {
      const { error: err } = await supabase.auth.mfa.unenroll({ factorId: f.id });
      if (err) failed = true;
    }
    setBusy(false);
    if (failed) return setError(t("mfa.error.off"));
    await refreshSecurity();
    toast.success(t("mfa.offDone"));
  };

  return (
    <section className="card-surface p-5">
      <h2 className="text-lg">{t("mfa.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("mfa.body")}</p>

      {hasMfa && !enrolment ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm font-semibold text-primary">{t("mfa.on")}</p>
          <Button variant="outline" disabled={busy} onClick={() => void turnOff()}>
            {t("mfa.turnOff")}
          </Button>
        </div>
      ) : enrolment ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm">{t("mfa.scan")}</p>
          <img
            src={enrolment.qr}
            alt={t("mfa.qrAlt")}
            width={176}
            height={176}
            className="border border-border"
          />
          <p className="text-xs text-muted-foreground">
            {t("mfa.manual")} <code className="break-all">{enrolment.secret}</code>
          </p>
          <p className="text-sm">{t("mfa.enter")}</p>
          <OtpInput value={code} onChange={setCode} onComplete={(v) => void confirm(v)} />
          <button type="button" className="text-sm underline" onClick={() => void cancel()}>
            {t("mfa.cancel")}
          </button>
        </div>
      ) : (
        <Button className="mt-3" disabled={busy || hasMfa === null} onClick={() => void start()}>
          {t("mfa.turnOn")}
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

function Security() {
  const { t } = useTranslation("security");
  const { user } = useSession();
  return (
    <RequireMember>
      {() => (
        <AccountPage>
          <h1 className="text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          <div className="mt-6 space-y-5">
            {user?.email ? <EmailSection /> : <AddEmailSection />}
            <MfaSection />
            {user?.email && <PasswordSection />}
          </div>
        </AccountPage>
      )}
    </RequireMember>
  );
}
