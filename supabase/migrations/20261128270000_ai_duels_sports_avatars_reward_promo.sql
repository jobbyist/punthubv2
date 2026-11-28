-- Synthetic AI sports wallets, open AI community Duels, beta/early-access entitlements,
-- a sports avatar picker, and a temporary 3x PuntPoints rewards campaign.
-- Reward costs automatically return to their captured baseline at 00:00 SAST on 1 Jan 2027.

create table if not exists public.ai_sports_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  allocated_points integer not null default 10000 check (allocated_points >= 0),
  balance integer not null default 10000 check (balance >= 0),
  updated_at timestamptz not null default now()
);
alter table public.ai_sports_wallets enable row level security;
revoke all on public.ai_sports_wallets from public, anon, authenticated;
grant all on public.ai_sports_wallets to service_role;

create or replace function public.sync_synthetic_ai_profile_access()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.is_ai_participant then
    insert into public.ai_sports_wallets(user_id, allocated_points, balance)
    values (new.id, 10000, 10000)
    on conflict (user_id) do nothing;

    insert into public.user_entitlements(user_id, entitlement, note)
    select new.id, entitlement, 'Synthetic AI profile: owner-granted beta and early-access privileges'
    from unnest(array['beta_tester','early_access']::text[]) entitlement
    where not exists (
      select 1 from public.user_entitlements e
      where e.user_id = new.id and e.entitlement = entitlement
        and e.revoked_at is null and (e.expires_at is null or e.expires_at > now())
    );
  end if;
  return new;
end;
$$;

drop trigger if exists synthetic_ai_profile_access on public.profiles;
create trigger synthetic_ai_profile_access
after insert or update of is_ai_participant on public.profiles
for each row execute function public.sync_synthetic_ai_profile_access();

-- Provision the existing synthetic cohort; wallet balances are isolated from redeemable member points.
insert into public.ai_sports_wallets(user_id, allocated_points, balance)
select id, 10000, 10000 from public.profiles where is_ai_participant
on conflict (user_id) do nothing;

insert into public.user_entitlements(user_id, entitlement, note)
select p.id, e.entitlement, 'Synthetic AI profile: owner-granted beta and early-access privileges'
from public.profiles p
cross join (values ('beta_tester'::text), ('early_access'::text)) e(entitlement)
where p.is_ai_participant
  and not exists (
    select 1 from public.user_entitlements ue
    where ue.user_id = p.id and ue.entitlement = e.entitlement
      and ue.revoked_at is null and (ue.expires_at is null or ue.expires_at > now())
  );

-- AI profiles are simulated challengers only. Their stake is reserved from the isolated sports wallet,
-- never from the redeemable PuntPoints ledger. Real-member acceptance still uses the existing safeguards.
create or replace function public.create_ai_open_duel(
  p_persona_key text,
  p_fixture_id uuid,
  p_picks jsonb,
  p_message text default 'AI-generated challenge · simulated opponent'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_profile_id uuid;
  v_fixture public.fixtures;
  v_wallet public.ai_sports_wallets;
  v_markets text[];
  v_duel_id uuid;
  v_stake_min integer;
  v_stake_max integer;
  v_stake integer;
begin
  if current_user not in ('postgres','service_role')
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_persona_key is null or p_fixture_id is null then
    raise exception 'invalid_ai_duel_input' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(7003001, hashtext(p_persona_key || ':' || p_fixture_id::text));

  select sp.profile_id into v_profile_id
  from public.synthetic_personas sp
  where sp.persona_key = p_persona_key and sp.active and sp.profile_id is not null;
  if v_profile_id is null then raise exception 'ai_persona_not_provisioned' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_profile_id and p.is_ai_participant) then
    raise exception 'ai_profile_required' using errcode = 'P0001';
  end if;

  select * into v_fixture from public.fixtures where id = p_fixture_id for share;
  if not found or v_fixture.sport <> 'soccer' or v_fixture.status <> 'scheduled' or v_fixture.kickoff_at <= now() then
    raise exception 'fixture_not_eligible' using errcode = 'P0001';
  end if;

  v_markets := public.duel_check_picks(p_picks);
  select challenge.duel_id into v_duel_id
  from public.ai_duel_challenges challenge
  where challenge.persona_key = p_persona_key and challenge.fixture_id = p_fixture_id;
  if v_duel_id is not null then return v_duel_id; end if;

  v_stake_min := public.setting_int('duel_stake_min', 10);
  v_stake_max := public.setting_int('duel_stake_max', 100);
  select * into v_wallet from public.ai_sports_wallets where user_id = v_profile_id for update;
  if not found or v_wallet.balance < v_stake_min then
    raise exception 'ai_sports_wallet_insufficient' using errcode = 'P0001';
  end if;
  v_stake_max := least(v_stake_max, v_wallet.balance);
  v_stake := v_stake_min + floor(random() * (v_stake_max - v_stake_min + 1))::integer;
  update public.ai_sports_wallets set balance = balance - v_stake, updated_at = now()
  where user_id = v_profile_id;

  insert into public.duels (fixture_id, challenger, opponent, stake, markets, message, status)
  values (
    p_fixture_id, v_profile_id, null, v_stake, v_markets,
    left(coalesce(p_message, 'AI-generated challenge · simulated opponent'), 140), 'pending'
  )
  returning id into v_duel_id;

  insert into public.duel_picks (duel_id, user_id, market, selection)
  select v_duel_id, v_profile_id, item->>'market', item->>'selection'
  from jsonb_array_elements(p_picks) item;

  insert into public.ai_duel_challenges (persona_key, fixture_id, duel_id)
  values (p_persona_key, p_fixture_id, v_duel_id);

  return v_duel_id;
end;
$$;
revoke all on function public.create_ai_open_duel(text,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.create_ai_open_duel(text,uuid,jsonb,text) to service_role;

-- Seed a small rolling inventory of open AI challenges for the next 48 hours.
-- Picks are clearly labelled as simulated AI challenges; stakes vary randomly within the configured range.
create or replace function public.seed_ai_open_duels(p_target integer default 12)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_persona record;
  v_fixture record;
  v_market_a text;
  v_market_b text;
  v_picks jsonb;
  v_selection_a text;
  v_selection_b text;
  v_created integer := 0;
  v_open integer;
begin
  perform pg_advisory_xact_lock(7003002, 0);
  select count(*) into v_open
  from public.duels d
  join public.fixtures f on f.id = d.fixture_id
  join public.profiles p on p.id = d.challenger
  where p.is_ai_participant and d.status = 'pending' and d.opponent is null
    and f.kickoff_at > now() and f.kickoff_at <= now() + interval '48 hours';

  if v_open >= greatest(1, least(coalesce(p_target,12),50)) then return 0; end if;

  for v_persona in
    select sp.persona_key
    from public.synthetic_personas sp
    join public.profiles p on p.id = sp.profile_id and p.is_ai_participant
    where sp.active and sp.profile_id is not null
    order by sp.last_decision_at desc nulls last, sp.persona_key
  loop
    for v_fixture in
      select f.id
      from public.fixtures f
      where f.sport = 'soccer' and f.status = 'scheduled'
        and f.kickoff_at > now() + interval '5 minutes'
        and f.kickoff_at <= now() + interval '48 hours'
        and not exists (
          select 1 from public.ai_duel_challenges c
          where c.persona_key = v_persona.persona_key and c.fixture_id = f.id
        )
      order by f.kickoff_at
      limit 12
    loop
      v_market_a := (array['1X2','BTTS','OU25'])[1 + floor(random()*3)::integer];
      v_market_b := (array_remove(array['1X2','BTTS','OU25']::text[], v_market_a))[1 + floor(random()*2)::integer];
      v_selection_a := case v_market_a
        when '1X2' then (array['home','draw','away'])[1 + floor(random()*3)::integer]
        when 'BTTS' then (array['yes','no'])[1 + floor(random()*2)::integer]
        else (array['over','under'])[1 + floor(random()*2)::integer] end;
      v_selection_b := case v_market_b
        when '1X2' then (array['home','draw','away'])[1 + floor(random()*3)::integer]
        when 'BTTS' then (array['yes','no'])[1 + floor(random()*2)::integer]
        else (array['over','under'])[1 + floor(random()*2)::integer] end;
      v_picks := jsonb_build_array(
        jsonb_build_object('market',v_market_a,'selection',v_selection_a),
        jsonb_build_object('market',v_market_b,'selection',v_selection_b)
      );
      begin
        perform public.create_ai_open_duel(
          v_persona.persona_key, v_fixture.id, v_picks,
          'AI-generated picks · simulated community challenge'
        );
        v_created := v_created + 1;
        v_open := v_open + 1;
      exception when others then
        -- A single stale persona/fixture/wallet must not block the remaining inventory.
        null;
      end;
      exit when v_open >= greatest(1, least(coalesce(p_target,12),50));
    end loop;
    exit when v_open >= greatest(1, least(coalesce(p_target,12),50));
  end loop;
  return v_created;
end;
$$;
revoke all on function public.seed_ai_open_duels(integer) from public, anon, authenticated;
grant execute on function public.seed_ai_open_duels(integer) to service_role;

-- Route all AI escrow/refunds/payouts through the isolated sports wallet.
create or replace function public.duel_refund(p_duel public.duels, p_user uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_duel.stake <= 0 then return; end if;
  if exists (select 1 from public.profiles where id = p_user and is_ai_participant) then
    insert into public.ai_sports_wallets(user_id, allocated_points, balance)
    values (p_user, 10000, p_duel.stake)
    on conflict (user_id) do update
      set balance = public.ai_sports_wallets.balance + excluded.balance, updated_at = now();
  else
    insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason)
    values (p_user, 'duel_refund', p_duel.stake, p_duel.id::text, p_reason);
  end if;
end;
$$;

create or replace function public.settle_duel(p_duel uuid, p_results jsonb, p_void boolean)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_duel public.duels;
  v_c integer;
  v_o integer;
  v_winner uuid;
  v_fixture public.fixtures;
begin
  select * into v_duel from public.duels where id = p_duel for update;
  if not found or v_duel.status <> 'active' then return 'skipped'; end if;
  select * into v_fixture from public.fixtures where id = v_duel.fixture_id;

  if p_void then
    update public.duels set status = 'void', settled_at = now() where id = p_duel;
    perform public.duel_refund(v_duel, v_duel.challenger, 'Duel void: match not played');
    perform public.duel_refund(v_duel, v_duel.opponent, 'Duel void: match not played');
    return 'void';
  end if;

  update public.duel_picks p set correct = (r->>'correct')::boolean
  from jsonb_array_elements(p_results) r
  where p.duel_id = p_duel and p.user_id = (r->>'user_id')::uuid and p.market = r->>'market';
  if exists (select 1 from public.duel_picks where duel_id = p_duel and correct is null) then
    raise exception 'incomplete_results' using errcode = 'P0001';
  end if;

  select count(*) filter (where user_id = v_duel.challenger and correct),
         count(*) filter (where user_id = v_duel.opponent and correct)
    into v_c, v_o from public.duel_picks where duel_id = p_duel;
  v_winner := case when v_c > v_o then v_duel.challenger when v_o > v_c then v_duel.opponent else null end;

  update public.duels set status = 'settled', settled_at = now(), challenger_correct = v_c,
    opponent_correct = v_o, winner = v_winner where id = p_duel;

  if v_winner is null then
    perform public.duel_refund(v_duel, v_duel.challenger, 'Duel drawn: stake returned');
    perform public.duel_refund(v_duel, v_duel.opponent, 'Duel drawn: stake returned');
  elsif v_duel.stake > 0 then
    if exists (select 1 from public.profiles where id = v_winner and is_ai_participant) then
      insert into public.ai_sports_wallets(user_id, allocated_points, balance)
      values (v_winner, 10000, 2 * v_duel.stake)
      on conflict (user_id) do update
        set balance = public.ai_sports_wallets.balance + excluded.balance, updated_at = now();
    else
      insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason)
      values (v_winner, 'duel_payout', 2 * v_duel.stake, p_duel::text, 'Duel won: pot');
    end if;
  end if;

  perform public.duel_notify(
    u,
    case when v_winner is null then 'Duel drawn' when v_winner = u then 'You won your duel' else 'Duel settled' end,
    v_fixture.home || ' ' || v_fixture.home_score || '-' || v_fixture.away_score || ' ' || v_fixture.away
      || ': ' || v_c || ' vs ' || v_o || ' correct calls.',
    '/duels/' || p_duel::text
  )
  from unnest(array[v_duel.challenger, v_duel.opponent]) u
  where not exists (select 1 from public.profiles p where p.id = u and p.is_ai_participant);
  return case when v_winner is null then 'draw' else 'settled' end;
end;
$$;

-- Automatically maintain beta/early-access entitlements and the isolated 10,000-point sports wallet for future AI profiles.
-- A rolling inventory is refreshed every 15 minutes and capped at 12 open AI challenges.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'puntr-ai-open-duels') then
    perform cron.unschedule((select jobid from cron.job where jobname = 'puntr-ai-open-duels'));
  end if;
  perform cron.schedule('puntr-ai-open-duels', '*/15 * * * *', 'select public.seed_ai_open_duels(12);');
end $$;

-- Temporary 3x reward pricing: capture the current catalogue values once and restore them on 1 Jan 2027.
create table if not exists public.puntpoints_reward_cost_promotions (
  reward_id uuid primary key references public.rewards(id) on delete cascade,
  base_points_cost integer not null check (base_points_cost > 0),
  promotional_points_cost integer not null check (promotional_points_cost > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reverted_at timestamptz
);
alter table public.puntpoints_reward_cost_promotions enable row level security;
revoke all on public.puntpoints_reward_cost_promotions from public, anon, authenticated;
grant all on public.puntpoints_reward_cost_promotions to service_role;

insert into public.puntpoints_reward_cost_promotions(
  reward_id, base_points_cost, promotional_points_cost, starts_at, ends_at
)
select id, points_cost, points_cost * 3,
       timestamptz '2026-11-28 00:00:00+02',
       timestamptz '2027-01-01 00:00:00+02'
from public.rewards
where points_cost > 0
on conflict (reward_id) do nothing;

update public.rewards r
set points_cost = p.promotional_points_cost
from public.puntpoints_reward_cost_promotions p
where p.reward_id = r.id and p.reverted_at is null;

create or replace function public.apply_reward_cost_promo_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.points_cost > 0 and now() < timestamptz '2027-01-01 00:00:00+02' then
    insert into public.puntpoints_reward_cost_promotions(
      reward_id, base_points_cost, promotional_points_cost, starts_at, ends_at
    ) values (
      new.id, new.points_cost, new.points_cost * 3,
      timestamptz '2026-11-28 00:00:00+02', timestamptz '2027-01-01 00:00:00+02'
    ) on conflict (reward_id) do nothing;
    new.points_cost := new.points_cost * 3;
  end if;
  return new;
end;
$$;
drop trigger if exists rewards_apply_cost_promo on public.rewards;
create trigger rewards_apply_cost_promo
before insert on public.rewards
for each row execute function public.apply_reward_cost_promo_on_insert();

create or replace function public.revert_puntpoints_reward_cost_promo()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_job bigint;
begin
  update public.rewards r
  set points_cost = p.base_points_cost
  from public.puntpoints_reward_cost_promotions p
  where p.reward_id = r.id and p.reverted_at is null;
  get diagnostics v_count = row_count;
  update public.puntpoints_reward_cost_promotions
  set reverted_at = now()
  where reverted_at is null;
  select jobid into v_job from cron.job where jobname = 'puntpoints-rewards-3x-revert';
  if v_job is not null then perform cron.unschedule(v_job); end if;
  return v_count;
end;
$$;
revoke all on function public.revert_puntpoints_reward_cost_promo() from public, anon, authenticated;
grant execute on function public.revert_puntpoints_reward_cost_promo() to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'puntpoints-rewards-3x-revert') then
    perform cron.unschedule((select jobid from cron.job where jobname = 'puntpoints-rewards-3x-revert'));
  end if;
  perform cron.schedule(
    'puntpoints-rewards-3x-revert',
    '0 22 31 12 *',
    'select public.revert_puntpoints_reward_cost_promo();'
  );
end $$;

comment on table public.ai_sports_wallets is
  'Non-redeemable synthetic AI sports wallet shared by Duels and Fantasy Arena simulations; initial allocation 10,000 PuntPoints per AI profile.';
comment on table public.puntpoints_reward_cost_promotions is
  'Captures reward catalogue base prices for the temporary 3x PuntPoints redemption-cost campaign, reverting 1 Jan 2027 SAST.';
