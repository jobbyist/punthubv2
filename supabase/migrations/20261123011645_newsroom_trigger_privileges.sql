-- Harden Newsroom trigger functions: they are internal hooks, not RPC endpoints.
alter function public.newsroom_before_write() set search_path = public, pg_temp;
revoke execute on function public.newsroom_before_write() from public, anon, authenticated;
revoke execute on function public.newsroom_after_publish() from public, anon, authenticated;
