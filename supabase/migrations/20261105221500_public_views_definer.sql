-- Signed-out visitors could not load the community feed, the leaderboard or tipster stats (5 Nov 2026).
-- Live symptom: anon requests to public_profiles, visible_predictions, tipster_stats and weekly_leaderboard failed with
-- 42501 "permission denied for table profiles" / "hidden_predictions".
-- Cause: public.public_profiles and public.visible_predictions are meant to be SECURITY DEFINER views (the only public
-- doors to profiles and to the moderation table, see mvp_core and mvp_core_hardening). On the live project they were
-- running with the caller's rights (security_invoker on), so anon hit the revoked base tables.
-- This restores the intended design. public_profiles exposes only id, username, display_name, founding_number and
-- created_at, and leaves out banned users. visible_predictions hides moderated picks. Nothing else is granted:
-- profiles and hidden_predictions stay closed to anon and authenticated.
-- If the Supabase security advisor (0010) flags these two views, leave them as they are on purpose.

alter view public.public_profiles set (security_invoker = false);
alter view public.visible_predictions set (security_invoker = false);

-- A definer view runs with its owner's rights, so the owner must be able to read the base tables.
alter view public.public_profiles owner to postgres;
alter view public.visible_predictions owner to postgres;

-- Re-assert the intended grants (idempotent).
grant select on public.public_profiles, public.visible_predictions to anon, authenticated, service_role;
