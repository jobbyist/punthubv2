-- Account deletion must also erase the optional personal details (first/last name, phone, date of birth,
-- province). The profile row is kept (anonymised) as a pseudonymous anchor for the pick chain, so the
-- member_details cascade never fires and those details were left behind.
-- Survey answers are kept, linked only to the anonymised profile id (owner decision, 6 Nov 2026); the
-- contact permission on them is switched off.
create or replace function public.anonymise_account(p_user uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
  set username = 'deleted-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
      display_name = 'Deleted user',
      birth_year = null,
      marketing_opt_in = false,
      referral_code = null
  where id = p_user;

  delete from public.member_details where user_id = p_user;
  update public.survey_responses set contact_ok = false where user_id = p_user;

  if p_email is not null then
    delete from public.early_access where lower(email) = lower(p_email);
  end if;

  insert into public.consent_records (user_id, purpose, granted, notice_version, source)
  select p_user, purpose, false, (select max(version) from public.notice_versions where kind = 'privacy'), 'account'
  from (values ('marketing_email'), ('marketing_whatsapp'), ('analytics'), ('affiliate_tracking')) v(purpose);

  update public.privacy_requests
  set status = 'closed', closed_at = now(), notes = coalesce(notes || E'\n', '') || 'Account anonymised'
  where user_id = p_user and kind = 'deletion' and closed_at is null;
end;
$$;

revoke execute on function public.anonymise_account(uuid, text) from public, anon, authenticated;
grant execute on function public.anonymise_account(uuid, text) to service_role;

-- Members cannot delete their own details row once the account is gone; erasure happens server-side above.
revoke delete on public.member_details from authenticated;

insert into public.notice_versions (kind, version, effective_at, url)
values ('privacy', '2026-11-06-r10', now(), '/privacy')
on conflict (kind, version) do nothing;
