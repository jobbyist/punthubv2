import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import { adminLaunchStatus } from "@/lib/admin.functions";
import { formatDate } from "@/lib/format";
import { launchMessages, smsLink, toE164ZA, whatsappLink } from "@/lib/launch";

const panel = "card-surface p-5";

async function copy(text: string, ok: string, fail: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(ok);
  } catch {
    toast.error(fail);
  }
}

/** Live banner at the top of /admin: new notifications appear here the moment the server writes them. */
export function NotificationBanner({ onOpenAudience }: { onOpenAudience: () => void }) {
  const { t } = useTranslation("admin");
  const { items, markDone } = useAdminNotifications(true, (n) => toast.info(n.title));
  if (items.length === 0) return null;
  return (
    <div
      className="mt-6 space-y-4"
      role="region"
      aria-live="polite"
      aria-label={t("launch.notice.region")}
    >
      {items.map((n) => (
        <section key={n.id} className="border-2 border-primary bg-primary-soft p-5">
          <h2 className="text-lg">{n.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("launch.notice.body")}</p>
          <label className="mt-4 block text-sm font-medium" htmlFor={`wa-${n.id}`}>
            {t("launch.whatsapp")}
          </label>
          <Textarea
            id={`wa-${n.id}`}
            readOnly
            value={n.body}
            rows={4}
            className="mt-1 bg-background"
          />
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => void copy(n.body, t("launch.copied"), t("launch.copyFailed"))}
          >
            {t("launch.copyWhatsapp")}
          </Button>
          {n.sms_body && (
            <>
              <label className="mt-4 block text-sm font-medium" htmlFor={`sms-${n.id}`}>
                {t("launch.sms")}
              </label>
              <Textarea
                id={`sms-${n.id}`}
                readOnly
                value={n.sms_body}
                rows={2}
                className="mt-1 bg-background"
              />
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() =>
                  void copy(n.sms_body ?? "", t("launch.copied"), t("launch.copyFailed"))
                }
              >
                {t("launch.copySms")}
              </Button>
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={onOpenAudience}>{t("launch.notice.open")}</Button>
            <Button variant="outline" onClick={() => void markDone(n.id)}>
              {t("launch.notice.done")}
            </Button>
          </div>
        </section>
      ))}
    </div>
  );
}

interface AudienceRow {
  email_address: string;
  full_name: string;
  phone_number: string | null;
  marketing_ok: boolean;
  reserved: boolean;
  signed_up: boolean;
  unsubscribed: boolean;
  joined_at: string;
}

/** Email status per wave, and the people to message by hand with one-tap WhatsApp and SMS links. */
export function LaunchAudience() {
  const { t } = useTranslation("admin");
  const status = useAsync(() => adminLaunchStatus(), []);
  const audience = useAsync(async () => {
    const { data, error } = await supabase.rpc("launch_audience");
    if (error) throw error;
    return data as AudienceRow[];
  }, []);
  const [showAll, setShowAll] = useState(false);

  const draft = launchMessages();
  const rows = (audience.data ?? []).filter((r) => showAll || !r.signed_up);
  const s = status.data;

  return (
    <div className="space-y-5">
      <section className={panel}>
        <h2 className="text-lg">{t("launch.emails.title")}</h2>
        {s && (
          <>
            <p className={`mt-2 text-sm ${s.enabled ? "text-primary" : "text-destructive"}`}>
              {s.enabled ? t("launch.emails.on") : t("launch.emails.off")}
            </p>
            {!s.emailConfigured && (
              <p className="mt-1 text-sm text-destructive">{t("launch.emails.notConfigured")}</p>
            )}
            <ul className="mt-3 divide-y divide-border text-sm">
              {s.waves.map((w) => (
                <li key={w.wave} className="flex flex-wrap gap-x-3 py-2">
                  <span className="font-semibold">{t(`launch.emails.wave${w.wave}`)}</span>
                  <span className="text-muted-foreground tnum">
                    {formatDate(`${w.date}T12:00:00+02:00`)}
                  </span>
                  <span className="tnum">
                    {t("launch.emails.counts", { sent: w.sent, failed: w.failed })}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("launch.emails.note")}</p>
      </section>

      <section className={panel}>
        <h2 className="text-lg">{t("launch.draft.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("launch.draft.body")}</p>
        <label className="mt-3 block text-sm font-medium" htmlFor="draft-wa">
          {t("launch.whatsapp")}
        </label>
        <Textarea id="draft-wa" readOnly value={draft.whatsapp} rows={4} className="mt-1" />
        <label className="mt-3 block text-sm font-medium" htmlFor="draft-sms">
          {t("launch.sms")} ({draft.sms.length}/160)
        </label>
        <Textarea id="draft-sms" readOnly value={draft.sms} rows={2} className="mt-1" />
      </section>

      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg">{t("launch.audience.title", { count: rows.length })}</h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            {t("launch.audience.showAll")}
          </label>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("launch.audience.note")}</p>
        {audience.failed ? (
          <p className="mt-3 text-sm text-destructive">{t("launch.audience.error")}</p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("launch.audience.empty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {rows.map((r) => {
              const e164 = toE164ZA(r.phone_number);
              const m = launchMessages(r.full_name);
              return (
                <li key={r.email_address} className="py-3">
                  <p className="font-semibold">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.email_address}
                    {r.phone_number ? ` · ${r.phone_number}` : ""}
                  </p>
                  <p className="mt-1 text-xs">
                    {r.marketing_ok
                      ? t("launch.audience.optedIn")
                      : t("launch.audience.notOptedIn")}
                    {r.signed_up && ` · ${t("launch.audience.signedUp")}`}
                    {r.unsubscribed && ` · ${t("launch.audience.unsubscribed")}`}
                  </p>
                  {e164 && r.marketing_ok && !r.unsubscribed && !r.signed_up ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" asChild>
                        <a href={whatsappLink(e164, m.whatsapp)} target="_blank" rel="noreferrer">
                          {t("launch.audience.whatsapp")}
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={smsLink(e164, m.sms)}>{t("launch.audience.sms")}</a>
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {!e164
                        ? t("launch.audience.badPhone")
                        : !r.marketing_ok
                          ? t("launch.audience.emailOnly")
                          : ""}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
