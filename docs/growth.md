# Growth mechanics (P10)

## Founding counter

`getFoundingSpots` (server function, cached 60 seconds per server instance) reads the public `founding_spots_taken()` function. Shown in the home hero, on `/join` and beside the header CTA ("63 of 100 Founding spots left"); at zero it reads "Founding spots are full". If the count cannot be read nothing is shown, never a wrong number. Deleted accounts keep their number, so the count only goes up.

## Referrals

- Link: `https://puntr.co.za/join?ref=<referral_code>`. The code is random and identifies no one. Shown with Copy and WhatsApp on `/account`, on your own profile, and in the account menu.
- A referral counts only when the referred member posts their **first pick** (trigger `predictions_referral_reward`), once per member. That creates one `referral_rewards` row: 15 credits each side, status `pending`. Nothing is granted until Pay-As-You-Go credits launch; the page says so. Credits have no cash value.
- `my_referral_counts()` gives the member their own "friends who joined" (first pick posted) and "signed up" numbers, with no names.
- A shared pick link (`/match/<id>?ref=<code>`) also keeps the sharer's code until the visitor joins.
- Known gap: nothing stops one person making several accounts to farm the (pending) credits. Review `referral_rewards` before granting anything, and decide the checks then.

## Waitlist invite (decision D11: do not send yet)

`bun run waitlist:invite` is a **dry run by default**: it prints how many people would be emailed and who. Sending needs `--send` (and optionally `--limit N`). **Do not run `--send` until the attorney has agreed the approach.**

It is one service email, "Your Puntr early-access spot is open", about the early access people asked for. No promotion, partner content or giveaway. Later marketing goes only to members who ticked the unticked box on `/join` (`profiles.marketing_opt_in`).

Skipped: invalid or duplicate addresses, anyone already emailed (`waitlist_invites`), anyone who unsubscribed (`waitlist_unsubscribes`), anyone with a row in `privacy_requests`. Each send is logged straight after it happens, so a crash or re-run never emails someone twice; failed sends are logged and retried on the next run.

Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WAITLIST_LINK_SECRET` (signs unsubscribe links; also set it in Vercel so `/unsubscribe` can verify them), and for `--send` `LOVABLE_API_KEY` and `RESEND_API_KEY`.

The unsubscribe link opens `/unsubscribe`, which asks for one click so an email scanner cannot unsubscribe someone by accident.

Note: the new Supabase project's `early_access` table is empty. The earlier waitlist lived in the old Lovable project and the five known sign-ups still need adding.

## Events

`join_started`, `otp_verified`, `profile_created`, `referral_link_copied`, `share_clicked` (all behind analytics consent).

## Skipped on purpose

An Open Graph image for `/match/$fixtureId`: not cheap in this setup. Shares are text links for now.
