import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AccountPage } from "@/components/account-gate";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { validatePassword } from "@/lib/password";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your password | Puntr" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPassword,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Forgotten password. Step 1: ask for a reset email (the answer never reveals whether an address has an account).
 * Step 2: enter the 6-digit code from the email (or arrive signed in from the email link). Step 3: choose a password.
 */
function ResetPassword() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { user } = useSession();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async (e: FormEvent) => {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL_RE.test(address)) return setError(t("join.error.email"));
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (err?.status === 429) return setError(t("join.error.rate"));
    // Any other answer is shown as sent, so the form never reveals whether the address is registered.
    setSent(true);
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError(t("join.error.code"));
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: "recovery",
    });
    setBusy(false);
    if (err) setError(err.status === 429 ? t("join.error.rate") : t("join.error.code"));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validatePassword(password, user?.email ?? "");
    if (problem) return setError(t(`join.error.password.${problem}`));
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      if (err.code === "same_password") return setError(t("reset.samePassword"));
      if (err.code === "weak_password") return setError(t("join.error.password.common"));
      return setError(t("join.error.generic"));
    }
    toast.success(t("reset.done"));
    void navigate({ to: "/account" });
  };

  return (
    <AccountPage>
      <h1 className="text-3xl">{t("reset.title")}</h1>
      {user ? (
        <form onSubmit={(e) => void save(e)} className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("reset.choose", { email: user.email })}
          </p>
          <Input
            type="password"
            autoComplete="new-password"
            placeholder={t("reset.newPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            {t("reset.save")}
          </Button>
        </form>
      ) : !sent ? (
        <form onSubmit={(e) => void request(e)} className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">{t("reset.body")}</p>
          <Input
            type="email"
            autoComplete="email"
            placeholder={t("reset.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            {t("reset.send")}
          </Button>
        </form>
      ) : (
        <form onSubmit={(e) => void verify(e)} className="mt-4 space-y-4">
          <p role="status" className="text-sm">
            {t("reset.sent", { email: email.trim() })}
          </p>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder={t("reset.code")}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || code.length !== 6}>
              {t("reset.verify")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setSent(false)}>
              {t("reset.again")}
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="mt-6 text-sm">
        <Link to="/join" className="text-primary underline">
          {t("reset.back")}
        </Link>
      </p>
    </AccountPage>
  );
}
