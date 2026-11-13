import { Check, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { supabase } from "@/integrations/supabase/client";
import { profileCompletion, type CompletionInput } from "@/lib/quests";

/** Profile completion tracker on the account page. Completing it also completes the "Complete your profile" quest. */
export function ProfileCompletion() {
  const { t } = useTranslation("quests");
  const { profile, emailConfirmed, hasMfa } = useSession();
  const [extra, setExtra] = useState<Pick<CompletionInput, "details" | "identityVerified"> | null>(
    null,
  );

  useEffect(() => {
    if (!profile) return;
    let live = true;
    const load = async () => {
      const [details, identity] = await Promise.all([
        supabase
          .from("member_details")
          .select("first_name, last_name, phone, date_of_birth, province")
          .eq("user_id", profile.id)
          .maybeSingle(),
        supabase
          .from("identity_verifications")
          .select("status")
          .eq("user_id", profile.id)
          .maybeSingle(),
      ]);
      if (live)
        setExtra({
          details: details.data ?? null,
          identityVerified: identity.data?.status === "verified",
        });
    };
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("puntr:details-saved", onFocus);
    return () => {
      live = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("puntr:details-saved", onFocus);
    };
  }, [profile]);

  if (!profile || !extra) return null;
  const { percent, items } = profileCompletion({
    avatarUrl: profile.avatar_url,
    displayName: profile.display_name,
    emailConfirmed,
    hasMfa,
    ...extra,
  });

  return (
    <section className="card-surface mt-6 p-5" aria-labelledby="completion-title">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="completion-title" className="text-lg">
            {t("completion.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {percent === 100 ? t("completion.done") : t("completion.body")}
          </p>
        </div>
        <span className="font-display text-3xl font-extrabold tnum text-primary">{percent}%</span>
      </div>
      <div
        className="mt-3 h-2 bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-labelledby="completion-title"
      >
        <div
          className="h-full bg-primary transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.key}>
            <a
              href={i.href}
              className={`flex items-center gap-2 text-sm ${i.done ? "text-muted-foreground line-through" : "font-semibold hover:text-primary"}`}
            >
              {i.done ? (
                <Check className="size-4 text-primary" aria-hidden="true" />
              ) : (
                <Circle className="size-4 text-muted-foreground" aria-hidden="true" />
              )}
              {t(`completion.item.${i.key}`)}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
