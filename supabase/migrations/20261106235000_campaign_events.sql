-- First-party, consent-gated analytics events with campaign source (UTM) for the admin Campaigns tab.
-- No personal information: `visitor` is the random id from the puntr_consent cookie (set only after the
-- visitor accepts Analytics). No user id, email, IP address or user agent is stored.

create table if not exists public.campaign_events (
  id bigint generated always as identity primary key,
  event text not null check (event ~ '^[a-z][a-z0-9_]{1,47}$'),
  visitor text not null check (char_length(visitor) between 8 and 64),
  utm_source text check (char_length(utm_source) <= 64),
  utm_medium text check (char_length(utm_medium) <= 64),
  utm_campaign text check (char_length(utm_campaign) <= 64),
  utm_content text check (char_length(utm_content) <= 64),
  utm_term text check (char_length(utm_term) <= 64),
  path text check (char_length(path) <= 200),
  detail text check (char_length(detail) <= 64),
  created_at timestamptz not null default now()
);

create index if not exists campaign_events_created_idx on public.campaign_events (created_at desc);
create index if not exists campaign_events_campaign_idx on public.campaign_events (utm_campaign, created_at desc);

alter table public.campaign_events enable row level security;

drop policy if exists "campaign_events admin read" on public.campaign_events;
create policy "campaign_events admin read" on public.campaign_events
  for select to authenticated using (public.is_admin());

-- Writes only through the RPC below (validated, trimmed). No direct insert grant.
revoke all on public.campaign_events from anon, authenticated;
grant select on public.campaign_events to authenticated;

create or replace function public.log_campaign_event(
  p_event text,
  p_visitor text,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_utm_term text default null,
  p_path text default null,
  p_detail text default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recent int;
begin
  if p_event is null or p_event !~ '^[a-z][a-z0-9_]{1,47}$' then return; end if;
  if p_visitor is null or char_length(p_visitor) not between 8 and 64 then return; end if;

  -- Simple flood guard: at most 120 events per visitor per 10 minutes.
  select count(*) into recent from public.campaign_events
   where visitor = p_visitor and created_at > now() - interval '10 minutes';
  if recent >= 120 then return; end if;

  insert into public.campaign_events
    (event, visitor, utm_source, utm_medium, utm_campaign, utm_content, utm_term, path, detail)
  values (
    p_event, p_visitor,
    nullif(left(lower(trim(p_utm_source)), 64), ''),
    nullif(left(lower(trim(p_utm_medium)), 64), ''),
    nullif(left(lower(trim(p_utm_campaign)), 64), ''),
    nullif(left(lower(trim(p_utm_content)), 64), ''),
    nullif(left(lower(trim(p_utm_term)), 64), ''),
    nullif(left(split_part(p_path, '?', 1), 200), ''),
    nullif(left(p_detail, 64), '')
  );
end;
$$;

revoke all on function public.log_campaign_event(text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.log_campaign_event(text, text, text, text, text, text, text, text, text) to anon, authenticated;

-- Admin report: unique visitors per campaign / ad (utm_content) / event since a time.
create or replace function public.admin_campaign_report(p_since timestamptz, p_campaign text default null)
returns table (
  utm_source text,
  utm_campaign text,
  utm_content text,
  event text,
  visitors bigint,
  events bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(e.utm_source, '(direct)'), coalesce(e.utm_campaign, '(none)'),
         coalesce(e.utm_content, '(none)'), e.event,
         count(distinct e.visitor), count(*)
    from public.campaign_events e
   where public.is_admin()
     and e.created_at >= p_since
     and (p_campaign is null or e.utm_campaign = lower(p_campaign))
   group by 1, 2, 3, 4
   order by 1, 2, 3, 4;
$$;

revoke all on function public.admin_campaign_report(timestamptz, text) from public;
grant execute on function public.admin_campaign_report(timestamptz, text) to authenticated;

-- Retention: analytics are kept up to 14 months (Privacy §4).
create or replace function public.purge_old_campaign_events() returns void
language sql security definer set search_path = public, pg_temp as $$
  delete from public.campaign_events where created_at < now() - interval '14 months';
$$;
revoke all on function public.purge_old_campaign_events() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('campaign-events-purge', '17 3 * * *', 'select public.purge_old_campaign_events()');
  end if;
end $$;

-- (Privacy r6 already existed on main; the real notice version for this change is r9, see the next migration.)
insert into public.notice_versions (kind, version, effective_at, url)
values ('privacy', '2026-11-06-r6', now(), '/privacy')
on conflict (kind, version) do nothing;
