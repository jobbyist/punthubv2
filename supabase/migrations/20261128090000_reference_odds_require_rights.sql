-- Never expose a stored bookmaker reference price unless the source has current written rights
-- for collection, storage, display, attribution, retention and redistribution.
-- The sync route already applies this registry; this closes the separate read-path gap for legacy rows.
create or replace function public.reference_odds(p_fixture_ids uuid[])
returns table (
  fixture_id uuid,
  market text,
  selection text,
  price numeric,
  captured_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select distinct on (m.fixture_id, m.market, m.selection)
         m.fixture_id, m.market, m.selection, m.price, m.captured_at
  from public.market_odds m
  join public.fixtures f on f.id = m.fixture_id
  join public.bookmaker_odds_permissions bp
    on regexp_replace(lower(bp.domain), '^www[.]', '') =
       regexp_replace(lower(m.source_domain), '^www[.]', '')
  where m.fixture_id = any (p_fixture_ids)
    and cardinality(p_fixture_ids) <= 200
    and f.status = 'scheduled' and f.kickoff_at > now()
    and m.captured_at > now() - interval '36 hours'
    and bp.enabled is true
    and bp.licence_status = 'verified'
    and bp.data_rights_status = 'approved'
    and bp.automated_access_allowed is true
    and bp.collection_approved is true
    and bp.storage_approved is true
    and bp.display_approved is true
    and bp.attribution_approved is true
    and bp.retention_approved is true
    and bp.redistribution_approved is true
    and (
      coalesce(auth.role(), '') = 'service_role'
      or exists (
        select 1 from public.profiles pr
        where pr.id = auth.uid() and pr.is_18_attested and not pr.is_banned
          and (pr.posting_paused_until is null or pr.posting_paused_until <= now())
          and (pr.suspended_until is null or pr.suspended_until <= now())
      )
    )
  order by m.fixture_id, m.market, m.selection, m.captured_at desc;
$function$;

comment on function public.reference_odds(uuid[]) is
  'Returns recent pre-match reference prices only when the bookmaker permission register approves licence, written data rights and all collection/storage/display/attribution/retention/redistribution uses.';

notify pgrst, 'reload schema';
