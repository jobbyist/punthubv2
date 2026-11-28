-- 28 Nov 2026: members follow teams from the team directory (/teams).
-- * team_follows: what a member follows now (own rows only; written through set_team_follow()).
-- * team_follow_events: append-only follow/unfollow log for admin analytics (aggregates only in the UI).
-- * Followed football teams are mirrored into member_preferences.teams (max 10) so the Matchday card and other
--   personalisation keep working from one place.
-- * With separate PFIE-learning consent, a follow is also recorded as a PFIE learning activity event
--   (team_followed / team_unfollowed), never otherwise.

create table if not exists public.team_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  sport text not null default 'soccer' check (sport ~ '^[a-z-]{2,20}$'),
  team_key text not null check (char_length(team_key) between 1 and 80),
  team_name text not null check (char_length(btrim(team_name)) between 2 and 60),
  created_at timestamptz not null default now(),
  primary key (user_id, sport, team_key)
);
create index if not exists team_follows_team_idx on public.team_follows (sport, team_key);

alter table public.team_follows enable row level security;
drop policy if exists team_follows_own_read on public.team_follows;
create policy team_follows_own_read on public.team_follows
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
revoke all on public.team_follows from anon, authenticated;
grant select on public.team_follows to authenticated;
grant all on public.team_follows to service_role;

create table if not exists public.team_follow_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sport text not null,
  team_key text not null,
  team_name text not null,
  action text not null check (action in ('follow', 'unfollow')),
  source text not null default 'directory' check (source ~ '^[a-z_-]{2,30}$'),
  created_at timestamptz not null default now()
);
create index if not exists team_follow_events_created_idx on public.team_follow_events (created_at desc);
create index if not exists team_follow_events_team_idx on public.team_follow_events (sport, team_key, created_at desc);

alter table public.team_follow_events enable row level security;
drop policy if exists team_follow_events_read on public.team_follow_events;
create policy team_follow_events_read on public.team_follow_events
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
revoke all on public.team_follow_events from anon, authenticated;
grant select on public.team_follow_events to authenticated;
grant all on public.team_follow_events to service_role;

-- PFIE learning: allow the two follow events, written server-side by set_team_follow() only.
alter table public.pfie_user_activity_events drop constraint if exists pfie_user_activity_events_event_type_check;
alter table public.pfie_user_activity_events add constraint pfie_user_activity_events_event_type_check
  check (event_type in (
    'fixture_viewed','pfie_insight_opened','prediction_created','newsroom_article_viewed',
    'newsroom_category_selected','notification_clicked','notification_dropdown_opened',
    'share_clicked','referral_link_copied','user_activated','profile_created',
    'signup_completed','pricing_plan_selected','founding_cta_clicked',
    'landing_viewed','about_page_viewed','about_founding_cta_clicked',
    'market_filter_changed','sport_filter_changed','search_submitted',
    'team_followed','team_unfollowed'
  ));
alter table public.pfie_user_activity_events drop constraint if exists pfie_user_activity_events_source_check;
alter table public.pfie_user_activity_events add constraint pfie_user_activity_events_source_check
  check (source in ('client', 'prediction_trigger', 'follow_trigger'));

-- Follow or unfollow a team. Returns whether the member follows it afterwards.
create or replace function public.set_team_follow(
  p_sport text,
  p_team_key text,
  p_team_name text,
  p_follow boolean,
  p_source text default 'directory'
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_team_name, ''));
  v_key text := btrim(coalesce(p_team_key, ''));
  v_sport text := lower(btrim(coalesce(p_sport, 'soccer')));
  v_source text := coalesce(nullif(lower(btrim(p_source)), ''), 'directory');
  v_changed integer := 0;
  v_teams text[];
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if exists (select 1 from public.profiles where id = v_uid and is_banned) then
    raise exception 'banned' using errcode = '42501';
  end if;
  if char_length(v_key) not between 1 and 80 or char_length(v_name) not between 2 and 60
     or v_sport !~ '^[a-z-]{2,20}$' or v_source !~ '^[a-z_-]{2,30}$' then
    raise exception 'invalid_team' using errcode = '22023';
  end if;

  if p_follow then
    if (select count(*) from public.team_follows where user_id = v_uid) >= 50 then
      raise exception 'follow_limit' using errcode = '22023';
    end if;
    insert into public.team_follows (user_id, sport, team_key, team_name)
    values (v_uid, v_sport, v_key, v_name)
    on conflict do nothing;
    get diagnostics v_changed = row_count;
  else
    delete from public.team_follows where user_id = v_uid and sport = v_sport and team_key = v_key;
    get diagnostics v_changed = row_count;
  end if;

  if v_changed > 0 then
    insert into public.team_follow_events (user_id, sport, team_key, team_name, action, source)
    values (v_uid, v_sport, v_key, v_name, case when p_follow then 'follow' else 'unfollow' end, v_source);

    -- Keep the favourites list (Matchday personalisation) in step for football, capped at 10.
    if v_sport = 'soccer' then
      select teams into v_teams from public.member_preferences where user_id = v_uid;
      v_teams := coalesce(v_teams, '{}');
      if p_follow then
        if not (v_name = any (v_teams)) and cardinality(v_teams) < 10 then
          v_teams := v_teams || v_name;
        end if;
      else
        v_teams := array_remove(v_teams, v_name);
      end if;
      insert into public.member_preferences (user_id, teams)
      values (v_uid, v_teams)
      on conflict (user_id) do update set teams = excluded.teams;
    end if;

    -- PFIE learning only with the member's separate, current consent.
    if exists (select 1 from public.current_consents c
               where c.user_id = v_uid and c.purpose = 'pfie_learning' and c.granted = true)
       and exists (select 1 from public.profiles p where p.id = v_uid and p.is_ai_participant is false) then
      insert into public.pfie_user_activity_events (user_id, event_type, event_data, source)
      values (v_uid, case when p_follow then 'team_followed' else 'team_unfollowed' end,
              jsonb_build_object('sport', left(v_sport, 80), 'team', left(v_name, 80), 'source', left(v_source, 80)),
              'follow_trigger');
    end if;
  end if;

  -- The row's actual state, so a repeated call reports the truth rather than echoing the request.
  return exists (select 1 from public.team_follows
                 where user_id = v_uid and sport = v_sport and team_key = v_key);
end;
$$;
revoke all on function public.set_team_follow(text, text, text, boolean, text) from public, anon;
grant execute on function public.set_team_follow(text, text, text, boolean, text) to authenticated;

-- Public follower counts per team: aggregate only, never who follows.
create or replace function public.team_follower_counts(p_sport text default 'soccer')
returns table (team_key text, followers bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select f.team_key, count(*)::bigint
  from public.team_follows f
  where f.sport = p_sport
  group by f.team_key;
$$;
revoke all on function public.team_follower_counts(text) from public;
grant execute on function public.team_follower_counts(text) to anon, authenticated;

-- Admin analytics: most-followed teams and follow activity over the last 7 and 30 days.
create or replace function public.admin_team_follow_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'members_following', (select count(distinct user_id) from public.team_follows),
    'total_follows', (select count(*) from public.team_follows),
    'follows_7d', (select count(*) from public.team_follow_events where action = 'follow' and created_at > now() - interval '7 days'),
    'unfollows_7d', (select count(*) from public.team_follow_events where action = 'unfollow' and created_at > now() - interval '7 days'),
    'follows_30d', (select count(*) from public.team_follow_events where action = 'follow' and created_at > now() - interval '30 days'),
    'top_teams', coalesce((
      select jsonb_agg(t order by t.followers desc, t.team_name)
      from (
        select f.sport, f.team_key, max(f.team_name) as team_name, count(*)::bigint as followers,
               count(*) filter (where f.created_at > now() - interval '7 days')::bigint as new_7d
        from public.team_follows f
        group by f.sport, f.team_key
        order by count(*) desc
        limit 25
      ) t), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(d order by d.day)
      from (
        select (created_at at time zone 'Africa/Johannesburg')::date as day,
               count(*) filter (where action = 'follow')::bigint as follows,
               count(*) filter (where action = 'unfollow')::bigint as unfollows
        from public.team_follow_events
        where created_at > now() - interval '30 days'
        group by 1
      ) d), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.admin_team_follow_stats() from public, anon;
grant execute on function public.admin_team_follow_stats() to authenticated;

-- Privacy notice: team follows are a new kind of member data.
insert into public.notice_versions (kind, version, effective_at, url)
values ('privacy', '2026-11-28-team-follows', now(), '/privacy')
on conflict (kind, version) do nothing;
