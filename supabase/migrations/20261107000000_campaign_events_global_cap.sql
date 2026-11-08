-- Global flood cap for campaign_events: the per-visitor guard alone can be bypassed by rotating visitor ids.
-- Adds a ceiling of 600 events per minute across all visitors (R200 X campaign traffic is far below this).
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
  global_recent int;
begin
  if p_event is null or p_event !~ '^[a-z][a-z0-9_]{1,47}$' then return; end if;
  if p_visitor is null or char_length(p_visitor) not between 8 and 64 then return; end if;

  select count(*) into global_recent from public.campaign_events
   where created_at > now() - interval '1 minute';
  if global_recent >= 600 then return; end if;

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
