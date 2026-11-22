-- Explicit email opt-ins for The Good Sport episode-one premiere.
create table if not exists public.podcast_episode_notifications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  episode_slug text not null,
  source text not null default 'the-good-sport-premiere',
  consented_at timestamptz not null default now(),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email, episode_slug),
  constraint podcast_episode_notifications_email_check check (length(email) between 5 and 254 and email = lower(email) and position('@' in email) > 1)
);
alter table public.podcast_episode_notifications enable row level security;
revoke all on public.podcast_episode_notifications from anon, authenticated;
comment on table public.podcast_episode_notifications is 'Email opt-ins requesting a notification when a specified Puntr podcast episode is released.';

-- Only the server-side service role can access the opt-in records.
grant select, insert, update, delete on table public.podcast_episode_notifications to service_role;

-- Send the one-off premiere alert at 09:00 SAST on 1 December 2026, with hourly retries through 12:00 SAST.
select cron.schedule(
  'good-sport-premiere',
  '0 7-10 1 12 *',
  $$select public.invoke_cron('/api/cron/podcast-premiere')$$
);

-- Remove delivered one-off alert records after 30 days; expire undelivered records 30 days after creation.
select cron.schedule(
  'good-sport-premiere-retention',
  '20 1 * * *',
  $$delete from public.podcast_episode_notifications where notified_at < now() - interval '30 days' or (notified_at is null and created_at < now() - interval '30 days')$$
);
