import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAsync } from "@/hooks/use-async";
import {
  adminDeleteEndorsementDraft,
  adminDraftEndorsementEmail,
  adminEndorsementOverview,
  adminSaveEndorsementDraft,
  adminSaveEndorsementOrg,
  adminSendEndorsementEmail,
} from "@/lib/endorsements.functions";
import {
  ENDORSEMENT_KINDS,
  ENDORSEMENT_STATUSES,
  SENDERS,
  type EmailKind,
  type EndorsementEmail,
  type EndorsementEvent,
  type EndorsementOrg,
  type SenderKey,
} from "@/lib/endorsements";
import { formatDateTime } from "@/lib/format";

const select = "h-10 border border-input bg-background px-2 text-sm";

/** Admin > Endorsements: who we are asking, where each conversation stands, and the emails to them. */
export function EndorsementsTab() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data, loading } = useAsync(() => adminEndorsementOverview(), [tick]);
  const [adding, setAdding] = useState(false);
  const reload = () => setTick((n) => n + 1);
  const counts = new Map<string, number>();
  for (const o of data?.orgs ?? []) counts.set(o.status, (counts.get(o.status) ?? 0) + 1);

  return (
    <section className="card-surface p-5">
      <h2 className="text-lg">{t("endorse.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("endorse.body")}</p>
      <p className="mt-2 text-sm font-medium">{t("endorse.rule")}</p>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {ENDORSEMENT_STATUSES.filter((s) => counts.get(s)).map((s) => (
          <span key={s}>
            {t(`endorse.status.${s}`)}: <b className="text-foreground">{counts.get(s)}</b>
          </span>
        ))}
      </p>
      <Button className="mt-4" size="sm" variant="outline" onClick={() => setAdding((a) => !a)}>
        {t("endorse.add")}
      </Button>
      {adding && (
        <OrgCard
          org={null}
          emails={[]}
          events={[]}
          open
          onDone={() => {
            setAdding(false);
            reload();
          }}
        />
      )}
      {loading && !data && <p className="mt-3 text-sm text-muted-foreground">…</p>}
      <ul className="mt-4 space-y-3">
        {(data?.orgs ?? []).map((o) => (
          <OrgCard
            key={`${o.id}:${o.status}`}
            org={o}
            emails={(data?.emails ?? []).filter((e) => e.orgId === o.id)}
            events={(data?.events ?? []).filter((e) => e.orgId === o.id)}
            onDone={reload}
          />
        ))}
      </ul>
    </section>
  );
}

function OrgCard({
  org,
  emails,
  events,
  open: startOpen = false,
  onDone,
}: {
  org: EndorsementOrg | null;
  emails: EndorsementEmail[];
  events: EndorsementEvent[];
  open?: boolean;
  onDone: () => void;
}) {
  const { t } = useTranslation("admin");
  const [open, setOpen] = useState(startOpen);
  const [f, setF] = useState({
    name: org?.name ?? "",
    kind: org?.kind ?? "regulator",
    jurisdiction: org?.jurisdiction ?? "",
    website: org?.website ?? "",
    contactName: org?.contactName ?? "",
    contactRole: org?.contactRole ?? "",
    contactEmail: org?.contactEmail ?? "",
    status: org?.status ?? "prospect",
    whatWeSeek: org?.whatWeSeek ?? "",
    reasons: org?.reasons ?? "",
    notes: org?.notes ?? "",
    doNotContact: org?.doNotContact ?? false,
    nextFollowUpAt: org?.nextFollowUpAt ? org.nextFollowUpAt.slice(0, 10) : "",
  });
  const [busy, setBusy] = useState(false);
  const [sender, setSender] = useState<SenderKey>("michael");
  const [extra, setExtra] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((c) => ({ ...c, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      const r = await adminSaveEndorsementOrg({
        data: { ...(org ? { id: org.id } : {}), ...f },
      });
      if (r.ok) {
        toast.success(t("endorse.saved"));
        onDone();
      } else toast.error(r.message);
    } finally {
      setBusy(false);
    }
  }

  async function draft(kind: EmailKind) {
    if (!org) return;
    setBusy(true);
    try {
      const r = await adminDraftEndorsementEmail({ data: { orgId: org.id, kind, sender, extra } });
      if (r.ok) {
        if (r.warnings.length) toast.warning(r.warnings.join(" "));
        else toast.success(t("endorse.drafted"));
        onDone();
      } else toast.error(r.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border border-border p-4">
      <button
        type="button"
        className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="font-semibold">{org?.name ?? t("endorse.newOrg")}</span>
        {org && (
          <span className="text-xs text-muted-foreground">
            {t(`endorse.status.${org.status}`)}
            {org.nextFollowUpAt
              ? ` · ${t("endorse.followUpOn")} ${org.nextFollowUpAt.slice(0, 10)}`
              : ""}
          </span>
        )}
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              aria-label={t("endorse.name")}
              placeholder={t("endorse.name")}
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
            />
            <div className="flex gap-2">
              <select
                aria-label={t("endorse.kind")}
                className={`${select} flex-1`}
                value={f.kind}
                onChange={(e) => set("kind", e.target.value as typeof f.kind)}
              >
                {ENDORSEMENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`endorse.kindName.${k}`)}
                  </option>
                ))}
              </select>
              <select
                aria-label={t("endorse.statusLabel")}
                className={`${select} flex-1`}
                value={f.status}
                onChange={(e) => set("status", e.target.value as typeof f.status)}
              >
                {ENDORSEMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`endorse.status.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <Input
              aria-label={t("endorse.jurisdiction")}
              placeholder={t("endorse.jurisdiction")}
              value={f.jurisdiction}
              onChange={(e) => set("jurisdiction", e.target.value)}
            />
            <Input
              aria-label={t("endorse.website")}
              placeholder="https://…"
              value={f.website}
              onChange={(e) => set("website", e.target.value)}
            />
            <Input
              aria-label={t("endorse.contactName")}
              placeholder={t("endorse.contactName")}
              value={f.contactName}
              onChange={(e) => set("contactName", e.target.value)}
            />
            <Input
              aria-label={t("endorse.contactRole")}
              placeholder={t("endorse.contactRole")}
              value={f.contactRole}
              onChange={(e) => set("contactRole", e.target.value)}
            />
            <Input
              aria-label={t("endorse.contactEmail")}
              placeholder={t("endorse.contactEmail")}
              type="email"
              value={f.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              {t("endorse.followUpOn")}
              <Input
                type="date"
                className="w-44"
                value={f.nextFollowUpAt}
                onChange={(e) => set("nextFollowUpAt", e.target.value)}
              />
            </label>
          </div>
          <Textarea
            aria-label={t("endorse.whatWeSeek")}
            placeholder={t("endorse.whatWeSeek")}
            value={f.whatWeSeek}
            onChange={(e) => set("whatWeSeek", e.target.value)}
            rows={2}
          />
          <Textarea
            aria-label={t("endorse.reasons")}
            placeholder={t("endorse.reasons")}
            value={f.reasons}
            onChange={(e) => set("reasons", e.target.value)}
            rows={3}
          />
          <Textarea
            aria-label={t("endorse.notes")}
            placeholder={t("endorse.notes")}
            value={f.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
          />
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={f.doNotContact}
                onChange={(e) => set("doNotContact", e.target.checked)}
              />
              {t("endorse.doNotContact")}
            </label>
            <Button size="sm" disabled={busy || !f.name.trim()} onClick={() => void save()}>
              {t("endorse.save")}
            </Button>
          </div>

          {org && (
            <div className="space-y-3 border-t border-border pt-3">
              <h3 className="text-sm font-semibold">{t("endorse.emails")}</h3>
              <p className="text-xs text-muted-foreground">{t("endorse.draftNote")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={t("endorse.sender")}
                  className={select}
                  value={sender}
                  onChange={(e) => setSender(e.target.value as SenderKey)}
                >
                  {(Object.keys(SENDERS) as SenderKey[]).map((k) => (
                    <option key={k} value={k}>
                      {SENDERS[k].from}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label={t("endorse.extra")}
                  className="min-w-48 flex-1"
                  placeholder={t("endorse.extra")}
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void draft("outreach")}
                >
                  {t("endorse.draftOutreach")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void draft("follow_up")}
                >
                  {t("endorse.draftFollowUp")}
                </Button>
              </div>
              <ul className="space-y-3">
                {emails.map((e) => (
                  <EmailCard
                    key={`${e.id}:${e.status}`}
                    email={e}
                    to={org.contactEmail}
                    onDone={onDone}
                  />
                ))}
              </ul>
              {events.length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-semibold">{t("endorse.history")}</summary>
                  <ul className="mt-2 space-y-1">
                    {events.slice(0, 30).map((ev) => (
                      <li key={ev.id}>
                        {formatDateTime(ev.createdAt)} · {ev.kind.replace("_", " ")}
                        {ev.detail ? ` · ${ev.detail}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function EmailCard({
  email,
  to,
  onDone,
}: {
  email: EndorsementEmail;
  to: string | null;
  onDone: () => void;
}) {
  const { t } = useTranslation("admin");
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [sender, setSender] = useState<SenderKey>(email.sender);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const sent = email.status === "sent";

  async function save(): Promise<boolean> {
    const r = await adminSaveEndorsementDraft({ data: { id: email.id, subject, body, sender } });
    if (!r.ok) toast.error(r.message);
    else if (r.warnings.length) toast.warning(r.warnings.join(" "));
    return r.ok;
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border border-dashed border-border p-3">
      <p className="text-xs text-muted-foreground">
        {t(`endorse.emailKind.${email.kind}`)} ·{" "}
        {sent
          ? `${t("endorse.sentOn")} ${formatDateTime(email.sentAt ?? email.createdAt)} → ${email.toEmail}`
          : t("endorse.draft")}
        {email.model ? ` · ${email.model}` : ""}
      </p>
      {email.error && !sent && <p className="mt-1 text-xs text-destructive">{email.error}</p>}
      <Input
        aria-label={t("endorse.subject")}
        className="mt-2"
        value={subject}
        disabled={sent}
        onChange={(e) => setSubject(e.target.value)}
      />
      <Textarea
        aria-label={t("endorse.bodyLabel")}
        className="mt-2"
        rows={9}
        value={body}
        disabled={sent}
        onChange={(e) => setBody(e.target.value)}
      />
      {!sent && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            aria-label={t("endorse.sender")}
            className={select}
            value={sender}
            onChange={(e) => setSender(e.target.value as SenderKey)}
          >
            {(Object.keys(SENDERS) as SenderKey[]).map((k) => (
              <option key={k} value={k}>
                {SENDERS[k].from}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (await save()) toast.success(t("endorse.saved"));
                onDone();
              })
            }
          >
            {t("endorse.saveDraft")}
          </Button>
          {!confirm ? (
            <Button size="sm" disabled={busy || !to} onClick={() => setConfirm(true)}>
              {to ? t("endorse.send") : t("endorse.noEmail")}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!(await save())) return;
                  const r = await adminSendEndorsementEmail({ data: { id: email.id } });
                  if (r.ok) toast.success(t("endorse.sentOk"));
                  else toast.error(r.message);
                  setConfirm(false);
                  onDone();
                })
              }
            >
              {t("endorse.confirmSend", { to })}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await adminDeleteEndorsementDraft({ data: { id: email.id } });
                onDone();
              })
            }
          >
            {t("endorse.discard")}
          </Button>
        </div>
      )}
    </li>
  );
}
