-- Synthetic AI participants are community actors only. They must never transact,
-- place real-money bets, spend credits, or transfer PuntPoints.
create or replace function public.member_can_transact(p public.profiles)
returns text
language sql
stable
set search_path to 'public', 'pg_temp'
as $function$
  select case
    when p.is_ai_participant then 'ai_participant_restricted'
    when p.is_banned then 'banned'
    when p.suspended_until > now() then 'suspended'
    when p.posting_paused_until > now() then 'limited'
    when not p.is_18_attested then 'age_not_attested'
    else null
  end;
$function$;
