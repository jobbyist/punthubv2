-- The Parallel-first Newsroom can take ~85 seconds when a revision is required.
-- Keep pg_net waiting long enough to receive the route's final result instead of recording a 55-second timeout.
create or replace function public.invoke_cron(p_path text)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_base text;
  v_secret text;
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
    timeout_milliseconds := 120000
  );
end;
$function$;
