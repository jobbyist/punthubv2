-- Every public form (support, privacy request, survey, reports) is logged here and emailed to support@puntr.co.za.
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form text not null check (form in ('support', 'privacy_request', 'survey', 'report', 'other')),
  name text,
  email text,
  message text check (char_length(message) <= 4000),
  meta jsonb not null default '{}'::jsonb,
  emailed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists form_submissions_email_idx on public.form_submissions (lower(email), created_at desc);
alter table public.form_submissions enable row level security;
drop policy if exists form_submissions_admin_read on public.form_submissions;
create policy form_submissions_admin_read on public.form_submissions
  for select to authenticated using (public.is_admin());
