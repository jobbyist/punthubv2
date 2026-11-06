import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { supabase } from "@/integrations/supabase/client";
import { avatarPath, checkAvatarFile, compressAvatar, pathFromPublicUrl } from "@/lib/avatar";

// avatar_url is not in the generated types until types.ts is regenerated.
const profiles = () =>
  supabase.from("profiles") as unknown as {
    update: (v: { avatar_url: string | null }) => {
      eq: (k: string, v: string) => Promise<{ error: unknown }>;
    };
  };

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
      const { blob, ext } = await compressAvatar(file);
      const path = avatarPath(profile.id, ext);
      const bucket = supabase.storage.from("avatars");
      const { error: upErr } = await bucket.upload(path, blob, {
        contentType: blob.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (upErr) throw upErr;
      const url = bucket.getPublicUrl(path).data.publicUrl;
      const { error } = await profiles().update({ avatar_url: url }).eq("id", profile.id);
      if (error) {
        await bucket.remove([path]);
        throw error;
      }
      const old = pathFromPublicUrl(current);
      if (old) await bucket.remove([old]);
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

  const remove = async () => {
    setBusy(true);
    setNote(null);
    try {
      // Delete the file first: if that fails nothing changes and the member can retry.
      const old = pathFromPublicUrl(current);
      if (old) {
        const { error: rmErr } = await supabase.storage.from("avatars").remove([old]);
        if (rmErr) throw rmErr;
      }
      const { error } = await profiles().update({ avatar_url: null }).eq("id", profile.id);
      if (error) throw error;
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
    <section className="card-surface mt-6 p-4" aria-labelledby="avatar-title">
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
