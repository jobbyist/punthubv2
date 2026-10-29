-- Posting a pick (which puts it on the community feed and the leaderboard) needs a confirmed email.
-- can_post() is the one place that decides who may post. Today that is "email confirmed"; identity
-- verification (KYC) is not built, so if it is added later it extends this function and nothing else.

create or replace function public.can_post(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from auth.users u
    where u.id = p_user and u.email_confirmed_at is not null
  );
$$;

revoke all on function public.can_post(uuid) from public, anon, authenticated;
grant execute on function public.can_post(uuid) to service_role;

-- A trigger, like the two-factor check, so the hash-chain function create_prediction is untouched.
-- The service role (no signed-in user) is not affected.
create or replace function public.predictions_require_confirmed_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is not null and not public.can_post(auth.uid()) then
    raise exception 'email_not_confirmed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger a0_predictions_email
  before insert on public.predictions
  for each row execute function public.predictions_require_confirmed_email();

-- The Terms now say posting needs a confirmed email. New sign-ups record acceptance against this version.
insert into public.notice_versions (kind, version, effective_at, url)
values ('terms', '2026-10-29-r3', now(), '/terms')
on conflict (kind, version) do nothing;
