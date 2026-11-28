import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import {
  checkAvatarFile,
  SPORTS_AVATARS,
  sportsAvatarToken,
  type SportsAvatarKey,
} from "@/lib/avatar";
import { chooseSportsAvatar, removeAvatar, uploadAvatar } from "@/lib/avatar-actions";

export function AvatarUploader() {
  const { t } = useTranslation("account");
  const { profile, refreshProfile } = useSession();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);
  if (!profile) return null;
  const current = profile.avatar_url ?? null;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const check = checkAvatarFile(file);
    if (!check.ok) {
      setNote({ text: t(`avatar.${check.reason}`), error: true });
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      await uploadAvatar(profile.id, file, current);
      await refreshProfile();
      setNote({ text: t("avatar.saved"), error: false });
    } catch (err) {
      console.error("avatar upload failed", err);
      setNote({ text: t("avatar.failed"), error: true });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const pickSportsAvatar = async (key: SportsAvatarKey) => {
    setBusy(true);
    setNote(null);
    try {
      await chooseSportsAvatar(profile.id, key, current);
      await refreshProfile();
      setNote({ text: "Sports avatar saved.", error: false });
    } catch (err) {
      console.error("sports avatar selection failed", err);
      setNote({ text: t("avatar.failed"), error: true });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setNote(null);
    try {
      await removeAvatar(profile.id, current);
      await refreshProfile();
      setNote({ text: t("avatar.removed"), error: false });
    } catch (err) {
      console.error("avatar remove failed", err);
      setNote({ text: t("avatar.failed"), error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="avatar" className="card-surface mt-6 p-4" aria-labelledby="avatar-title">
      <h2 id="avatar-title" className="text-base font-semibold">
        {t("avatar.title")}
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <UserAvatar
          username={profile.username}
          url={current}
          alt={t("avatar.alt", { username: profile.username })}
          className="size-16 text-lg"
        />
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            id="avatar-file"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <Button type="button" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? t("avatar.working") : current ? t("avatar.change") : t("avatar.upload")}
          </Button>
          {current && (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={remove}>
              {t("avatar.remove")}
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("avatar.hint")}</p>
      <div className="mt-5 space-y-2">
        <div>
          <h3 className="text-sm font-semibold">Sports avatars</h3>
          <p className="text-xs text-muted-foreground">
            Choose an illustrated sports profile picture instead of uploading your own.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {SPORTS_AVATARS.map((avatar) => {
            const selected = current === sportsAvatarToken(avatar.key);
            return (
              <button
                key={avatar.key}
                type="button"
                disabled={busy}
                aria-label={`Use ${avatar.label} avatar`}
                aria-pressed={selected}
                onClick={() => void pickSportsAvatar(avatar.key)}
                className={`flex flex-col items-center gap-1 rounded-lg p-1 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "bg-primary/10 ring-2 ring-primary" : ""}`}
              >
                <UserAvatar
                  username={avatar.label}
                  url={sportsAvatarToken(avatar.key)}
                  className="size-12"
                />
                <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                  {avatar.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {note && (
        <p
          className={`mt-2 text-sm ${note.error ? "text-destructive" : "text-primary"}`}
          aria-live="polite"
        >
          {note.text}
        </p>
      )}
    </section>
  );
}
