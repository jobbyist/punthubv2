-- Keep the admin Platform Updates workspace synchronised through Supabase Realtime.
-- Only verified administrators may read these internal operational records.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'platform_implementation_tasks'
      and policyname = 'platform_tasks_admin_realtime_read'
  ) then
    create policy platform_tasks_admin_realtime_read
      on public.platform_implementation_tasks
      for select to authenticated
      using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'platform_implementation_task_events'
      and policyname = 'platform_task_events_admin_realtime_read'
  ) then
    create policy platform_task_events_admin_realtime_read
      on public.platform_implementation_task_events
      for select to authenticated
      using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'platform_updates'
      and policyname = 'platform_updates_admin_realtime_read'
  ) then
    create policy platform_updates_admin_realtime_read
      on public.platform_updates
      for select to authenticated
      using (public.is_admin());
  end if;
end $$;

grant select on public.platform_implementation_tasks to authenticated;
grant select on public.platform_implementation_task_events to authenticated;
grant select on public.platform_updates to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'platform_implementation_tasks'
  ) then
    alter publication supabase_realtime add table public.platform_implementation_tasks;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'platform_implementation_task_events'
  ) then
    alter publication supabase_realtime add table public.platform_implementation_task_events;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'platform_updates'
  ) then
    alter publication supabase_realtime add table public.platform_updates;
  end if;
end $$;
