-- Plain SQL assertions for supabase/migrations/20261105221500_public_views_definer.sql. One transaction, rolled back.
-- Failures start with "ASSERT FAILED". Run in the Supabase SQL editor after applying the migration.
begin;

do $$
declare n bigint;
begin
  -- 1. The public views load for a signed-out visitor.
  set local role anon;
  select count(*) into n from public.public_profiles;
  select count(*) into n from public.visible_predictions;
  select count(*) into n from public.tipster_stats;
  select count(*) into n from public.weekly_leaderboard;
  reset role;

  -- 2. The base tables stay closed to anon.
  set local role anon;
  begin
    perform 1 from public.profiles limit 1;
    reset role;
    raise exception 'ASSERT FAILED: anon can read public.profiles directly';
  exception when insufficient_privilege then
    reset role;
  end;
  begin
    set local role anon;
    perform 1 from public.hidden_predictions limit 1;
    reset role;
    raise exception 'ASSERT FAILED: anon can read public.hidden_predictions directly';
  exception when insufficient_privilege then
    reset role;
  end;
end $$;

-- 3. public_profiles exposes only the non-sensitive columns.
do $$
declare cols text;
begin
  select string_agg(column_name, ',' order by column_name) into cols
  from information_schema.columns where table_schema = 'public' and table_name = 'public_profiles';
  if cols <> 'created_at,display_name,founding_number,id,username' then
    raise exception 'ASSERT FAILED: public_profiles columns are %', cols;
  end if;
end $$;

rollback;
