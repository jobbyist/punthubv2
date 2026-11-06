-- Survey v2: Founding Members only, multi-step answers, Annual Pass interest.
alter table public.survey_responses
  add column if not exists answers jsonb not null default '{}'::jsonb,
  add column if not exists pass_interest text check (pass_interest in ('interested', 'maybe', 'not_now', 'already')),
  add column if not exists survey_version smallint not null default 1;
alter table public.survey_responses alter column rating drop not null;

drop policy if exists survey_insert_own on public.survey_responses;
create policy survey_insert_own on public.survey_responses
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.founding_number is not null)
  );
