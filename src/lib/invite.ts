import { analytics } from "@/lib/analytics";
import { inviteUrl } from "@/lib/referral";

/** Copy the invite link to the clipboard. Returns whether it worked. */
export async function copyInviteLink(code: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(inviteUrl(code));
    analytics.referralLinkCopied();
    return true;
  } catch {
    return false;
  }
}
