import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMyUsername } from "@/lib/accounts.functions";

export function UsernameEditor({ initialUsername }: { initialUsername: string }) {
  const { t } = useTranslation("account");
  const { refreshProfile } = useSession();
  const [username, setUsername] = useState(initialUsername);
  const [draft, setDraft] = useState(initialUsername);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const cancel = () => {
    setDraft(username);
    setError(null);
    setEditing(false);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    const result = await updateMyUsername({ data: { username: draft } }).catch(() => null);
    setBusy(false);
    if (!result) {
      setError("error");
      return;
    }
    if (!result.ok) {
      setError(result.code);
      return;
    }
    setUsername(result.username);
    setDraft(result.username);
    setEditing(false);
    setSaved(true);
    await refreshProfile();
  };

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <dt className="text-sm text-muted-foreground">{t("home.username")}</dt>
        <dd className="mt-1 font-semibold">@{username}</dd>
        {saved ? (
          <p className="mt-1 text-xs text-primary" role="status">
            {t("home.usernameSaved")}
          </p>
        ) : !editing ? (
          <p className="mt-1 text-xs text-muted-foreground">{t("home.usernameHint")}</p>
        ) : null}
      </div>
      {editing ? (
        <form onSubmit={save} className="w-full space-y-2 sm:max-w-xs">
          <Label htmlFor="account-username">{t("home.username")}</Label>
          <Input
            id="account-username"
            value={draft}
            onChange={(event) =>
              setDraft(
                event.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, "")
                  .slice(0, 20),
              )
            }
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            aria-describedby="account-username-hint"
            required
          />
          <p id="account-username-hint" className="text-xs text-muted-foreground">
            {t("home.usernameHint")}
          </p>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {t(`home.usernameErrors.${error}`)}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={busy || draft === username || draft.length < 3}
            >
              {busy ? t("home.usernameSaving") : t("home.usernameSave")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={cancel} disabled={busy}>
              {t("home.usernameCancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setSaved(false);
            setEditing(true);
          }}
        >
          {t("home.usernameEdit")}
        </Button>
      )}
    </div>
  );
}
