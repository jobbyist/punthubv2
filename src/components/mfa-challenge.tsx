import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { verifiedTotpFactor } from "@/lib/mfa";

/** Asks for the 6-digit code from the member's authenticator app and upgrades the session to the second factor. */
export function MfaChallenge({
  onVerified,
  onCancel,
}: {
  onVerified: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("security");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);

  const verify = async (token: string) => {
    if (busy || token.length !== 6) return;
    setBusy(true);
    setError(null);
    const factor = await verifiedTotpFactor();
    if (!factor) {
      setBusy(false);
      return setError(t("mfa.error.noFactor"));
    }
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: token,
    });
    setBusy(false);
    if (err) {
      submitted.current = false;
      setCode("");
      return setError(err.status === 429 ? t("mfa.error.rate") : t("mfa.error.code"));
    }
    onVerified();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void verify(code);
      }}
      className="space-y-4"
    >
      <h2 className="text-xl">{t("mfa.challenge.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("mfa.challenge.body")}</p>
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
        {busy ? t("mfa.challenge.verifying") : t("mfa.challenge.verify")}
      </Button>
      <button type="button" onClick={onCancel} className="text-sm underline">
        {t("mfa.challenge.cancel")}
      </button>
    </form>
  );
}
