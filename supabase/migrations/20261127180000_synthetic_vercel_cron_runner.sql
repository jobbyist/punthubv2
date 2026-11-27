-- Vercel Cron runner records server-side GET/HTML checks, not browser sessions.
alter table public.synthetic_sessions
  drop constraint if exists synthetic_sessions_session_type_check;

alter table public.synthetic_sessions
  add constraint synthetic_sessions_session_type_check
  check (session_type in ('read_only_browser', 'read_only_route_check', 'forecast_research'));
