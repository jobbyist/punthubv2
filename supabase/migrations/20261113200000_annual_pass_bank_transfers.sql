-- 13 Nov 2026: Founding Annual Passes paid outside PayFast (EFT / bank transfer).
-- Owner (13 Nov): 4 members paid by bank transfer, so the public counter must show 16/20 remaining.
--
-- A bank-transfer payment is recorded by an admin. It counts toward the 20-pass cap immediately. When the admin links
-- it to a member, that member's annual_pass_claims row becomes 'paid' (reference 'eft:<id>') and the offline row stops
-- counting separately, so nothing is counted twice.

create table if not exists public.annual_pass_offline_payments (
  id uuid primary key default gen_random_uuid(),
  payer_label text not null check (char_length(payer_label) between 2 and 120),
  amount_cents integer check (amount_cents is null or amount_cents between 0 and 10000000),
  bank_reference text check (bank_reference is null or char_length(bank_reference) <= 120),
  paid_on date not null default (now() at time zone 'Africa/Johannesburg')::date,
  note text check (note is null or char_length(note) <= 500),
  user_id uuid references auth.users (id) on delete set null,
  linked_at timestamptz,
  voided_at timestamptz,
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists annual_pass_offline_user_idx
  on public.annual_pass_offline_payments (user_id) where user_id is not null and voided_at is null;

alter table public.annual_pass_offline_payments enable row level security;

drop policy if exists annual_pass_offline_admin_read on public.annual_pass_offline_payments;
create policy annual_pass_offline_admin_read on public.annual_pass_offline_payments
  for select to authenticated using (public.is_admin());

-- Writes go through the admin server functions (service role) only.
revoke all on public.annual_pass_offline_payments from anon, authenticated;
grant select on public.annual_pass_offline_payments to authenticated;
grant select, insert, update on public.annual_pass_offline_payments to service_role;

-- Cap count: PayFast/linked claims (paid or held) + bank transfers not yet linked to a member.
create or replace function public.annual_pass_taken()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (select count(*)::int from public.annual_pass_claims
      where status = 'paid' or (status = 'pending' and hold_expires_at > now()))
    + (select count(*)::int from public.annual_pass_offline_payments
      where voided_at is null and user_id is null);
$$;

revoke all on function public.annual_pass_taken() from public, anon, authenticated;
grant execute on function public.annual_pass_taken() to service_role;

-- Link a bank transfer to a member: their claim becomes paid. Service role only (called after is_admin()).
create or replace function public.annual_pass_link_offline(p_payment uuid, p_user uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.annual_pass_offline_payments;
begin
  select * into v_row from public.annual_pass_offline_payments where id = p_payment for update;
  if not found or v_row.voided_at is not null then return 'not_found'; end if;
  if v_row.user_id is not null then return 'already_linked'; end if;
  if exists (select 1 from public.annual_pass_claims where user_id = p_user and status = 'paid') then
    return 'already_paid';
  end if;

  update public.annual_pass_offline_payments
    set user_id = p_user, linked_at = now()
    where id = p_payment;

  insert into public.annual_pass_claims (user_id, status, paid_at, payment_reference, amount_cents, hold_expires_at)
  values (p_user, 'paid', coalesce(v_row.paid_on::timestamptz, now()), 'eft:' || p_payment::text, v_row.amount_cents, null)
  on conflict (user_id) do update
    set status = 'paid',
        paid_at = excluded.paid_at,
        payment_reference = excluded.payment_reference,
        amount_cents = excluded.amount_cents,
        hold_expires_at = null;
  return 'linked';
end;
$$;

revoke all on function public.annual_pass_link_offline(uuid, uuid) from public, anon, authenticated;
grant execute on function public.annual_pass_link_offline(uuid, uuid) to service_role;

-- Record a bank transfer atomically under the same cap (advisory lock shared with every recorder), so two
-- admins recording at once cannot pass 20. Service role only (called after is_admin()).
create or replace function public.annual_pass_record_offline(
  p_payer text, p_amount_cents integer, p_reference text, p_note text, p_paid_on date, p_recorded_by uuid
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtext('annual_pass_cap'));
  if public.annual_pass_taken() >= 20 then return 'full'; end if;
  insert into public.annual_pass_offline_payments (payer_label, amount_cents, bank_reference, note, paid_on, recorded_by)
  values (p_payer, p_amount_cents, p_reference, p_note,
          coalesce(p_paid_on, (now() at time zone 'Africa/Johannesburg')::date), p_recorded_by);
  return 'recorded';
end;
$$;

revoke all on function public.annual_pass_record_offline(text, integer, text, text, date, uuid) from public, anon, authenticated;
grant execute on function public.annual_pass_record_offline(text, integer, text, text, date, uuid) to service_role;

-- The 4 bank transfers the owner confirmed on 13 Nov. Payers are matched to members later in Admin > Annual Pass.
-- Idempotent: only seeds when the table is empty.
insert into public.annual_pass_offline_payments (payer_label, note, paid_on)
select 'Bank transfer ' || g || ' (to be matched)', 'Confirmed by the owner on 13 Nov 2026', date '2026-11-13'
from generate_series(1, 4) g
where not exists (select 1 from public.annual_pass_offline_payments);
