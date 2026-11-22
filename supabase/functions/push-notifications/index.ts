import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type Audience = "all" | "founding" | "member" | "test";
type SubscriptionInput = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: { p256dh?: string; auth?: string };
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function cleanTarget(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "/predictions";
  const raw = value.trim();
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    throw new Error("Push links must be internal Puntr paths.");
  }
  const url = new URL(raw, "https://puntr.co.za");
  if (url.origin !== "https://puntr.co.za" || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/admin/")) {
    throw new Error("This destination is not available for push notifications.");
  }
  return url.pathname + url.search + url.hash;
}

function requireVapid() {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@puntr.co.za";
  if (!publicKey || !privateKey) throw new Error("Push delivery is not configured. Add the VAPID secrets to Supabase Edge Function secrets.");
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return response({ error: "Server configuration is incomplete." }, 500);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return response({ error: "Authentication required." }, 401);

  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return response({ error: "Your session has expired. Sign in again." }, 401);
  const user = authData.user;
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile } = await db.from("profiles").select("id, role, is_banned, username, founding_number").eq("id", user.id).maybeSingle();
  if (!profile || profile.is_banned) return response({ error: "An active Puntr member account is required." }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return response({ error: "Invalid request body." }, 400); }
  const action = body.action;

  if (action === "status") {
    const { count, error } = await db.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("enabled", true);
    if (error) return response({ error: "Could not load notification status." }, 500);
    return response({ enabled: (count ?? 0) > 0, activeCount: count ?? 0 });
  }

  if (action === "subscribe") {
    const sub = body.subscription as SubscriptionInput | undefined;
    if (!sub?.endpoint || sub.endpoint.length > 2048 || !sub.endpoint.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth || sub.keys.p256dh.length > 256 || sub.keys.auth.length > 256) {
      return response({ error: "Invalid browser push subscription." }, 400);
    }
    const { error } = await db.from("push_subscriptions").upsert({
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      expiration_time: sub.expirationTime ?? null,
      user_agent: typeof body.userAgent === "string" ? body.userAgent.slice(0, 300) : null,
      enabled: true,
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    if (error) return response({ error: "Could not save this device subscription." }, 500);
    return response({ ok: true });
  }

  if (action === "unsubscribe") {
    const { error } = await db.from("push_subscriptions").delete().eq("user_id", user.id);
    if (error) return response({ error: "Could not turn off push notifications." }, 500);
    return response({ ok: true });
  }

  if (action === "overview" || action === "dispatch" || action === "test") {
    if (profile.role !== "admin") return response({ error: "Admin access required." }, 403);
    if (action === "overview") {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const [subs, campaigns, sent, failed] = await Promise.all([
        db.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("enabled", true),
        db.from("push_notification_campaigns").select("id,title,body,audience,status,attempted_count,sent_count,failed_count,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(30),
        db.from("push_notification_deliveries").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", since),
        db.from("push_notification_deliveries").select("id", { count: "exact", head: true }).neq("status", "sent").gte("sent_at", since),
      ]);
      if (subs.error || campaigns.error || sent.error || failed.error) return response({ error: "Could not load push campaign overview." }, 500);
      return response({ activeSubscriptions: subs.count ?? 0, sent30d: sent.count ?? 0, failed30d: failed.count ?? 0, campaigns: campaigns.data ?? [] });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (title.length < 3 || title.length > 120 || message.length < 3 || message.length > 220) {
      return response({ error: "Title must be 3–120 characters and message 3–220 characters." }, 400);
    }
    const audience = action === "test" ? "test" : body.audience;
    if (!["all", "founding", "member", "test"].includes(String(audience))) return response({ error: "Invalid audience." }, 400);
    let targetUserIds: string[] | null = null;
    if (audience === "test") targetUserIds = [user.id];
    if (audience === "founding") {
      const { data, error } = await db.from("profiles").select("id").not("founding_number", "is", null).eq("is_banned", false);
      if (error) return response({ error: "Could not resolve founding members." }, 500);
      targetUserIds = (data ?? []).map((row) => row.id);
    }
    if (audience === "member") {
      const username = typeof body.username === "string" ? body.username.trim().replace(/^@/, "") : "";
      if (!/^[a-z0-9_.-]{2,40}$/i.test(username)) return response({ error: "Enter a valid member username." }, 400);
      const { data } = await db.from("profiles").select("id").ilike("username", username).eq("is_banned", false).maybeSingle();
      if (!data) return response({ error: "Member not found." }, 404);
      targetUserIds = [data.id];
    }

    let targetUrl: string;
    try { targetUrl = cleanTarget(body.targetUrl); } catch (error) { return response({ error: error instanceof Error ? error.message : "Invalid destination." }, 400); }

    const query = db.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").eq("enabled", true);
    const { data: subscriptions, error: subscriptionError } = targetUserIds
      ? await query.in("user_id", targetUserIds)
      : await query;
    if (subscriptionError) return response({ error: "Could not load active device subscriptions." }, 500);

    const { data: campaign, error: campaignError } = await db.from("push_notification_campaigns").insert({
      title, body: message, target_url: targetUrl, audience, created_by: user.id, status: "sending",
    }).select("id").single();
    if (campaignError || !campaign) return response({ error: "Could not create push campaign." }, 500);

    const list = subscriptions ?? [];
    let sentCount = 0;
    let failedCount = 0;
    if (list.length > 0) {
      try { requireVapid(); } catch (error) {
        await db.from("push_notification_campaigns").update({ status: "failed", attempted_count: 0, failed_count: 0, completed_at: new Date().toISOString() }).eq("id", campaign.id);
        return response({ error: error instanceof Error ? error.message : "VAPID configuration missing." }, 503);
      }
      const payload = JSON.stringify({ title, body: message, url: targetUrl, campaignId: campaign.id, tag: `puntr-${campaign.id}` });
      for (let offset = 0; offset < list.length; offset += 20) {
        const batch = list.slice(offset, offset + 20);
        const results = await Promise.all(batch.map(async (item) => {
          try {
            const result = await webpush.sendNotification({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } }, payload, { TTL: 60 * 60 * 24 });
            return { item, status: "sent" as const, statusCode: result.statusCode, error: null };
          } catch (error) {
            const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number((error as { statusCode: unknown }).statusCode) : null;
            const expired = statusCode === 404 || statusCode === 410;
            return { item, status: expired ? "expired" as const : "failed" as const, statusCode, error: error instanceof Error ? error.message.slice(0, 500) : "Delivery failed" };
          }
        }));
        for (const result of results) {
          if (result.status === "sent") sentCount += 1; else failedCount += 1;
          await db.from("push_notification_deliveries").insert({
            campaign_id: campaign.id,
            subscription_id: result.item.id,
            user_id: result.item.user_id,
            status: result.status,
            status_code: result.statusCode,
            error: result.error,
          });
          if (result.status === "expired") {
            await db.from("push_subscriptions").delete().eq("id", result.item.id);
          }
        }
      }
    }
    const status = failedCount === 0 ? "sent" : sentCount > 0 ? "partial" : "failed";
    await db.from("push_notification_campaigns").update({
      status, attempted_count: list.length, sent_count: sentCount, failed_count: failedCount, completed_at: new Date().toISOString(),
    }).eq("id", campaign.id);
    return response({ ok: true, campaignId: campaign.id, attempted: list.length, sent: sentCount, failed: failedCount });
  }

  return response({ error: "Unknown action." }, 400);
});
