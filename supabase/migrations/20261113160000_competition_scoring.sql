-- Competition scoring (master brief 4.5 and 4.6): points per correct pick, a traceable score ledger and leaderboards.
--
-- Separate from PuntPoints. PuntPoints are the loyalty currency (rewards); competition points only rank members.
-- Deterministic SQL, no AI anywhere: one ledger row per settlement event, written by a trigger, holding the points
-- that applied at that moment. A corrected result is a new settlement event, so it adds a new ledger row and the
-- leaderboard reads the latest row per pick. Nothing is ever updated or deleted.
--
-- Additive. To undo: drop the two functions, the trigger and function competition_score_on_settlement, the tables
-- competition_score_ledger, scoring_rule_changes and scoring_rules.

-- 1. Rules: points for a correct pick, per market. Changing a rule affects only picks settled afterwards. -------

create table if not exists public.scoring_rules (
  market text primary key check (market in ('1X2', 'BTTS', 'OU25', 'DC', 'HCP')),
  points integer not null check (points between 0 and 20),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.scoring_rules (market, points) values
  ('1X2', 3), ('BTTS', 2), ('OU25', 2), ('DC', 1), ('HCP', 2)
on conflict (market) do nothing;

create table if not exists public.scoring_rule_changes (
  id bigint generated always as identity primary key,
  market text not null,
  old_points integer not null,
  new_points integer not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create or replace function public.scoring_rules_audit()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.points is distinct from old.points then
    new.updated_at := now();
    new.updated_by := auth.uid();
    insert into public.scoring_rule_changes (market, old_points, new_points, changed_by)
    values (new.market, old.points, new.points, auth.uid());
  end if;
  return new;
end;
$$;
create or replace trigger scoring_rules_audit before update on public.scoring_rules
  for each row execute function public.scoring_rules_audit();

-- 2. Ledger: one row per settlement event. ---------------------------------------------------------------------

create table if not exists public.competition_score_ledger (
  id bigint generated always as identity primary key,
  settlement_event_id uuid not null unique references public.settlement_events (id) on delete restrict,
  settlement_seq bigint not null,
  prediction_id uuid not null references public.predictions (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  fixture_id uuid not null references public.fixtures (id) on delete restrict,
  competition text not null,
  market text not null,
  result text not null check (result in ('won', 'lost', 'void')),
  points integer not null check (points between 0 and 20),
  kickoff_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists competition_score_prediction_idx
  on public.competition_score_ledger (prediction_id, settlement_seq desc);
create index if not exists competition_score_user_idx on public.competition_score_ledger (user_id);

create or replace trigger competition_score_append_only
  before update or delete on public.competition_score_ledger
  for each row execute function public.forbid_mutation();
create or replace trigger competition_score_no_truncate
  before truncate on public.competition_score_ledger
  for each statement execute function public.forbid_mutation();

create or replace function public.competition_score_on_settlement()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.competition_score_ledger
    (settlement_event_id, settlement_seq, prediction_id, user_id, fixture_id, competition, market, result, points,
     kickoff_at)
  select new.id, new.seq, p.id, p.user_id, f.id, f.competition, p.market, new.result,
         case when new.result = 'won' then coalesce(r.points, 0) else 0 end, f.kickoff_at
  from public.predictions p
  join public.fixtures f on f.id = p.fixture_id
  left join public.scoring_rules r on r.market = p.market
  where p.id = new.prediction_id
  on conflict (settlement_event_id) do nothing;
  return new;
end;
$$;
create or replace trigger competition_score_on_settlement after insert on public.settlement_events
  for each row execute function public.competition_score_on_settlement();

-- Settlement events that already exist (none in production on 13 Nov 2026) are scored with today's rules.
insert into public.competition_score_ledger
  (settlement_event_id, settlement_seq, prediction_id, user_id, fixture_id, competition, market, result, points,
   kickoff_at)
select e.id, e.seq, p.id, p.user_id, f.id, f.competition, p.market, e.result,
       case when e.result = 'won' then coalesce(r.points, 0) else 0 end, f.kickoff_at
from public.settlement_events e
join public.predictions p on p.id = e.prediction_id
join public.fixtures f on f.id = p.fixture_id
left join public.scoring_rules r on r.market = p.market
on conflict (settlement_event_id) do nothing;

-- 3. Access ----------------------------------------------------------------------------------------------------

alter table public.scoring_rules enable row level security;
alter table public.scoring_rule_changes enable row level security;
alter table public.competition_score_ledger enable row level security;

revoke all on public.scoring_rules, public.scoring_rule_changes, public.competition_score_ledger
  from anon, authenticated;
grant select on public.scoring_rules to anon, authenticated;
grant update (points) on public.scoring_rules to authenticated;
grant select on public.scoring_rule_changes, public.competition_score_ledger to authenticated;
grant select, insert on public.scoring_rules, public.scoring_rule_changes, public.competition_score_ledger
  to service_role;
grant update on public.scoring_rules to service_role;
grant usage, select on all sequences in schema public to service_role;

create policy scoring_rules_public_read on public.scoring_rules for select to anon, authenticated using (true);
create policy scoring_rules_admin_update on public.scoring_rules
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy scoring_rule_changes_admin_read on public.scoring_rule_changes
  for select to authenticated using (public.is_admin());
-- A member reads their own score rows (every point traces to a pick and a settlement event); admins read all.
create policy competition_score_own_read on public.competition_score_ledger
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- 4. Leaderboards ----------------------------------------------------------------------------------------------
-- Periods use the match's kick-off in South African time: 'week' (Monday to Sunday), 'month', 'all'.
-- Only settled picks count; void picks score nothing and are not counted. Hidden picks and banned members are left
-- out. Order: points, correct picks, accuracy, settled picks, then username so the order is always the same.

create or replace function public.competition_board(p_period text, p_competition text)
returns table (rank bigint, user_id uuid, username text, avatar_url text, points bigint, correct bigint,
               settled bigint, accuracy numeric)
language sql stable security definer set search_path = public, pg_temp as $$
  with bounds as (
    select case p_period
             when 'week' then date_trunc('week', now() at time zone 'Africa/Johannesburg')
             when 'month' then date_trunc('month', now() at time zone 'Africa/Johannesburg')
           end as starts
  ),
  latest as (
    select distinct on (l.prediction_id) l.*
    from public.competition_score_ledger l
    order by l.prediction_id, l.settlement_seq desc
  ),
  totals as (
    select l.user_id,
           sum(l.points)::bigint as points,
           count(*) filter (where l.result = 'won')::bigint as correct,
           count(*)::bigint as settled
    from latest l, bounds b
    where l.result in ('won', 'lost')
      and (p_competition is null or l.competition = p_competition)
      and (b.starts is null or (l.kickoff_at at time zone 'Africa/Johannesburg') >= b.starts)
      and not exists (select 1 from public.hidden_predictions h where h.prediction_id = l.prediction_id)
    group by l.user_id
  )
  select row_number() over (
           order by t.points desc, t.correct desc, (t.correct::numeric / t.settled) desc, t.settled desc,
                    pr.username::text asc
         ) as rank,
         t.user_id, pr.username::text, pr.avatar_url, t.points, t.correct, t.settled,
         round(t.correct::numeric * 100 / t.settled, 1) as accuracy
  from totals t
  join public.profiles pr on pr.id = t.user_id and not pr.is_banned;
$$;
revoke all on function public.competition_board(text, text) from public, anon, authenticated;

create or replace function public.competition_leaderboard(
  p_period text default 'all', p_competition text default null, p_limit integer default 50, p_offset integer default 0)
returns table (rank bigint, username text, avatar_url text, points bigint, correct bigint, settled bigint,
               accuracy numeric)
language sql stable security definer set search_path = public, pg_temp as $$
  select b.rank, b.username, b.avatar_url, b.points, b.correct, b.settled, b.accuracy
  from public.competition_board(
         case when p_period in ('week', 'month') then p_period else 'all' end, nullif(trim(p_competition), '')) b
  order by b.rank
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- The caller's own row, wherever they are in the ranking.
create or replace function public.my_competition_rank(p_period text default 'all', p_competition text default null)
returns table (rank bigint, username text, avatar_url text, points bigint, correct bigint, settled bigint,
               accuracy numeric)
language sql stable security definer set search_path = public, pg_temp as $$
  select b.rank, b.username, b.avatar_url, b.points, b.correct, b.settled, b.accuracy
  from public.competition_board(
         case when p_period in ('week', 'month') then p_period else 'all' end, nullif(trim(p_competition), '')) b
  where b.user_id = auth.uid();
$$;

revoke all on function public.competition_leaderboard(text, text, integer, integer) from public;
revoke all on function public.my_competition_rank(text, text) from public, anon;
grant execute on function public.competition_leaderboard(text, text, integer, integer)
  to anon, authenticated, service_role;
grant execute on function public.my_competition_rank(text, text) to authenticated, service_role;
revoke all on function public.competition_score_on_settlement() from public, anon, authenticated;
revoke all on function public.scoring_rules_audit() from public, anon, authenticated;
