-- Hardening after the Supabase security advisor ran on the new project.
--
-- Not changed on purpose: public.public_profiles and public.visible_predictions are SECURITY DEFINER
-- views (advisor 0010). They are the only public doors to profiles and to the moderation table.
-- create_prediction() and is_admin() are meant to be callable by signed-in users (advisors 0028/0029).

alter function public.forbid_mutation() set search_path = public, pg_temp;
alter function public.touch_updated_at() set search_path = public, pg_temp;

-- rls_auto_enable() is added by the Supabase platform (an event trigger helper). Nobody should be able
-- to call it over the REST API. Guarded so the migration also runs where the function does not exist.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
