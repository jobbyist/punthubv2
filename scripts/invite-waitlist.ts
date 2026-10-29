/**
 * bun run waitlist:invite              dry run (default): prints who would be emailed and the count
 * bun run waitlist:invite --dry-run    the same, explicitly
 * bun run waitlist:invite --send       actually sends. Do NOT use until the attorney has agreed the approach (D11).
 * Options: --limit N   send to at most N people in this run.
 *
 * This is ONE service email about the early access people asked for. No promotion, partner content or giveaway.
 * Skipped: invalid or duplicate addresses, anyone already emailed (waitlist_invites), anyone who unsubscribed
 * (waitlist_unsubscribes), and anyone with a row in privacy_requests. Every send is logged so re-runs skip people.
 *
 * Environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WAITLIST_LINK_SECRET, and for --send also
 * LOVABLE_API_KEY and RESEND_API_KEY.
 */
import { supabaseAdmin } from "../src/integrations/supabase/client.server";
import { renderWaitlistInvite } from "../src/lib/email/waitlist-invite";
import { REPLY_TO, sendViaResend } from "../src/lib/email/resend.server";
import { planInvites, unsubscribeUrl } from "../src/lib/waitlist";

const FOUNDING_CAP = 100;
const args = process.argv.slice(2);
const send = args.includes("--send") && !args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
if (limitIdx >= 0 && !(limit > 0)) {
  console.error("--limit needs a positive number.");
  process.exit(1);
}

const secret = process.env["WAITLIST_LINK_SECRET"];
if (!secret) {
  console.error("Set WAITLIST_LINK_SECRET (signs the unsubscribe links).");
  process.exit(1);
}

type EmailTable =
  "early_access" | "waitlist_invites" | "waitlist_unsubscribes" | "privacy_requests";

/** Every email address in a table, paged so large waitlists are read in full. */
async function emails(table: EmailTable, onlySent = false): Promise<string[]> {
  const out: string[] = [];
  for (let from = 0; ; from += 1000) {
    const base = supabaseAdmin.from(table).select("email");
    const { data, error } = await (onlySent && table === "waitlist_invites"
      ? supabaseAdmin
          .from("waitlist_invites")
          .select("email")
          .eq("status", "sent")
          .range(from, from + 999)
      : base.range(from, from + 999));
    if (error) throw error;
    out.push(...(data ?? []).map((r) => r.email));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const [waitlist, invited, unsubscribed, privacy] = await Promise.all([
  emails("early_access"),
  emails("waitlist_invites", true),
  emails("waitlist_unsubscribes"),
  emails("privacy_requests"),
]);

const plan = planInvites({
  waitlist,
  alreadyInvited: invited,
  unsubscribed,
  privacyRequests: privacy,
});
const { count: taken } = await supabaseAdmin
  .from("profiles")
  .select("id", { count: "exact", head: true })
  .not("founding_number", "is", null);
const spotsLeft = taken === null ? null : Math.max(0, FOUNDING_CAP - taken);

const batch = plan.recipients.slice(0, Number.isFinite(limit) ? limit : undefined);
console.log(`Waitlist rows: ${waitlist.length}`);
console.log(
  `To email: ${plan.recipients.length}${batch.length < plan.recipients.length ? ` (this run: ${batch.length})` : ""}`,
);
console.log("Skipped:", JSON.stringify(plan.skipped));
console.log(`Founding spots left: ${spotsLeft ?? "unknown"}`);

if (!send) {
  for (const e of batch) console.log(`  would send to ${e}`);
  console.log(
    `\nDRY RUN. Nothing was sent. Add --send only once the attorney has agreed the approach (D11).`,
  );
  process.exit(0);
}

let sent = 0;
let failed = 0;
for (const email of batch) {
  const mail = renderWaitlistInvite({
    spotsLeft,
    cap: FOUNDING_CAP,
    unsubscribeUrl: unsubscribeUrl(email, secret),
  });
  const result = await sendViaResend({
    to: [email],
    reply_to: REPLY_TO,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
  const row = result.ok
    ? { email, status: "sent", detail: null }
    : { email, status: "failed", detail: `${result.status} ${result.body}`.slice(0, 300) };
  // Logged after every send so a crash or a re-run never emails the same person twice.
  const { error } = await supabaseAdmin
    .from("waitlist_invites")
    .upsert(row, { onConflict: "email" });
  if (error) console.error(`Could not log ${email}:`, error.message);
  if (result.ok) sent++;
  else failed++;
  await new Promise((r) => setTimeout(r, 600));
}
console.log(`Sent ${sent}, failed ${failed}.`);
