-- The application records provider quota claims with the Supabase service_role client.
-- Explicitly grant table and identity-sequence access; RLS remains enabled.
grant all privileges on table public.api_call_events to service_role;
grant usage, select on sequence public.api_call_events_id_seq to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'api_call_events'
      and policyname = 'service_role_insert_api_call_events'
  ) then
    create policy service_role_insert_api_call_events
      on public.api_call_events
      for insert
      to service_role
      with check (true);
  end if;
end
$$;
