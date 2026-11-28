-- Spread the rolling AI Duel inventory across distinct upcoming fixtures and distinct AI profiles.
-- Refund the initial inventory before rebuilding; only still-open, unaccepted AI challenges are touched.
do $$
declare
  v_duel public.duels;
begin
  for v_duel in
    select d.*
    from public.duels d
    join public.profiles p on p.id=d.challenger and p.is_ai_participant
    where d.status='pending' and d.opponent is null
    for update of d
  loop
    perform public.duel_refund(v_duel, v_duel.challenger, 'AI duel inventory rebalanced across fixtures: stake returned');
    update public.duels set status='cancelled', settled_at=now() where id=v_duel.id;
    delete from public.ai_duel_challenges where duel_id=v_duel.id;
  end loop;
end;
$$;

create or replace function public.seed_ai_open_duels(p_target integer default 12)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_fixture record;
  v_persona record;
  v_market_a text;
  v_market_b text;
  v_picks jsonb;
  v_selection_a text;
  v_selection_b text;
  v_created integer := 0;
  v_open integer;
  v_target integer := greatest(1, least(coalesce(p_target,12),50));
begin
  perform pg_advisory_xact_lock(7003002, 0);
  select count(*) into v_open
  from public.duels d
  join public.fixtures f on f.id=d.fixture_id
  join public.profiles p on p.id=d.challenger
  where p.is_ai_participant and d.status='pending' and d.opponent is null
    and f.kickoff_at>now() and f.kickoff_at<=now()+interval '48 hours';
  if v_open>=v_target then return 0; end if;

  -- Fixture-first iteration gives members a range of different matches, not 12 copies of the same fixture.
  for v_fixture in
    select f.id
    from public.fixtures f
    where f.sport='soccer' and f.status='scheduled'
      and f.kickoff_at>now()+interval '5 minutes'
      and f.kickoff_at<=now()+interval '48 hours'
      and not exists (
        select 1 from public.ai_duel_challenges c
        where c.fixture_id=f.id
      )
    order by f.kickoff_at, f.competition, f.home
  loop
    select sp.persona_key, sp.profile_id into v_persona
    from public.synthetic_personas sp
    join public.profiles p on p.id=sp.profile_id and p.is_ai_participant
    where sp.active and sp.profile_id is not null
      and not exists (
        select 1 from public.duels pending
        where pending.challenger=sp.profile_id
          and pending.status='pending' and pending.opponent is null
      )
      and not exists (
        select 1 from public.ai_duel_challenges c
        where c.persona_key=sp.persona_key and c.fixture_id=v_fixture.id
      )
    order by sp.last_decision_at desc nulls last, sp.persona_key
    limit 1;
    if not found then continue; end if;

    v_market_a := (array['1X2','BTTS','OU25'])[1+floor(random()*3)::integer];
    v_market_b := (array_remove(array['1X2','BTTS','OU25']::text[],v_market_a))[1+floor(random()*2)::integer];
    v_selection_a := case v_market_a
      when '1X2' then (array['home','draw','away'])[1+floor(random()*3)::integer]
      when 'BTTS' then (array['yes','no'])[1+floor(random()*2)::integer]
      else (array['over','under'])[1+floor(random()*2)::integer] end;
    v_selection_b := case v_market_b
      when '1X2' then (array['home','draw','away'])[1+floor(random()*3)::integer]
      when 'BTTS' then (array['yes','no'])[1+floor(random()*2)::integer]
      else (array['over','under'])[1+floor(random()*2)::integer] end;
    v_picks := jsonb_build_array(
      jsonb_build_object('market',v_market_a,'selection',v_selection_a),
      jsonb_build_object('market',v_market_b,'selection',v_selection_b)
    );
    begin
      perform public.create_ai_open_duel(
        v_persona.persona_key,v_fixture.id,v_picks,
        'AI-generated picks · simulated community challenge'
      );
      v_created:=v_created+1;
      v_open:=v_open+1;
    exception when others then
      null;
    end;
    exit when v_open>=v_target;
  end loop;
  return v_created;
end;
$$;
revoke all on function public.seed_ai_open_duels(integer) from public, anon, authenticated;
grant execute on function public.seed_ai_open_duels(integer) to service_role;

select public.seed_ai_open_duels(12);
