-- QA audit, 14 Nov 2026. Three faults found on the live project, plus the quota rows for the new Gemini fallbacks.
--
-- 1. public_profiles and visible_predictions were running with the caller's rights again (security_invoker = true),
--    although migrations 20261105221500 and 20261106220000 set them to definer. Nothing in this repository switches
--    them back, so the change was made outside it (most likely the dashboard's "fix" for security advisor 0010).
--    Effect: signed-out visitors got 42501 "permission denied for table profiles / hidden_predictions" on the
--    community feed, the weekly leaderboard, tipster stats and public profile pages; signed-in members passed the
--    grant but RLS on profiles (own row only) meant they saw nobody but themselves.
--    These two views are the intended public doors: public_profiles exposes id, username, display_name,
--    founding_number, created_at and avatar_url and leaves out banned accounts; visible_predictions hides moderated
--    picks. profiles and hidden_predictions stay closed. If advisor 0010 flags the two views, leave them as they are.
alter view public.public_profiles set (security_invoker = false);
alter view public.visible_predictions set (security_invoker = false);
alter view public.public_profiles owner to postgres;
alter view public.visible_predictions owner to postgres;
grant select on public.public_profiles, public.visible_predictions to anon, authenticated, service_role;

-- 2. Two policies that apply to anon called is_admin(), which anon may not execute. Postgres checks the function
--    permission even when the first half of the OR is true, so every signed-out read failed:
--    - team_badges: no verified badge loaded for guests, and because fixtures are only shown with a real badge,
--      guests saw no fixtures at all;
--    - quests: the onboarding quest list failed for guests.
--    Split each into a public policy without the function and an admin policy for signed-in admins.
drop policy if exists team_badges_public_read on public.team_badges;
drop policy if exists team_badges_admin_read on public.team_badges;
create policy team_badges_public_read on public.team_badges
  for select to anon, authenticated using (status = 'verified');
create policy team_badges_admin_read on public.team_badges
  for select to authenticated using (public.is_admin());

drop policy if exists quests_read on public.quests;
drop policy if exists quests_admin_read on public.quests;
create policy quests_read on public.quests
  for select to anon, authenticated using (active);
create policy quests_admin_read on public.quests
  for select to authenticated using (public.is_admin());

-- 3. Gemini fallbacks (src/lib/content/config.ts). A model without a row here has no allowance (api_quota_claim
--    fails closed), so each new fallback needs one. Caps sit below the lowest free allowance reported for the model
--    family on 14 Nov 2026 (Flash 20 a day, Flash-Lite 500 a day); admins can change them in /admin > System.
insert into public.api_quota_limits (provider, daily_cap, monthly_cap, note) values
  ('gemini:gemini-3.6-flash', 18, 540, 'free tier fallback; lowest reported allowance 20 a day'),
  ('gemini:gemini-3.5-flash', 18, 540, 'free tier fallback; lowest reported allowance 20 a day'),
  ('gemini:gemini-3.5-flash-lite', 450, 13500, 'free tier fallback; lowest reported allowance 500 a day')
on conflict (provider) do nothing;
