-- /feedback survey and the account-details form failed with "permission denied": these tables had RLS
-- policies but the API roles had no table privileges (only TRUNCATE/REFERENCES/TRIGGER), so RLS was never reached.
-- RLS still decides which rows; these grants only let the policies apply.
grant select, insert, update, delete on public.member_details to authenticated;
grant select, insert on public.survey_responses to authenticated;
-- Do not let the API roles truncate or alter rows in bulk.
revoke truncate, references, trigger on public.member_details, public.survey_responses, public.form_submissions from anon, authenticated;
