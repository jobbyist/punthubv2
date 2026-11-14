-- PAYG credit packs through PayFast (14 Nov 2026). Everything stays off until app_settings.payments_enabled = 'true'
-- AND the PayFast environment variables are set. Credits are granted only by grant_credit_purchase(), called by the
-- ITN webhook with the service role after PayFast has been verified.

insert into public.app_settings (key, value) values
  ('payments_enabled', 'false'),
  ('usd_zar', '18.50')
on conflict (key) do nothing;

-- One price list: the one shown on /pricing (preview 5, deep stats 2, match insight 2). Slip analysis (3) is not
-- sold yet; it is listed inactive so the number is on record.
update public.credit_prices set credits = 5 where feature = 'ai_preview';
update public.credit_prices set credits = 2 where feature = 'tipster_deep_stats';
insert into public.credit_prices (feature, title, credits, active)
values ('slip_analysis', 'Betting slip analysis', 3, false)
on conflict (feature) do nothing;

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  pack text not null check (pack in ('starter', 'matchday', 'season')),
  credits integer not null check (credits > 0),
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  pf_payment_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payment_orders_user_idx on public.payment_orders (user_id, created_at desc);
alter table public.payment_orders enable row level security;
drop policy if exists payment_orders_own_select on public.payment_orders;
create policy payment_orders_own_select on public.payment_orders for select to authenticated using (user_id = auth.uid());
revoke all on public.payment_orders from anon, authenticated;
grant select on public.payment_orders to authenticated;
grant select, insert, update on public.payment_orders to service_role;

create or replace function public.payments_enabled()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select value = 'true' from public.app_settings where key = 'payments_enabled'), false);
$$;
grant execute on function public.payments_enabled() to anon, authenticated, service_role;

-- Idempotent: a second ITN for the same PayFast payment changes nothing. Amount must match the order exactly.
create or replace function public.grant_credit_purchase(p_order uuid, p_pf_payment_id text, p_amount_cents integer)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_o public.payment_orders%rowtype;
begin
  select * into v_o from public.payment_orders where id = p_order for update;
  if not found then return 'not_found'; end if;
  if v_o.status = 'paid' then return 'already_paid'; end if;
  if v_o.amount_cents <> p_amount_cents then return 'amount_mismatch'; end if;
  insert into public.credit_ledger (user_id, kind, credits, feature, ref_id, reason)
  values (v_o.user_id, 'purchase', v_o.credits, null, p_pf_payment_id, 'PayFast ' || v_o.pack || ' pack');
  update public.payment_orders set status = 'paid', pf_payment_id = p_pf_payment_id, paid_at = now() where id = p_order;
  return 'granted';
end;
$$;
revoke all on function public.grant_credit_purchase(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.grant_credit_purchase(uuid, text, integer) to service_role;
