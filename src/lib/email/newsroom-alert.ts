/** Email to the owner after each scheduled newsroom run (relative imports only). */
import { SITE } from "../launch";
import type { ContentNotice } from "../content/pipeline";
import { buildEmail } from "./founding-shared";

export const NEWSROOM_ALERT_TO = "admin@puntr.co.za";

export function newsroomAlertEmail(n: ContentNotice) {
  if (n.kind === "failure")
    return buildEmail({
      subject: `Newsroom: today's article failed (attempt ${n.attempt})`,
      preheader: "The scheduled article could not be produced.",
      heading: "Today's article failed",
      greeting: "Hi Michael,",
      paragraphs: [
        `The scheduled newsroom run failed on attempt ${n.attempt}. It retries at 06:20 and 06:40 SAST; after that, generate one from the Newsroom desk.`,
        `Reason: ${n.error.slice(0, 300)}`,
      ],
      cta: { label: "Open the Newsroom desk", url: `${SITE}/admin` },
      reason: "Puntr admin alert for the automated newsroom.",
    });
  const failed = !n.passed;
  return buildEmail({
    subject:
      `${n.published ? "Published" : "Waiting for review"}${failed ? " (failed checks)" : ""}: ${n.title}`.slice(
        0,
        150,
      ),
    preheader: failed
      ? `Quality score ${n.score}. Review it and unpublish if needed.`
      : `Quality score ${n.score}. Passed every check.`,
    heading: n.published ? "Today's article is live" : "Today's article is waiting for review",
    greeting: "Hi Michael,",
    paragraphs: [
      `"${n.title}" ${n.published ? "was published on schedule" : "is in the review queue"}. Quality score: ${n.score}.`,
      failed
        ? "It did not pass every check. Read it now; if anything is wrong, unpublish it on the Newsroom desk and generate a new article."
        : "It passed every check.",
    ],
    ...(n.issues.length > 0 ? { panel: { title: "Checks", lines: n.issues.slice(0, 12) } } : {}),
    cta: { label: "Review on the Newsroom desk", url: `${SITE}/admin` },
    afterCta: [`Article: ${SITE}/newsroom/${n.slug}`],
    reason: "Puntr admin alert for the automated newsroom.",
  });
}
