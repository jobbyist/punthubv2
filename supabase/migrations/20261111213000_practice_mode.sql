-- Practice Mode (thin slice): a fictional league for Founding Members to try Puntr before launch.
-- Everything lives in separate practice_* tables so the real predictions, results, leaderboards and the pick hash
-- chain can never be touched. Fictional clubs only, no AI or paid API, no conversion of practice points to real
-- PuntPoints. Off until practice_settings.enabled is switched on.
--
-- Access: Founding Members (profiles.founding_number is not null) and admins, only while enabled.
-- Writes go through SECURITY DEFINER functions (picks, demo redemptions) or the service role (the practice-tick
-- cron). Explicit grants on every table: the 8 Nov incident showed a missing service_role grant fails silently.

-- ---------------------------------------------------------------------------------------------------------
-- Settings (one row) and access helper
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.practice_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  -- Defaults for the NEXT season. 1800 = a round every 30 minutes. Set 300 for an accelerated season.
  round_seconds int not null default 1800 check (round_seconds between 60 and 7200),
  lock_seconds int not null default 120 check (lock_seconds between 10 and 600),
  full_time_seconds int not null default 600 check (full_time_seconds between 30 and 3600),
  updated_at timestamptz not null default now()
);
insert into public.practice_settings (id) values (1) on conflict (id) do nothing;
alter table public.practice_settings enable row level security;
revoke all on public.practice_settings from anon, authenticated;
grant select, update on public.practice_settings to service_role;

create or replace function public.practice_can_access()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select enabled from public.practice_settings where id = 1), false)
     and exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and not p.is_banned
         and (p.founding_number is not null or p.role = 'admin')
     );
$$;
revoke all on function public.practice_can_access() from public, anon;
grant execute on function public.practice_can_access() to authenticated, service_role;

-- Status for the page: is it switched on, and is this member allowed in.
create or replace function public.practice_status()
returns table (enabled boolean, is_founding boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select s.enabled from public.practice_settings s where s.id = 1), false),
         exists (select 1 from public.profiles p
                 where p.id = auth.uid() and (p.founding_number is not null or p.role = 'admin'));
$$;
revoke all on function public.practice_status() from public, anon;
grant execute on function public.practice_status() to authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- World: seasons, teams, fixtures (and the secret planned scores)
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.practice_seasons (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  status text not null default 'active' check (status in ('active', 'finished')),
  started_at timestamptz not null default now(),
  round_seconds int not null,
  lock_seconds int not null,
  full_time_seconds int not null,
  seed bigint not null,
  created_at timestamptz not null default now()
);
create unique index if not exists practice_one_active_season on public.practice_seasons ((status)) where status = 'active';

create table if not exists public.practice_fixtures (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.practice_seasons (id) on delete cascade,
  round int not null,
  home text not null,
  away text not null,
  kickoff_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'finished')),
  home_score int,
  away_score int,
  lambda_home numeric(6, 3) not null,
  lambda_away numeric(6, 3) not null,
  odds jsonb not null,
  created_at timestamptz not null default now(),
  check ((status = 'finished') = (home_score is not null and away_score is not null))
);
create index if not exists practice_fixtures_season_kickoff on public.practice_fixtures (season_id, kickoff_at);

-- The result is decided when the season is created but must stay hidden until full time. Service role only.
create table if not exists public.practice_fixture_plans (
  fixture_id uuid primary key references public.practice_fixtures (id) on delete cascade,
  planned_home int not null check (planned_home between 0 and 12),
  planned_away int not null check (planned_away between 0 and 12)
);

-- ---------------------------------------------------------------------------------------------------------
-- Members' practice activity
-- ---------------------------------------------------------------------------------------------------------
create table if not exists public.practice_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  fixture_id uuid not null references public.practice_fixtures (id) on delete cascade,
  market text not null check (market in ('1X2', 'DC', 'OU25', 'BTTS')),
  selection text not null,
  odds numeric(6, 2) not null check (odds between 1.01 and 50),
  confidence smallint not null check (confidence between 1 and 5),
  created_at timestamptz not null default now(),
  result text check (result in ('won', 'lost', 'void')),
  units numeric(8, 2),
  settled_at timestamptz,
  unique (user_id, fixture_id, market)
);
create index if not exists practice_predictions_user on public.practice_predictions (user_id, created_at desc);
create index if not exists practice_predictions_fixture on public.practice_predictions (fixture_id);

create table if not exists public.practice_points_ledger (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('earn', 'redeem')),
  rule_code text,
  points int not null,
  ref_id text,
  created_at timestamptz not null default now()
);
-- One award per rule per reference (a pick, a settlement), so a repeated call never doubles points.
create unique index if not exists practice_points_once on public.practice_points_ledger (user_id, rule_code, ref_id) where kind = 'earn';
create index if not exists practice_points_user on public.practice_points_ledger (user_id, created_at desc);

create table if not exists public.practice_rewards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  kind text not null,
  points_cost int not null check (points_cost > 0),
  sort int not null default 0,
  active boolean not null default true
);

create table if not exists public.practice_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_id uuid not null references public.practice_rewards (id),
  points int not null,
  demo_code text not null,
  created_at timestamptz not null default now()
);
create index if not exists practice_redemptions_user on public.practice_redemptions (user_id, created_at desc);

-- The Founding Member prize draw: an auditable record of each draw (who ran it, how many entries, who witnessed).
create table if not exists public.practice_draw_log (
  id uuid primary key default gen_random_uuid(),
  drawn_at timestamptz not null default now(),
  drawn_by uuid references public.profiles (id), -- null when run by the service role
  witness text not null,
  entries int not null,
  winner_user_id uuid references public.profiles (id),
  winner_founding_number int,
  note text
);

-- Demo catalogue. Nothing here has any real value: codes are masked DEMO codes.
insert into public.practice_rewards (code, title, description, kind, points_cost, sort) values
  ('demo_voucher_50', 'Demo retail voucher R50', 'A practice voucher. It has no real value.', 'voucher', 40, 1),
  ('demo_voucher_100', 'Demo retail voucher R100', 'A practice voucher. It has no real value.', 'voucher', 80, 2),
  ('demo_pro_week', 'Demo Puntr Pro: 1 week', 'Shows how a perk redemption will feel. It does not unlock Pro.', 'perk', 120, 3),
  ('demo_badge', 'Demo profile badge', 'A practice badge. It is not shown on your real profile.', 'badge', 60, 4),
  ('demo_mystery', 'Demo mystery perk', 'A practice surprise. It has no real value.', 'perk', 200, 5)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------------------------------------
alter table public.practice_seasons enable row level security;
alter table public.practice_fixtures enable row level security;
alter table public.practice_fixture_plans enable row level security;
alter table public.practice_predictions enable row level security;
alter table public.practice_points_ledger enable row level security;
alter table public.practice_rewards enable row level security;
alter table public.practice_redemptions enable row level security;
alter table public.practice_draw_log enable row level security;

drop policy if exists practice_seasons_read on public.practice_seasons;
create policy practice_seasons_read on public.practice_seasons for select to authenticated using (public.practice_can_access());
drop policy if exists practice_fixtures_read on public.practice_fixtures;
create policy practice_fixtures_read on public.practice_fixtures for select to authenticated using (public.practice_can_access());
drop policy if exists practice_predictions_own on public.practice_predictions;
create policy practice_predictions_own on public.practice_predictions for select to authenticated
  using (user_id = auth.uid() and public.practice_can_access());
drop policy if exists practice_points_own on public.practice_points_ledger;
create policy practice_points_own on public.practice_points_ledger for select to authenticated
  using (user_id = auth.uid() and public.practice_can_access());
drop policy if exists practice_rewards_read on public.practice_rewards;
create policy practice_rewards_read on public.practice_rewards for select to authenticated using (active and public.practice_can_access());
drop policy if exists practice_redemptions_own on public.practice_redemptions;
create policy practice_redemptions_own on public.practice_redemptions for select to authenticated
  using (user_id = auth.uid() and public.practice_can_access());
-- practice_fixture_plans and practice_draw_log: no policies, so no direct access for members at all.

revoke all on public.practice_seasons, public.practice_fixtures, public.practice_fixture_plans, public.practice_predictions,
  public.practice_points_ledger, public.practice_rewards, public.practice_redemptions, public.practice_draw_log
  from anon, authenticated;
grant select on public.practice_seasons, public.practice_fixtures, public.practice_predictions,
  public.practice_points_ledger, public.practice_rewards, public.practice_redemptions to authenticated;
grant select, insert, update, delete on public.practice_seasons, public.practice_fixtures, public.practice_fixture_plans,
  public.practice_predictions, public.practice_points_ledger, public.practice_rewards, public.practice_redemptions,
  public.practice_draw_log to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------------------------------------
-- Points (mirrors the values of the real point_rules; practice ignores their `active` switch on purpose)
-- ---------------------------------------------------------------------------------------------------------
create or replace function public.practice_award(p_user uuid, p_rule text, p_ref text)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_rule public.point_rules;
  v_today int;
  v_day_start timestamptz := date_trunc('day', now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg';
  v_points int;
  v_inserted int;
begin
  select * into v_rule from public.point_rules where code = p_rule;
  if not found then return 0; end if;
  v_points := v_rule.points;
  if v_rule.cap_per_day is not null then
    select coalesce(sum(points), 0) into v_today from public.practice_points_ledger
      where user_id = p_user and kind = 'earn' and rule_code = p_rule and created_at >= v_day_start;
    v_points := least(v_points, greatest(v_rule.cap_per_day - v_today, 0));
  end if;
  if v_points <= 0 then return 0; end if;
  insert into public.practice_points_ledger (user_id, kind, rule_code, points, ref_id)
    values (p_user, 'earn', p_rule, v_points, p_ref)
    on conflict do nothing;
  -- Report what actually landed: a repeated call for the same pick pays nothing and returns 0.
  get diagnostics v_inserted = row_count;
  return case when v_inserted > 0 then v_points else 0 end;
end;
$$;
revoke all on function public.practice_award(uuid, text, text) from public, anon, authenticated;
grant execute on function public.practice_award(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------------------------------------
-- Post a practice pick. The price comes from the fixture (invented, server side), never from the client.
-- ---------------------------------------------------------------------------------------------------------
create or replace function public.practice_post_pick(p_fixture uuid, p_market text, p_selection text, p_confidence int)
returns public.practice_predictions
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_fix public.practice_fixtures;
  v_season public.practice_seasons;
  v_sel text;
  v_odds numeric;
  v_row public.practice_predictions;
  v_day_start timestamptz := date_trunc('day', now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg';
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.practice_can_access() then raise exception 'practice_closed' using errcode = 'P0001'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  if not found then raise exception 'no_profile' using errcode = 'P0001'; end if;
  if not v_profile.is_18_attested then raise exception 'age_not_attested' using errcode = 'P0001'; end if;

  select * into v_fix from public.practice_fixtures where id = p_fixture;
  if not found then raise exception 'fixture_not_found' using errcode = 'P0001'; end if;
  select * into v_season from public.practice_seasons where id = v_fix.season_id;
  if v_fix.status <> 'scheduled' then raise exception 'fixture_not_open' using errcode = 'P0001'; end if;
  if now() >= v_fix.kickoff_at - make_interval(secs => v_season.lock_seconds) then
    raise exception 'kickoff_passed' using errcode = 'P0001';
  end if;
  -- Open from two rounds before kick-off.
  if now() < v_fix.kickoff_at - make_interval(secs => 2 * v_season.round_seconds) then
    raise exception 'fixture_not_open' using errcode = 'P0001';
  end if;

  if p_market not in ('1X2', 'DC', 'OU25', 'BTTS') then raise exception 'invalid_market' using errcode = 'P0001'; end if;
  v_sel := case when p_market = 'DC' then upper(btrim(p_selection)) else lower(btrim(p_selection)) end;
  if not (
    (p_market = '1X2' and v_sel in ('home', 'draw', 'away'))
    or (p_market = 'OU25' and v_sel in ('over', 'under'))
    or (p_market = 'BTTS' and v_sel in ('yes', 'no'))
    or (p_market = 'DC' and v_sel in ('1X', 'X2', '12'))
  ) then raise exception 'invalid_selection' using errcode = 'P0001'; end if;
  if p_confidence is null or p_confidence < 1 or p_confidence > 5 then
    raise exception 'invalid_confidence' using errcode = 'P0001';
  end if;

  v_odds := (v_fix.odds -> p_market ->> v_sel)::numeric;
  if v_odds is null then raise exception 'invalid_selection' using errcode = 'P0001'; end if;

  if (select count(*) from public.practice_predictions where user_id = v_uid and created_at >= v_day_start) >= 100 then
    raise exception 'daily_limit' using errcode = 'P0001';
  end if;

  insert into public.practice_predictions (user_id, fixture_id, market, selection, odds, confidence)
    values (v_uid, p_fixture, p_market, v_sel, v_odds, p_confidence::smallint)
    returning * into v_row;

  -- Points: first practice pick once, then 2 per pick (capped per day by point_rules).
  perform public.practice_award(v_uid, 'first_pick', 'first');
  perform public.practice_award(v_uid, 'pick_locked', v_row.id::text);
  return v_row;
end;
$$;
revoke all on function public.practice_post_pick(uuid, text, text, int) from public, anon;
grant execute on function public.practice_post_pick(uuid, text, text, int) to authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- Leaderboard, crowd split, balance, demo redemption
-- ---------------------------------------------------------------------------------------------------------
create or replace function public.practice_leaderboard(p_limit int default 20)
returns table (rank bigint, username text, points bigint, settled bigint, won bigint, units numeric, graduate boolean, is_me boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  with pts as (
    select user_id, sum(points) filter (where kind = 'earn') as earned from public.practice_points_ledger group by user_id
  ), rec as (
    select user_id,
           count(*) filter (where result is not null) as settled,
           count(*) filter (where result = 'won') as won,
           coalesce(sum(units), 0) as units
    from public.practice_predictions group by user_id
  ), joined as (
    select p.id, p.username::text as username, coalesce(pts.earned, 0) as points,
           coalesce(rec.settled, 0) as settled, coalesce(rec.won, 0) as won, coalesce(rec.units, 0) as units
    from public.profiles p
    left join pts on pts.user_id = p.id
    left join rec on rec.user_id = p.id
    where (pts.user_id is not null or rec.user_id is not null) and p.role <> 'admin'
  )
  select row_number() over (order by j.points desc, j.units desc, j.username) as rank,
         j.username, j.points, j.settled, j.won, j.units,
         j.settled >= 10 as graduate,
         j.id = auth.uid() as is_me
  from joined j
  where public.practice_can_access()
  order by rank
  limit greatest(least(p_limit, 50), 1);
$$;
revoke all on function public.practice_leaderboard(int) from public, anon;
grant execute on function public.practice_leaderboard(int) to authenticated;

-- How the founding crowd split on each fixture (Match result only). Counts only, never who picked what.
create or replace function public.practice_crowd(p_season uuid)
returns table (fixture_id uuid, home bigint, draw bigint, away bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  select pr.fixture_id,
         count(*) filter (where pr.selection = 'home'),
         count(*) filter (where pr.selection = 'draw'),
         count(*) filter (where pr.selection = 'away')
  from public.practice_predictions pr
  join public.practice_fixtures f on f.id = pr.fixture_id
  where f.season_id = p_season and pr.market = '1X2' and public.practice_can_access()
  group by pr.fixture_id;
$$;
revoke all on function public.practice_crowd(uuid) from public, anon;
grant execute on function public.practice_crowd(uuid) to authenticated;

create or replace function public.practice_balance()
returns int language sql stable security definer set search_path = public, pg_temp as $$
  select case when public.practice_can_access()
    then coalesce((select sum(points) from public.practice_points_ledger where user_id = auth.uid()), 0)::int
    else 0 end;
$$;
revoke all on function public.practice_balance() from public, anon;
grant execute on function public.practice_balance() to authenticated;

create or replace function public.practice_redeem_demo(p_reward uuid)
returns public.practice_redemptions
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_reward public.practice_rewards;
  v_balance int;
  v_row public.practice_redemptions;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.practice_can_access() then raise exception 'practice_closed' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('practice_redeem'), hashtext(v_uid::text));
  select * into v_reward from public.practice_rewards where id = p_reward and active;
  if not found then raise exception 'reward_not_found' using errcode = 'P0001'; end if;
  select coalesce(sum(points), 0) into v_balance from public.practice_points_ledger where user_id = v_uid;
  if v_balance < v_reward.points_cost then raise exception 'not_enough_points' using errcode = 'P0001'; end if;
  insert into public.practice_redemptions (user_id, reward_id, points, demo_code)
    values (v_uid, p_reward, v_reward.points_cost,
            'DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)) || '-XXXX')
    returning * into v_row;
  insert into public.practice_points_ledger (user_id, kind, rule_code, points, ref_id)
    values (v_uid, 'redeem', 'demo_redeem', -v_reward.points_cost, v_row.id::text);
  return v_row;
end;
$$;
revoke all on function public.practice_redeem_demo(uuid) from public, anon;
grant execute on function public.practice_redeem_demo(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------------
-- Draw support (admin only). Entry = Founding Member + at least one practice pick + draw box ticked on /feedback.
-- The draw closes when Puntr goes live on 1 December 2026. One winner, picked at random, recorded in the log.
-- ---------------------------------------------------------------------------------------------------------
create or replace function public.admin_practice_draw_entries()
returns table (user_id uuid, username text, founding_number int, email text, phone text, practice_picks bigint, entered_at timestamptz)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  -- Service role only (granted below). Never callable by members, so no in-function admin check is needed.
  return query
  select p.id, p.username::text, p.founding_number, u.email::text, md.phone::text,
         (select count(*) from public.practice_predictions x where x.user_id = p.id),
         s.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  join public.survey_responses s on s.user_id = p.id and s.draw_entry
  left join public.member_details md on md.user_id = p.id
  where p.founding_number is not null and p.role <> 'admin' and not p.is_banned
    and exists (select 1 from public.practice_predictions x where x.user_id = p.id)
  order by s.created_at;
end;
$$;
revoke all on function public.admin_practice_draw_entries() from public, anon, authenticated;
grant execute on function public.admin_practice_draw_entries() to service_role;

create or replace function public.admin_practice_draw_run(p_witness text, p_note text default null)
returns table (winner_username text, winner_founding_number int, winner_email text, winner_phone text, entries int, drawn_at timestamptz)
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  v_entries int;
  v_win record;
  v_at timestamptz := now();
begin
  if p_witness is null or btrim(p_witness) = '' then raise exception 'witness_required' using errcode = 'P0001'; end if;
  select count(*) into v_entries from public.admin_practice_draw_entries();
  if v_entries = 0 then raise exception 'no_entries' using errcode = 'P0001'; end if;
  select e.* into v_win from public.admin_practice_draw_entries() e order by random() limit 1;
  insert into public.practice_draw_log (drawn_by, witness, entries, winner_user_id, winner_founding_number, note)
    values (auth.uid(), btrim(p_witness), v_entries, v_win.user_id, v_win.founding_number, p_note);
  return query select v_win.username, v_win.founding_number, v_win.email, v_win.phone, v_entries, v_at;
end;
$$;
revoke all on function public.admin_practice_draw_run(text, text) from public, anon, authenticated;
grant execute on function public.admin_practice_draw_run(text, text) to service_role;

-- ---------------------------------------------------------------------------------------------------------
-- Account deletion also erases a member's practice activity (unlike the kept, pseudonymised survey answers).
-- Same function as before (20261107010000_anonymise_member_details_privacy_r10) plus three deletes.
-- ---------------------------------------------------------------------------------------------------------
create or replace function public.anonymise_account(p_user uuid, p_email text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.profiles
  set username = 'deleted-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
      display_name = 'Deleted user',
      birth_year = null,
      marketing_opt_in = false,
      referral_code = null
  where id = p_user;

  delete from public.member_details where user_id = p_user;
  delete from public.practice_redemptions where user_id = p_user;
  delete from public.practice_points_ledger where user_id = p_user;
  delete from public.practice_predictions where user_id = p_user;
  update public.survey_responses set contact_ok = false where user_id = p_user;

  if p_email is not null then
    delete from public.early_access where lower(email) = lower(p_email);
  end if;

  insert into public.consent_records (user_id, purpose, granted, notice_version, source)
  select p_user, purpose, false, (select max(version) from public.notice_versions where kind = 'privacy'), 'account'
  from (values ('marketing_email'), ('marketing_whatsapp'), ('analytics'), ('affiliate_tracking')) v(purpose);

  update public.privacy_requests
  set status = 'closed', closed_at = now(), notes = coalesce(notes || E'\n', '') || 'Account anonymised'
  where user_id = p_user and kind = 'deletion' and closed_at is null;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------
-- Schedules (UTC). practice-tick every 2 minutes opens a season, reveals full-time scores, settles picks.
-- The Practice Mode email goes out at 09:00 SAST daily to 30 Nov, one email per member, and only while
-- practice_settings.enabled is on (the route checks).
-- ---------------------------------------------------------------------------------------------------------
select cron.unschedule(jobname) from cron.job where jobname in ('practice-tick', 'founding-practice');
select cron.schedule('practice-tick', '*/2 * * * *', $$select public.invoke_cron('/api/cron/practice-tick')$$);
select cron.schedule('founding-practice', '0 7 12-30 11 *', $$select public.invoke_cron('/api/cron/founding-sequence?campaign=founding-practice-1&limit=45')$$);

-- Privacy and Terms r11: Practice Mode (practice picks, points and demo redemptions; deletion covered by anonymise_account above).
insert into public.notice_versions (kind, version, effective_at, url)
values ('privacy', '2026-11-11-r11', now(), '/privacy'), ('terms', '2026-11-11-r11', now(), '/terms')
on conflict (kind, version) do nothing;
