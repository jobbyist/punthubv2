import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { OptionalStepHeader } from "@/components/onboarding/join-progress";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { trackEvent } from "@/lib/analytics";
import {
  checkAvatarFile,
  SPORTS_AVATARS,
  sportsAvatarToken,
  type SportsAvatarKey,
} from "@/lib/avatar";
import { chooseSportsAvatar, uploadAvatar } from "@/lib/avatar-actions";

/**
 * Sign-up step 4 (optional): pick an illustrated sports avatar or upload a photo. A sports avatar is saved when the
 * member continues; an upload is saved straight away (it has to reach storage first). Skipping leaves the initial.
 */
export function AvatarStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation("auth");
  const { t: ta } = useTranslation("account");
  const { profile, refreshProfile } = useSession();
  const input = useRef<HTMLInputElement>(null);
  const saved = profile?.avatar_url ?? null;
  const [picked, setPicked] = useState<SportsAvatarKey | null>(() => {
    const key = saved?.startsWith("puntr-avatar://") ? saved.slice("puntr-avatar://".length) : null;
    return SPORTS_AVATARS.find((a) => a.key === key)?.key ?? null;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const username = profile?.username ?? "";
  const previewUrl = picked ? sportsAvatarToken(picked) : saved;
  const hasChoice = previewUrl !== null;

  const onFile = async (file: File | undefined) => {
    if (!file || !profile) return;
    const check = checkAvatarFile(file);
    if (!check.ok) return setError(ta(`avatar.${check.reason}`));
    setBusy(true);
    setError(null);
    try {
      await uploadAvatar(profile.id, file, saved);
      setPicked(null);
      await refreshProfile();
      trackEvent("onboarding_avatar", { action: "uploaded" });
    } catch (err) {
      console.error("onboarding avatar upload failed", err);
      setError(ta("avatar.failed"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const save = async () => {
    if (!profile) return onNext();
    if (!picked || sportsAvatarToken(picked) === saved) {
      trackEvent("onboarding_avatar", { action: hasChoice ? "kept" : "skipped" });
      return onNext();
    }
    setBusy(true);
    setError(null);
    try {
      await chooseSportsAvatar(profile.id, picked, saved);
      await refreshProfile();
      trackEvent("onboarding_avatar", { action: "sports", avatar: picked });
      onNext();
    } catch (err) {
      console.error("onboarding sports avatar failed", err);
      setError(ta("avatar.failed"));
      setBusy(false);
    }
  };

  const skip = () => {
    trackEvent("onboarding_avatar", { action: "skipped" });
    onNext();
  };

  return (
    <div className="space-y-5">
      <OptionalStepHeader
        step={4}
        title={t("join.avatar.title")}
        subtitle={t("join.avatar.subtitle")}
        onSkip={skip}
        skipDisabled={busy}
      />

      <div className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <UserAvatar
          key={previewUrl ?? "none"}
          username={username || "?"}
          url={previewUrl}
          alt={t("join.avatar.previewAlt")}
          className="puntr-pop size-16 text-xl sm:size-20"
        />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-extrabold">@{username}</p>
          <p className="text-xs text-muted-foreground">{t("join.avatar.previewBody")}</p>
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">{t("join.avatar.sportsTitle")}</legend>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
          {SPORTS_AVATARS.map((avatar) => {
            const selected = picked === avatar.key;
            return (
              <button
                key={avatar.key}
                type="button"
                disabled={busy}
                aria-label={t("join.avatar.use", { name: avatar.label })}
                aria-pressed={selected}
                onClick={() => {
                  setError(null);
                  setPicked(avatar.key);
                }}
                className={`flex flex-col items-center gap-1 rounded-lg p-1.5 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "bg-primary/10 ring-2 ring-primary" : ""}`}
              >
                <UserAvatar
                  username={avatar.label}
                  url={sportsAvatarToken(avatar.key)}
                  className="size-12 sm:size-14"
                />
                <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                  {avatar.label}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          id="onboarding-avatar-file"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Upload className="size-4" aria-hidden />
          {busy ? ta("avatar.working") : t("join.avatar.upload")}
        </Button>
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          {t("join.avatar.uploadHint")}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <Button type="button" className="h-11 w-full" disabled={busy} onClick={() => void save()}>
          {hasChoice ? t("join.avatar.save") : t("join.avatar.continueWithout")}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{t("join.avatar.later")}</p>
      </div>
    </div>
  );
}
