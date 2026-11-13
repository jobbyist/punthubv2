import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAsync } from "@/hooks/use-async";
import {
  adminBroadcast,
  adminListMembers,
  adminMemberAction,
  type AdminMember,
} from "@/lib/admin-platform.functions";
import { formatDate, formatDateTime } from "@/lib/format";

const panel = "card-surface p-5";
const FILTERS = ["all", "founding", "banned", "suspended", "admins"] as const;
const ENTITLEMENTS = ["early_access", "pro", "tools", "beta_tester"] as const;
type Panel = "message" | "warn" | "restrict" | "account" | "credits" | null;

/** /admin > Users: every member, their account state and the controls an admin needs. */
export function MembersTab() {
  const { t } = useTranslation("admin");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [nonce, setNonce] = useState(0);
  const list = useAsync(() => adminListMembers({ data: { query, filter } }), [filter, nonce]);
  const [open, setOpen] = useState<string | null>(null);
  const rows = list.data ?? [];

  return (
    <div className="space-y-5">
      <section className={panel}>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setNonce((n) => n + 1);
          }}
        >
          <Input
            aria-label={t("members.search")}
            placeholder={t("members.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-[12rem] flex-1"
          />
          <Button type="submit">{t("members.go")}</Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                filter === f ? "bg-ink text-ink-foreground" : "border border-border hover:bg-muted"
              }`}
            >
              {t(`members.filter.${f}`)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("members.count", { count: rows.length })}
        </p>
      </section>

      {list.loading ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted" aria-hidden />
      ) : list.failed ? (
        <p className="text-sm text-destructive">{t("members.error")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("members.none")}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              open={open === m.id}
              onToggle={() => setOpen(open === m.id ? null : m.id)}
              onChanged={() => setNonce((n) => n + 1)}
            />
          ))}
        </ul>
      )}

      <Broadcast />
    </div>
  );
}

function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "green" | "red" | "amber";
}) {
  const cls = {
    muted: "bg-muted text-foreground",
    green: "bg-primary-soft text-primary",
    red: "bg-destructive/10 text-destructive",
    amber: "bg-[oklch(0.95_0.06_85)] text-ink",
  }[tone];
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>
  );
}

function MemberCard({
  member: m,
  open,
  onToggle,
  onChanged,
}: {
  member: AdminMember;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation("admin");
  const [panelOpen, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    message: "",
    reason: "",
    days: "7",
    email: false,
    credits: "10",
  });
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function run(action: Record<string, unknown>, done: string) {
    setBusy(true);
    try {
      const r = await adminMemberAction({ data: { userId: m.id, action } });
      if (!r.ok) {
        toast.error(r.message ? `${t("members.failed")}: ${r.message}` : t("members.failed"));
        return;
      }
      toast.success(done);
      setPanel(null);
      setForm((f) => ({ ...f, subject: "", message: "", reason: "" }));
      onChanged();
    } catch {
      toast.error(t("members.failed"));
    } finally {
      setBusy(false);
    }
  }

  const isAdmin = m.role === "admin";
  return (
    <li className={panel}>
      <button
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-2 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold">@{m.username}</span>
        {m.foundingNumber !== null && (
          <Badge tone="green">{t("members.founding", { number: m.foundingNumber })}</Badge>
        )}
        {isAdmin && <Badge>{t("members.admin")}</Badge>}
        <Badge>{t(`members.type.${m.accountType}`)}</Badge>
        {m.isBanned && <Badge tone="red">{t("members.banned")}</Badge>}
        {m.suspendedUntil && <Badge tone="red">{t("members.suspended")}</Badge>}
        {m.limitedUntil && <Badge tone="amber">{t("members.limited")}</Badge>}
        {m.openWarnings > 0 && (
          <Badge tone="amber">{t("members.warnings", { count: m.openWarnings })}</Badge>
        )}
        {m.entitlements.map((e) => (
          <Badge key={e} tone="green">
            {t(`members.ent.${e}`)}
          </Badge>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{formatDate(m.createdAt)}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <Info label={t("members.f.name")} value={m.displayName || "-"} />
            <Info
              label={t("members.f.email")}
              value={`${m.email ?? "-"}${m.emailConfirmed ? "" : ` (${t("members.unconfirmed")})`}`}
            />
            <Info
              label={t("members.f.lastSeen")}
              value={m.lastSignInAt ? formatDateTime(m.lastSignInAt) : "-"}
            />
            <Info
              label={t("members.f.marketing")}
              value={m.marketingOptIn ? t("members.yes") : t("members.no")}
            />
            <Info label={t("members.f.points")} value={String(m.points)} />
            <Info label={t("members.f.credits")} value={String(m.credits)} />
            <Info label={t("members.f.practice")} value={String(m.practicePicks)} />
            {m.suspendedUntil && (
              <Info
                label={t("members.f.suspendedUntil")}
                value={formatDateTime(m.suspendedUntil)}
              />
            )}
            {m.limitedUntil && (
              <Info label={t("members.f.limitedUntil")} value={formatDateTime(m.limitedUntil)} />
            )}
          </dl>

          <div className="flex flex-wrap gap-2">
            {(["message", "warn", "account", "credits"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={panelOpen === p ? "default" : "outline"}
                onClick={() => setPanel(panelOpen === p ? null : p)}
              >
                {t(`members.action.${p}`)}
              </Button>
            ))}
            {!isAdmin && (
              <Button
                size="sm"
                variant={panelOpen === "restrict" ? "default" : "outline"}
                onClick={() => setPanel(panelOpen === "restrict" ? null : "restrict")}
              >
                {t("members.action.restrict")}
              </Button>
            )}
          </div>

          {panelOpen === "message" && (
            <div className="space-y-2">
              <Input
                placeholder={t("members.subject")}
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
              />
              <Textarea
                placeholder={t("members.message")}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                rows={4}
              />
              <Check
                label={t("members.alsoEmail")}
                checked={form.email}
                onChange={(v) => set("email", v)}
              />
              <Button
                disabled={busy}
                onClick={() =>
                  void run(
                    {
                      kind: "message",
                      subject: form.subject,
                      message: form.message,
                      email: form.email,
                      inApp: true,
                    },
                    t("members.sent"),
                  )
                }
              >
                {t("members.send")}
              </Button>
            </div>
          )}

          {panelOpen === "warn" && (
            <div className="space-y-2">
              <Input
                placeholder={t("members.reasonInternal")}
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
              />
              <Textarea
                placeholder={t("members.warnMessage")}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                rows={3}
              />
              <Check
                label={t("members.alsoEmail")}
                checked={form.email}
                onChange={(v) => set("email", v)}
              />
              <Button
                disabled={busy}
                onClick={() =>
                  void run(
                    { kind: "warn", reason: form.reason, message: form.message, email: form.email },
                    t("members.done"),
                  )
                }
              >
                {t("members.issueWarning")}
              </Button>
            </div>
          )}

          {panelOpen === "account" && (
            <div className="space-y-3">
              <Input
                placeholder={t("members.reason")}
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {(["free", "payg", "pro"] as const).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={m.accountType === type ? "default" : "outline"}
                    disabled={busy || m.accountType === type}
                    onClick={() =>
                      void run(
                        { kind: "account_type", accountType: type, reason: form.reason },
                        t("members.done"),
                      )
                    }
                  >
                    {t(`members.type.${type}`)}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("members.days")}</span>
                <Input
                  className="w-20"
                  inputMode="numeric"
                  value={form.days}
                  onChange={(e) => set("days", e.target.value)}
                />
                <span className="text-xs text-muted-foreground">{t("members.daysHint")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ENTITLEMENTS.map((e) => {
                  const has = m.entitlements.includes(e);
                  return (
                    <Button
                      key={e}
                      size="sm"
                      variant={has ? "default" : "outline"}
                      disabled={busy}
                      onClick={() =>
                        void run(
                          {
                            kind: "entitlement",
                            entitlement: e,
                            grant: !has,
                            days: form.days.trim() === "" ? null : Number(form.days),
                            reason: form.reason,
                          },
                          t("members.done"),
                        )
                      }
                    >
                      {has
                        ? t("members.revoke", { name: t(`members.ent.${e}`) })
                        : t("members.grant", { name: t(`members.ent.${e}`) })}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {panelOpen === "credits" && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="w-24"
                inputMode="numeric"
                value={form.credits}
                onChange={(e) => set("credits", e.target.value)}
                aria-label={t("members.creditsAmount")}
              />
              <Input
                className="min-w-[12rem] flex-1"
                placeholder={t("members.reason")}
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
              />
              <Button
                disabled={busy}
                onClick={() =>
                  void run(
                    { kind: "credits", credits: Number(form.credits), reason: form.reason },
                    t("members.done"),
                  )
                }
              >
                {t("members.applyCredits")}
              </Button>
              <p className="w-full text-xs text-muted-foreground">{t("members.creditsHint")}</p>
            </div>
          )}

          {panelOpen === "restrict" && !isAdmin && (
            <div className="space-y-3">
              <Input
                placeholder={t("members.reason")}
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("members.days")}</span>
                <Input
                  className="w-20"
                  inputMode="numeric"
                  value={form.days}
                  onChange={(e) => set("days", e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {m.limitedUntil ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run({ kind: "unlimit", reason: form.reason }, t("members.done"))
                    }
                  >
                    {t("members.unlimit")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        { kind: "limit", days: Number(form.days), reason: form.reason },
                        t("members.done"),
                      )
                    }
                  >
                    {t("members.limit")}
                  </Button>
                )}
                {m.suspendedUntil ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run({ kind: "unsuspend", reason: form.reason }, t("members.done"))
                    }
                  >
                    {t("members.unsuspend")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        { kind: "suspend", days: Number(form.days), reason: form.reason },
                        t("members.done"),
                      )
                    }
                  >
                    {t("members.suspend")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      { kind: "ban", banned: !m.isBanned, reason: form.reason },
                      t("members.done"),
                    )
                  }
                >
                  {m.isBanned ? t("members.unban") : t("members.ban")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("members.restrictHint")}</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-medium">{value}</dd>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Broadcast() {
  const { t } = useTranslation("admin");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(false);
  const [audience, setAudience] = useState<"all" | "founding" | "marketing">("all");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      const r = await adminBroadcast({ data: { subject, message, email, audience } });
      if (!r.ok) {
        toast.error(t("members.failed"));
        return;
      }
      toast.success(t("members.broadcastDone", { count: r.data?.queued ?? 0 }));
      setSubject("");
      setMessage("");
    } catch {
      toast.error(t("members.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={panel}>
      <h2 className="font-display text-lg font-bold">{t("members.broadcastTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("members.broadcastBody")}</p>
      <div className="mt-3 space-y-2">
        <Input
          placeholder={t("members.subject")}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <Textarea
          placeholder={t("members.message")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />
        <Check label={t("members.alsoEmail")} checked={email} onChange={setEmail} />
        {email && (
          <div className="flex flex-wrap gap-2">
            {(["all", "founding", "marketing"] as const).map((a) => (
              <Button
                key={a}
                size="sm"
                variant={audience === a ? "default" : "outline"}
                onClick={() => setAudience(a)}
              >
                {t(`members.audience.${a}`)}
              </Button>
            ))}
          </div>
        )}
        <Button disabled={busy} onClick={() => void send()}>
          {t("members.broadcastSend")}
        </Button>
      </div>
    </section>
  );
}
