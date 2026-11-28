-- Match the existing cron helper's privilege boundary. The timeout overload is only for trusted cron jobs.
revoke all on function public.invoke_cron(text, integer) from public, anon, authenticated;
grant execute on function public.invoke_cron(text, integer) to service_role;
