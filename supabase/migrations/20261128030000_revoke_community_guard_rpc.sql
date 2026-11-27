-- The community guard is trigger-only; it must not be exposed as a callable RPC.
revoke all on function public.community_posts_guard() from public, anon, authenticated;
grant execute on function public.community_posts_guard() to service_role;
