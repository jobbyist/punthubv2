-- Ensure a push-consent withdrawal also removes any remaining device endpoints.
-- The consent insert and subscription cleanup execute in the same transaction.
create or replace function public.cleanup_push_subscriptions_on_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.purpose = 'push_notifications' and new.granted = false then
    delete from public.push_subscriptions where user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists push_consent_withdrawal_cleanup on public.consent_records;
create trigger push_consent_withdrawal_cleanup
after insert on public.consent_records
for each row execute function public.cleanup_push_subscriptions_on_withdrawal();

revoke all on function public.cleanup_push_subscriptions_on_withdrawal() from public, anon, authenticated;
