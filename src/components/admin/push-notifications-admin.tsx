import { useCallback, useEffect, useState } from "react";
import { BellRing, LoaderCircle, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { pushApiRequest } from "@/lib/push-notifications";

type Campaign = {
  id: string;
  title: string;
  body: string;
  audience: string;
  status: string;
  attempted_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
};
type Overview = {
  activeSubscriptions: number;
  sent30d: number;
  failed30d: number;
  campaigns: Campaign[];
};
type Audience = "all" | "founding" | "member";

const panel = "card-surface p-5";

export function PushNotificationsAdmin() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetUrl, setTargetUrl] = useState("/predictions");
  const [audience, setAudience] = useState<Audience>("all");
  const [username, setUsername] = useState("");

  const refresh = useCallback(async () => {
    const data = await pushApiRequest<Overview>({ action: "overview" });
    setOverview(data);
  }, []);

  useEffect(() => {
    let active = true;
    void refresh().catch((error) => {
      if (active) toast.error(error instanceof Error ? error.message : "Couldn't load push controls.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [refresh]);

  async function dispatch(test: boolean) {
    setBusy(true);
    try {
      const data = await pushApiRequest<{ ok?: boolean; error?: string; sent?: number; failed?: number }>({
        action: test ? "test" : "dispatch",
        title: test ? "Puntr test notification" : title,
        message: test ? "Push notifications are working on this device." : message,
        targetUrl: test ? "/predictions?source=push-test" : targetUrl,
        audience,
        username,
      });
      if (!data?.ok && !test) throw new Error(data?.error || "Push campaign failed.");
      if (test && data?.ok !== true) throw new Error(data?.error || "Test notification failed.");
      toast.success(test ? "Test notification sent to your active devices." : `Push sent: ${data.sent} delivered, ${data.failed} failed.`);
      if (!test) {
        setTitle("");
        setMessage("");
      }
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Push delivery failed.");
    } finally {
      setBusy(false);
    }
  }

  const valid = title.trim().length >= 3 && title.trim().length <= 120 &&
    message.trim().length >= 3 && message.trim().length <= 220 &&
    (audience !== "member" || /^[a-z0-9_.-]{2,40}$/i.test(username.trim().replace(/^@/, "")));

  return (
    <div className="space-y-5">
      <section className={panel}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><BellRing className="size-5" /></span>
          <div><h2 className="text-lg font-semibold">Push notification control panel</h2><p className="text-sm text-muted-foreground">Manage opt-in reach, send campaigns and monitor delivery.</p></div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">Active devices</p><p className="mt-1 text-2xl font-bold tabular-nums">{loading ? "—" : overview?.activeSubscriptions ?? 0}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">Delivered · 30 days</p><p className="mt-1 text-2xl font-bold tabular-nums">{loading ? "—" : overview?.sent30d ?? 0}</p></div>
          <div className="rounded-xl border border-border p-4"><p className="text-xs text-muted-foreground">Failed / expired · 30 days</p><p className="mt-1 text-2xl font-bold tabular-nums">{loading ? "—" : overview?.failed30d ?? 0}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy || loading} onClick={() => void dispatch(true)}><Smartphone className="mr-2 size-4" />Send test to my devices</Button>
          <Button variant="outline" disabled={busy} onClick={() => void refresh()}>Refresh metrics</Button>
        </div>
      </section>

      <section className={panel}>
        <h3 className="text-lg font-semibold">Compose push campaign</h3>
        <p className="mt-1 text-sm text-muted-foreground">Push notifications are sent only to members who explicitly opted in. Existing in-app notifications are managed separately.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-3">
            <Input value={title} maxLength={120} placeholder="Notification title (3–120 characters)" onChange={(e) => setTitle(e.target.value)} />
            <div><Textarea value={message} maxLength={220} rows={3} placeholder="Short message (3–220 characters)" onChange={(e) => setMessage(e.target.value)} /><p className="mt-1 text-right text-xs text-muted-foreground">{message.length}/220</p></div>
            <Input value={targetUrl} maxLength={300} placeholder="/predictions" onChange={(e) => setTargetUrl(e.target.value)} />
            <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Audience</p><div className="flex flex-wrap gap-2">{(["all", "founding", "member"] as const).map((value) => <Button key={value} size="sm" variant={audience === value ? "default" : "outline"} onClick={() => setAudience(value)}>{value === "all" ? "All opted-in members" : value === "founding" ? "Founding Members" : "One member"}</Button>)}</div>{audience === "member" && <Input className="mt-3 max-w-xs" value={username} placeholder="Member username" onChange={(e) => setUsername(e.target.value)} />}</div>
            <Button disabled={!valid || busy || loading} onClick={() => void dispatch(false)}>{busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}Send push notification</Button>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
            <div className="mt-3 rounded-xl border border-border bg-[#101010] p-4 text-white">
              <p className="text-xs font-bold text-[#4ADE80]">puntr.</p>
              <p className="mt-3 text-sm font-bold">{title || "Your notification title"}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/70">{message || "Your notification message will appear here."}</p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">The browser and operating system control final notification appearance.</p>
          </div>
        </div>
      </section>

      <section className={panel}>
        <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Recent campaigns</h3><span className="text-xs text-muted-foreground">Last 30 days</span></div>
        {loading ? <p className="mt-3 text-sm text-muted-foreground">Loading campaign history…</p> : !overview?.campaigns.length ? <p className="mt-3 text-sm text-muted-foreground">No push campaigns yet.</p> : (
          <div className="mt-3 divide-y divide-border">{overview.campaigns.map((campaign) => <div key={campaign.id} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{campaign.title}</p><span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase">{campaign.status}</span></div><p className="mt-1 text-sm text-muted-foreground">{campaign.body}</p><p className="mt-2 text-xs text-muted-foreground">{campaign.audience} · {campaign.sent_count}/{campaign.attempted_count} delivered · {campaign.failed_count} failed · {new Date(campaign.created_at).toLocaleString("en-ZA")}</p></div>)}</div>
        )}
      </section>
    </div>
  );
}
