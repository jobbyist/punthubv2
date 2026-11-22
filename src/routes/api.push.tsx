import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

type Audience = "all" | "founding" | "member" | "test";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function targetPath(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "/predictions";
  const raw = value.trim();
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) throw new Error("Push links must be internal Puntr paths.");
  const url = new URL(raw, "https://puntr.co.za");
  if (url.origin !== "https://puntr.co.za" || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/admin/")) {
    throw new Error("This destination is not available for push notifications.");
  }
  return url.pathname + url.search + url.hash;
}

function getServerClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Supabase server configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function requireVapid() {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"] || "mailto:support@puntr.co.za";
  if (!publicKey || !privateKey) throw new Error("Push delivery is not configured. Add the VAPID secrets to Vercel.");
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export const Route = createFileRoute("/api/push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const origin = request.headers.get("origin");
          if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: "Cross-origin request rejected." }, 403);
          const authorization = request.headers.get("authorization") || "";
          const token = authorization.replace(/^Bearer\s+/i, "");
          if (!token) return json({ error: "Authentication required." }, 401);
          const db = getServerClient();
          const { data: authData, error: authError } = await db.auth.getUser(token);
          if (authError || !authData.user) return json({ error: "Your session has expired. Sign in again." }, 401);
          const user = authData.user;
          const { data: profile } = await db.from("profiles").select("id,role,is_banned,username,founding_number").eq("id", user.id).maybeSingle();
          if (!profile || profile.is_banned) return json({ error: "An active Puntr member account is required." }, 403);
          const raw = await request.text();
          if (raw.length > 20_000) return json({ error: "Request too large." }, 413);
          let body: Record<string, unknown>;
          try { body = JSON.parse(raw) as Record<string, unknown>; } catch { return json({ error: "Invalid request body." }, 400); }
          const action = body.action;

          if (action === "status") {
            const { count, error } = await db.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("enabled", true);
            if (error) return json({ error: "Could not load notification status." }, 500);
            return json({ enabled: (count ?? 0) > 0, activeCount: count ?? 0 });
          }

          if (action === "subscribe") {
            const sub = body.subscription as { endpoint?: string; expirationTime?: number | null; keys?: { p256dh?: string; auth?: string } } | undefined;
            if (!sub?.endpoint || sub.endpoint.length > 2048 || !sub.endpoint.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth || sub.keys.p256dh.length > 256 || sub.keys.auth.length > 256) {
              return json({ error: "Invalid browser push subscription." }, 400);
            }
            const { error } = await db.from("push_subscriptions").upsert({
              user_id: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth,
              expiration_time: sub.expirationTime ?? null,
              user_agent: typeof body.userAgent === "string" ? body.userAgent.slice(0, 300) : null,
              enabled: true, updated_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
            }, { onConflict: "endpoint" });
            if (error) return json({ error: "Could not save this device subscription." }, 500);
            return json({ ok: true });
          }

          if (action === "unsubscribe") {
            const { error } = await db.from("push_subscriptions").delete().eq("user_id", user.id);
            if (error) return json({ error: "Could not turn off push notifications." }, 500);
            return json({ ok: true });
          }

          if (action !== "overview" && action !== "dispatch" && action !== "test") return json({ error: "Unknown action." }, 400);
          if (profile.role !== "admin") return json({ error: "Admin access required." }, 403);

          if (action === "overview") {
            const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
            const [subs, campaigns, sent, failed] = await Promise.all([
              db.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("enabled", true),
              db.from("push_notification_campaigns").select("id,title,body,audience,status,attempted_count,sent_count,failed_count,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(30),
              db.from("push_notification_deliveries").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", since),
              db.from("push_notification_deliveries").select("id", { count: "exact", head: true }).neq("status", "sent").gte("sent_at", since),
            ]);
            if (subs.error || campaigns.error || sent.error || failed.error) return json({ error: "Could not load push campaign overview." }, 500);
            return json({ activeSubscriptions: subs.count ?? 0, sent30d: sent.count ?? 0, failed30d: failed.count ?? 0, campaigns: campaigns.data ?? [] });
          }

          const title = typeof body.title === "string" ? body.title.trim() : "";
          const message = typeof body.message === "string" ? body.message.trim() : "";
          if (title.length < 3 || title.length > 120 || message.length < 3 || message.length > 220) return json({ error: "Title must be 3–120 characters and message 3–220 characters." }, 400);
          const audience = action === "test" ? "test" : body.audience;
          if (!["all", "founding", "member", "test"].includes(String(audience))) return json({ error: "Invalid audience." }, 400);

          let targetUserIds: string[] | null = null;
          if (audience === "test") targetUserIds = [user.id];
          if (audience === "founding") {
            const { data, error } = await db.from("profiles").select("id").not("founding_number", "is", null).eq("is_banned", false);
            if (error) return json({ error: "Could not resolve founding members." }, 500);
            targetUserIds = (data ?? []).map((row) => row.id);
          }
          if (audience === "member") {
            const username = typeof body.username === "string" ? body.username.trim().replace(/^@/, "") : "";
            if (!/^[a-z0-9_.-]{2,40}$/i.test(username)) return json({ error: "Enter a valid member username." }, 400);
            const { data } = await db.from("profiles").select("id").ilike("username", username).eq("is_banned", false).maybeSingle();
            if (!data) return json({ error: "Member not found." }, 404);
            targetUserIds = [data.id];
          }
          let destination: string;
          try { destination = targetPath(body.targetUrl); } catch (error) { return json({ error: error instanceof Error ? error.message : "Invalid destination." }, 400); }
          const query = db.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").eq("enabled", true);
          const { data: subscriptions, error: subError } = targetUserIds ? await query.in("user_id", targetUserIds) : await query;
          if (subError) return json({ error: "Could not load active device subscriptions." }, 500);
          const { data: campaign, error: campaignError } = await db.from("push_notification_campaigns").insert({
            title, body: message, target_url: destination, audience, created_by: user.id, status: "sending",
          }).select("id").single();
          if (campaignError || !campaign) return json({ error: "Could not create push campaign." }, 500);
          const list = subscriptions ?? [];
          let sentCount = 0;
          let failedCount = 0;
          if (list.length > 0) {
            try { requireVapid(); } catch (error) {
              await db.from("push_notification_campaigns").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", campaign.id);
              return json({ error: error instanceof Error ? error.message : "VAPID configuration missing." }, 503);
            }
            const payload = JSON.stringify({ title, body: message, url: destination, campaignId: campaign.id, tag: `puntr-${campaign.id}` });
            for (let offset = 0; offset < list.length; offset += 20) {
              const batch = list.slice(offset, offset + 20);
              const results = await Promise.all(batch.map(async (item) => {
                try {
                  const result = await webpush.sendNotification({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } }, payload, { TTL: 86_400 });
                  return { item, status: "sent" as const, statusCode: result.statusCode, error: null };
                } catch (error) {
                  const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number((error as { statusCode: unknown }).statusCode) : null;
                  return { item, status: statusCode === 404 || statusCode === 410 ? "expired" as const : "failed" as const, statusCode, error: error instanceof Error ? error.message.slice(0, 500) : "Delivery failed" };
                }
              }));
              for (const result of results) {
                if (result.status === "sent") sentCount += 1; else failedCount += 1;
                await db.from("push_notification_deliveries").insert({ campaign_id: campaign.id, subscription_id: result.item.id, user_id: result.item.user_id, status: result.status, status_code: result.statusCode, error: result.error });
                if (result.status === "expired") await db.from("push_subscriptions").delete().eq("id", result.item.id);
              }
            }
          }
          const status = failedCount === 0 ? "sent" : sentCount > 0 ? "partial" : "failed";
          await db.from("push_notification_campaigns").update({ status, attempted_count: list.length, sent_count: sentCount, failed_count: failedCount, completed_at: new Date().toISOString() }).eq("id", campaign.id);
          return json({ ok: true, campaignId: campaign.id, attempted: list.length, sent: sentCount, failed: failedCount });
        } catch (error) {
          console.error("push API failure", error);
          return json({ error: error instanceof Error ? error.message : "Push notification request failed." }, 500);
        }
      },
    },
  },
});
