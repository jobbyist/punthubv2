-- Keep bulk all-competition result ingestion from monopolising the HTTP dispatch queue
-- used by the five-minute settlement watchdog and two-minute settlement worker.
create or replace function public.invoke_cron(p_path text, p_timeout_ms integer)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_base text;
  v_secret text;
  v_timeout integer := greatest(5000, least(coalesce(p_timeout_ms, 60000), 120000));
begin
  select decrypted_secret into v_base from vault.decrypted_secrets where name = 'cron_base_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
  if v_base is null or v_secret is null then
    raise notice 'invoke_cron: cron_base_url or cron_secret is missing in Vault, skipping %', p_path;
    return;
  end if;
  perform net.http_get(
    url := rtrim(v_base, '/') || p_path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := v_timeout
  );
end;
$function$;

revoke all on function public.invoke_cron(text, integer) from public, anon, authenticated;
grant execute on function public.invoke_cron(text, integer) to service_role;

-- General results/archive ingestion remains active, but runs hourly off the busy :00/:30
-- boundary. The member-impacting priority watchdog continues every five minutes.
select cron.alter_job(
  2,
  '37 * * * *',
  $cmd$select public.invoke_cron('/api/cron/sync-results', 60000)$cmd$,
  null, null, true
);

select cron.alter_job(
  3,
  '*/2 * * * *',
  $cmd$select public.invoke_cron('/api/cron/settle', 15000)$cmd$,
  null, null, true
);

select cron.alter_job(
  80,
  '*/5 * * * *',
  $cmd$select public.invoke_cron('/api/cron/sync-results?priority=1', 90000)$cmd$,
  null, null, true
);
