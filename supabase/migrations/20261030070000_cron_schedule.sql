-- P7: scheduling for the sync routes, using pg_cron and pg_net on the free plan.
-- Chosen over vercel.json crons because Vercel's Hobby plan allows only daily crons and a more frequent entry
-- fails the deployment. Later prompts add their own jobs (settlement, chain head, research) the same way.
--
-- The jobs call the app with `Authorization: Bearer <cron_secret>`. Both values live in Vault, not in this repo:
--   select vault.create_secret('https://puntr.co.za', 'cron_base_url');
--   select vault.create_secret('<the same value as CRON_SECRET in Vercel>', 'cron_secret');
-- Until both exist, invoke_cron does nothing (it logs a notice), so applying this migration is safe.

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.invoke_cron(p_path text)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
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
    timeout_milliseconds := 55000
  );
end;
$$;

revoke all on function public.invoke_cron(text) from public, anon, authenticated;
grant execute on function public.invoke_cron(text) to service_role;

-- pg_cron runs in UTC. Fixtures daily at 02:00 UTC (04:00 SAST); results every 30 minutes.
select cron.schedule('sync-fixtures', '0 2 * * *', $$select public.invoke_cron('/api/cron/sync-fixtures')$$);
select cron.schedule('sync-results', '*/30 * * * *', $$select public.invoke_cron('/api/cron/sync-results')$$);
