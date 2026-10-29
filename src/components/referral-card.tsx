import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { copyInviteLink } from "@/lib/invite";
import { inviteText, inviteUrl, whatsappUrl } from "@/lib/referral";

/** The member's invite link with Copy and WhatsApp, and how many friends have joined. */
export function ReferralCard() {
  const { t } = useTranslation("account");
  const { profile } = useSession();
  const { data } = useAsync(async () => {
    const { data: rows } = await supabase.rpc("my_referral_counts");
    return rows?.[0] ?? { signed_up: 0, joined: 0 };
  }, [profile?.id]);

  if (!profile?.referral_code) return null;
  const code = profile.referral_code;

  const copy = async () => {
    const copied = await copyInviteLink(code);
    if (copied) toast.success(t("invite.copied"));
    else toast.error(t("invite.copyFailed"));
  };

  return (
    <section className="card-surface mt-4 p-5" id="invite" aria-labelledby="invite-title">
      <h2 id="invite-title" className="text-lg">
        {t("invite.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("invite.body")}</p>
      <p className="mt-3 break-all border border-border bg-muted/40 p-3 font-mono text-xs">
        {inviteUrl(code)}
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => void copy()}>
          {t("invite.copy")}
        </Button>
        <Button asChild variant="outline">
          <a
            href={whatsappUrl(inviteText(code))}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => analytics.shareClicked("invite")}
          >
            {t("invite.whatsapp")}
          </a>
        </Button>
      </div>
      <p className="mt-4 text-sm font-semibold tnum">
        {t("invite.joined", { count: data?.joined ?? 0 })}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("invite.signedUp", { count: data?.signed_up ?? 0 })} {t("invite.rule")}
      </p>
      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        {t("invite.rewards")}
      </p>
    </section>
  );
}
