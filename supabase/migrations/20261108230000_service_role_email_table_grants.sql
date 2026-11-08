-- The server (service role) must read and write the email send ledgers, support alerts and Annual Pass claims.
-- Without these grants a send succeeds but the "already sent" record fails, so the next run emails the same
-- person again (seen on founding-welcome, 8 Nov 2026). RLS stays on and these tables have no public policies,
-- so only the service role can touch them.
grant select, insert, update, delete on public.founding_welcome_sends to service_role;
grant select, insert, update, delete on public.founding_campaign_sends to service_role;
grant select, insert, update, delete on public.form_submissions to service_role;
grant select, insert, update, delete on public.annual_pass_claims to service_role;
grant select, insert, update, delete on public.campaign_events to service_role;
