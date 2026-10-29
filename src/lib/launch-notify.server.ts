import { renderAdminReminder, renderLaunchEmail } from "@/lib/email/launch-notify";
import { launchDate, launchMessages, SITE, waveFor, type Wave } from "@/lib/launch";
import { sastDate } from "@/lib/sast";

export interface LaunchRecipient {
  email: string;
  name: string;
}

export interface LaunchStore {
  recipients(wave: Wave): Promise<LaunchRecipient[]>;
  logSend(row: {
    email: string;
    wave: Wave;
    status: "sent" | "failed";
    detail: string | null;
  }): Promise<void>;
  /** False when a notification with this key already exists. */
  createNotification(n: {
    kind: string;
    dedupeKey: string;
    title: string;
    body: string;
    smsBody: string;
  }): Promise<boolean>;
  adminEmails(): Promise<string[]>;
}

export type SendFn = (
  payload: Record<string, unknown>,
) => Promise<{ ok: boolean; status: number; body: string }>;

export interface LaunchOptions {
  now?: Date;
  launchDateEnv?: string | undefined;
  enabled: boolean;
  store: LaunchStore;
  send: SendFn;
  unsubscribeUrl: (email: string) => string;
  replyTo: string;
  /** Stop starting new sends after this many milliseconds. The next run carries on. */
  budgetMs?: number;
}

export type LaunchReport =
  | { ok: true; wave: null }
  | { ok: true; wave: Wave; enabled: false }
  | {
      ok: true;
      wave: Wave;
      enabled: true;
      sent: number;
      failed: number;
      remaining: number;
      adminNotified: boolean;
    };

/** Runs whichever wave is due today (SAST). Safe to call many times a day: every send is logged first-come. */
export async function runLaunchNotify(o: LaunchOptions): Promise<LaunchReport> {
  const now = o.now ?? new Date();
  const launch = launchDate(o.launchDateEnv);
  const wave = waveFor(sastDate(now), launch);
  if (!wave) return { ok: true, wave: null };
  if (!o.enabled) return { ok: true, wave, enabled: false };

  let adminNotified = false;
  if (wave === 1) {
    const m = launchMessages();
    const created = await o.store.createNotification({
      kind: "launch_message",
      dedupeKey: `launch-day:${launch}`,
      title: "Puntr is live: send the launch message on WhatsApp and SMS",
      body: m.whatsapp,
      smsBody: m.sms,
    });
    if (created) {
      const mail = renderAdminReminder({ ...m, adminUrl: `${SITE}/admin` });
      for (const to of await o.store.adminEmails()) {
        const r = await o.send({ to: [to], reply_to: o.replyTo, ...mail });
        if (r.ok) adminNotified = true;
        else console.error("admin reminder failed", r.status, r.body.slice(0, 200));
      }
    }
  }

  const people = await o.store.recipients(wave);
  const started = Date.now();
  const budget = o.budgetMs ?? 40_000;
  let sent = 0;
  let failed = 0;
  let next = 0;

  const worker = async () => {
    while (next < people.length && Date.now() - started < budget) {
      const p = people[next++]!;
      const unsub = o.unsubscribeUrl(p.email);
      const mail = renderLaunchEmail({ wave, name: p.name, unsubscribeUrl: unsub });
      const r = await o.send({
        to: [p.email],
        reply_to: o.replyTo,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        headers: { "List-Unsubscribe": `<${unsub}>` },
      });
      // Logged after every send so a crash or a re-run never emails the same person twice.
      await o.store.logSend({
        email: p.email,
        wave,
        status: r.ok ? "sent" : "failed",
        detail: r.ok ? null : `${r.status} ${r.body}`.slice(0, 300),
      });
      if (r.ok) sent++;
      else failed++;
    }
  };
  await Promise.all([worker(), worker(), worker()]);

  return {
    ok: true,
    wave,
    enabled: true,
    sent,
    failed,
    remaining: Math.max(0, people.length - sent - failed),
    adminNotified,
  };
}
