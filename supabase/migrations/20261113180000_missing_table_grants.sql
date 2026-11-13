-- Missing table privileges found while applying 20261113170000 (13 Nov 2026).
-- RLS policies existed, but the roles had no table privilege, so every request failed with "permission denied"
-- before RLS was checked:
--   * notifications, user_notifications: the bell could not load or mark anything read (authenticated had no
--     SELECT/INSERT/UPDATE), and server-side notices (admin warnings, messages) could not be written.
--   * newsroom_articles: the content engine and the admin Newsroom desk (service role) could not save articles.
--   * identity_verifications: members could not read their own ID-check status; the retention cron could not purge.
--   * member_details, survey_responses: the service role (support alerts, account deletion helpers) had no access.
-- Also removes TRUNCATE, REFERENCES and TRIGGER from anon and authenticated on every public table: clients never
-- need them, and TRUNCATE is not subject to RLS.

grant select on public.notifications to authenticated;
grant select, insert, update on public.user_notifications to authenticated;
grant select on public.identity_verifications to authenticated;

grant select, insert, update, delete on public.notifications, public.user_notifications, public.newsroom_articles,
  public.identity_verifications, public.member_details, public.survey_responses to service_role;

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', r.tablename);
  end loop;
end $$;
