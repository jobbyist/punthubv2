-- Review decision (PR #127): payments_enabled() is only called by server code with the service role, so nobody
-- else needs to execute it. Removes the anon/authenticated grants added in 20261114200000.
revoke all on function public.payments_enabled() from public, anon, authenticated;
grant execute on function public.payments_enabled() to service_role;
