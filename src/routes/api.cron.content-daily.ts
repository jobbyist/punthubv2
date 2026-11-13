import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Daily content run. Scheduled by pg_cron at 04:00 UTC (06:00 SAST), with retry calls at 04:20 and 04:40 that do
 * nothing once the day's job has succeeded. `Authorization: Bearer ${CRON_SECRET}` is required.
 *
 *   ?dry=1               run everything except saving the article
 *   ?kind=sports|development   choose the kind for this run (a separate manual job)
 *   ?force=1             rerun today's job after a failure
 */
export const Route = createFileRoute("/api/cron/content-daily")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const url = new URL(request.url);
        const kindParam = url.searchParams.get("kind");
        const kind = kindParam === "sports" || kindParam === "development" ? kindParam : undefined;
        const force = url.searchParams.get("force") === "1";
        const dry = url.searchParams.get("dry") === "1";
        const manual = kind !== undefined || force || dry;

        const { readContentEnv } = await import("@/lib/content/config");
        const { createGemini, createPageReader, createParallelSearch } =
          await import("@/lib/content/providers.server");
        const { createContentStore } = await import("@/lib/content/store.server");
        const { runContentJob } = await import("@/lib/content/pipeline");

        const { createQuotaClaim, guardExtract, guardLlm, guardSearch } =
          await import("@/lib/quota.server");
        const claim = await createQuotaClaim();
        const env = readContentEnv();
        try {
          const outcome = await runContentJob(
            {
              store: createContentStore(),
              env,
              search: env.parallelKey
                ? guardSearch(createParallelSearch(env.parallelKey), claim)
                : null,
              extract: createPageReader(
                { firecrawl: env.firecrawlKey, parallel: env.parallelKey },
                (r) => guardExtract(r, claim),
              ),
              llm: env.geminiKey ? guardLlm(createGemini(env.geminiKey), claim) : null,
              notify: async (notice) => {
                const { newsroomAlertEmail, NEWSROOM_ALERT_TO } =
                  await import("@/lib/email/newsroom-alert");
                const { sendViaResend, REPLY_TO } = await import("@/lib/email/resend.server");
                const email = newsroomAlertEmail(notice);
                const res = await sendViaResend({
                  to: [process.env["NEWSROOM_ALERT_EMAIL"] || NEWSROOM_ALERT_TO],
                  subject: email.subject,
                  html: email.html,
                  text: email.text,
                  reply_to: REPLY_TO,
                  tags: [{ name: "category", value: "newsroom_alert" }],
                });
                if (!res.ok) console.error("content-daily: admin alert not sent", res.status);
              },
            },
            {
              trigger: manual ? "manual" : "cron",
              ...(kind ? { kind } : {}),
              force,
              dry,
            },
          );
          console.info("content-daily", JSON.stringify({ ok: outcome.ok, status: outcome.status }));
          return Response.json(outcome, { status: outcome.ok ? 200 : 500 });
        } catch (error) {
          // Only reached when the database itself cannot be read or the job cannot be claimed.
          console.error("content-daily failed before a job was recorded", error);
          return Response.json({ ok: false, error: "content_run_failed" }, { status: 500 });
        }
      },
    },
  },
});
