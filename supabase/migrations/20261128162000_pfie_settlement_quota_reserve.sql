-- Protect a dedicated slice of Parallel capacity for picks/duels awaiting verified results.
-- Total provider caps remain unchanged; general traffic and settlement traffic receive separate ledgers.
create table if not exists public.api_quota_reserves (
  provider text not null references public.api_quota_limits(provider) on delete cascade,
  reserve_provider text not null unique references public.api_quota_limits(provider) on delete cascade,
  feature text not null,
  reserved_daily integer not null check (reserved_daily > 0),
  reserved_monthly integer not null check (reserved_monthly > 0),
  note text,
  updated_at timestamptz not null default now(),
  primary key (provider, feature)
);

alter table public.api_quota_reserves enable row level security;
revoke all on public.api_quota_reserves from public, anon, authenticated;
grant select on public.api_quota_reserves to service_role;

-- The reserved provider labels are accounting/quota aliases; actual provider calls and event provenance
-- continue to use the canonical Parallel endpoint names.
insert into public.api_quota_limits(provider,daily_cap,monthly_cap,note)
values
  ('parallel:settlement',200,2000,'Reserved exclusively for PFIE settlement-priority Search calls'),
  ('parallel-extract:settlement',400,2000,'Reserved exclusively for PFIE settlement-priority Extract calls'),
  ('parallel-chat:low:settlement',100,3000,'Reserved exclusively for PFIE settlement-priority Responses Low calls')
on conflict (provider) do update
set daily_cap=excluded.daily_cap,monthly_cap=excluded.monthly_cap,note=excluded.note,updated_at=now();

insert into public.api_unit_prices(provider,usd_per_unit,note)
values
  ('parallel:settlement',0.001,'Parallel Search settlement reserve, same unit price as canonical Search'),
  ('parallel-extract:settlement',0.001,'Parallel Extract settlement reserve, same unit price as canonical Extract'),
  ('parallel-chat:low:settlement',0.01,'Parallel Responses Low settlement reserve, same unit price as canonical Responses Low')
on conflict (provider) do update
set usd_per_unit=excluded.usd_per_unit,note=excluded.note,updated_at=now();

insert into public.api_quota_reserves(provider,reserve_provider,feature,reserved_daily,reserved_monthly,note)
values
  ('parallel','parallel:settlement','pfie:settlement-priority',200,2000,'Protected for priority final-result verification'),
  ('parallel-extract','parallel-extract:settlement','pfie:settlement-priority',400,2000,'Protected for priority final-result extraction'),
  ('parallel-chat:low','parallel-chat:low:settlement','pfie:settlement-priority',100,3000,'Protected for priority result reconciliation')
on conflict (provider,feature) do update
set reserve_provider=excluded.reserve_provider,reserved_daily=excluded.reserved_daily,
    reserved_monthly=excluded.reserved_monthly,note=excluded.note,updated_at=now();

-- Split the user's existing raised totals into general and settlement pools without reducing total capacity.
update public.api_quota_limits
set daily_cap=case provider
      when 'parallel' then 2300
      when 'parallel-extract' then 2100
      when 'parallel-chat:low' then 1400
    end,
    monthly_cap=case provider
      when 'parallel' then 28000
      when 'parallel-extract' then 8000
      when 'parallel-chat:low' then 15000
    end,
    note=case provider
      when 'parallel' then 'General pool; separate settlement reserve 200/day and 2,000/month; combined current cap 2,500/day and 30,000/month'
      when 'parallel-extract' then 'General pool; separate settlement reserve 400/day and 2,000/month; combined current cap 2,500/day and 10,000/month'
      when 'parallel-chat:low' then 'General pool; separate settlement reserve 100/day and 3,000/month; combined current cap 1,500/day and 18,000/month'
    end,
    updated_at=now()
where provider in ('parallel','parallel-extract','parallel-chat:low');

-- Settlement aliases must retain the auxiliary family classification of Responses Low.
create or replace function public.api_provider_family(p_provider text)
returns text
language sql
immutable
set search_path to 'public', 'pg_temp'
as $function$
  select case
    when p_provider = 'parallel-chat:medium' then 'parallel-newsroom'
    when p_provider in (
      'parallel-chat:low',
      'parallel-monitor:lite',
      'parallel-task:lite',
      'parallel-chat:low:settlement'
    ) then 'parallel-aux'
    else split_part(split_part(p_provider, ':', 1), '-', 1)
  end;
$function$;

-- Add feature-aware quota lanes and reserve USD headroom for the settlement feature.
do $migration$
declare
  v_definition text;
  v_original text;
begin
  v_definition := pg_get_functiondef(
    'public.api_budget_claim_context(text,integer,text,text,uuid,uuid,jsonb)'::regprocedure
  );
  v_original := v_definition;

  v_definition := replace(
    v_definition,
    $old$  v_feature text := coalesce(nullif(trim(p_feature), ''), 'unattributed');$old$,
    $new$  v_feature text := coalesce(nullif(trim(p_feature), ''), 'unattributed');
  v_priority boolean := v_feature = 'pfie:settlement-priority';
  v_quota_provider text := p_provider;
  v_provider_backoff_key text := p_provider || case when v_feature = 'pfie:settlement-priority' then ':settlement' else ':general' end;
  v_family_backoff_key text;
  v_global_backoff_key text := 'parallel' || case when v_feature = 'pfie:settlement-priority' then ':settlement' else ':general' end;
  v_family_limit numeric;
  v_period_limit numeric;$new$
  );

  v_definition := replace(
    v_definition,
    $old$  if v_feature like 'pfie:%' then
    v_family := 'parallel';
  elsif v_synthetic then
    v_family := 'parallel-synthetic';
  end if;$old$,
    $new$  if v_feature like 'pfie:%' then
    v_family := 'parallel';
  elsif v_synthetic then
    v_family := 'parallel-synthetic';
  end if;

  v_family_backoff_key := v_family || case when v_priority then ':settlement' else ':general' end;

  if v_priority then
    select reserve_provider into v_quota_provider
      from public.api_quota_reserves
     where provider = p_provider and feature = v_feature;
    if not found then
      v_reason := 'settlement_reserve_not_configured';
      v_blocked_until := v_now + interval '15 minutes';
    end if;
  end if;$new$
  );

  v_definition := replace(
    v_definition,
    $old$where scope = 'global' and scope_key = 'parallel' and blocked_until > v_now;$old$,
    $new$where scope = 'global'
       and scope_key in ('parallel', v_global_backoff_key)
       and blocked_until > v_now
     order by case when scope_key = 'parallel' then 0 else 1 end
     limit 1;$new$
  );

  v_definition := replace(
    v_definition,
    $old$where scope = 'family' and scope_key = v_family and blocked_until > v_now;$old$,
    $new$where scope = 'family'
       and scope_key in (v_family, v_family_backoff_key)
       and blocked_until > v_now
     order by case when scope_key = v_family then 0 else 1 end
     limit 1;$new$
  );

  v_definition := replace(
    v_definition,
    $old$where scope = 'provider' and scope_key = p_provider and blocked_until > v_now;$old$,
    $new$where scope = 'provider'
       and scope_key in (p_provider, v_provider_backoff_key)
       and blocked_until > v_now
     order by case when scope_key = p_provider then 0 else 1 end
     limit 1;$new$
  );

  v_definition := replace(
    v_definition,
    $old$      if v_spent + v_price * p_units > v_budget.monthly_usd then$old$,
    $new$      v_family_limit := case
        when v_priority or v_family <> 'parallel' then v_budget.monthly_usd
        else greatest(0, v_budget.monthly_usd - 10)
      end;
      if v_spent + v_price * p_units > v_family_limit then$new$
  );

  v_definition := replace(
    v_definition,
    $old$          ('family', v_family, v_blocked_until, v_reason, v_feature, p_competition, p_job_run_id, coalesce(p_metadata, '{}'::jsonb))$old$,
    $new$          ('family', v_family_backoff_key, v_blocked_until, v_reason, v_feature, p_competition, p_job_run_id, coalesce(p_metadata, '{}'::jsonb))$new$
  );

  v_definition := replace(
    v_definition,
    $old$      if v_period_spent + v_price * p_units > v_period.limit_usd then$old$,
    $new$      v_period_limit := case
        when v_priority then v_period.limit_usd
        else greatest(0, v_period.limit_usd - 25)
      end;
      if v_period_spent + v_price * p_units > v_period_limit then$new$
  );

  v_definition := replace(
    v_definition,
    $old$          ('global', 'parallel', v_blocked_until, v_reason, v_feature, p_competition, p_job_run_id, coalesce(p_metadata, '{}'::jsonb))$old$,
    $new$          ('global', v_global_backoff_key, v_blocked_until, v_reason, v_feature, p_competition, p_job_run_id, coalesce(p_metadata, '{}'::jsonb))$new$
  );

  v_definition := replace(
    v_definition,
    $old$v_granted := public.api_quota_claim(p_provider, p_units);$old$,
    $new$v_granted := public.api_quota_claim(v_quota_provider, p_units);$new$
  );

  v_definition := replace(
    v_definition,
    $old$where q.provider = p_provider$old$,
    $new$where q.provider = v_quota_provider$new$
  );

  v_definition := replace(
    v_definition,
    $old$        ('provider', p_provider, v_blocked_until, v_reason, v_feature, p_competition, p_job_run_id, coalesce(p_metadata, '{}'::jsonb))$old$,
    $new$        ('provider', v_provider_backoff_key, v_blocked_until, v_reason, v_feature, p_competition, p_job_run_id, coalesce(p_metadata, '{}'::jsonb))$new$
  );

  v_definition := replace(
    v_definition,
    $old$      'blocked_until', v_blocked_until$new$,
    $new$      'blocked_until', v_blocked_until,
      'quota_provider', v_quota_provider,
      'settlement_priority', v_priority$new$
  );

  if v_definition = v_original
     or position('v_quota_provider' in v_definition) = 0
     or position('v_family_backoff_key' in v_definition) = 0
     or position('v_period_limit' in v_definition) = 0 then
    raise exception 'Failed to patch api_budget_claim_context for settlement quota reserves';
  end if;

  execute v_definition;
end
$migration$;

-- Keep the quota restoration schedule's approved totals unchanged while splitting general and reserved pools.
select cron.alter_job(
  79,
  null,
  $cmd$DO $restore$
DECLARE
  v_ready boolean := false;
  v_updated integer := 0;
  v_reserved_updated integer := 0;
BEGIN
  IF now() >= timestamptz '2026-11-29 00:05:00+00' THEN
    SELECT
      NOT EXISTS (
        SELECT 1 FROM public.platform_implementation_tasks
        WHERE id IN (
          'ebb08551-8817-4b80-832e-941bca79fc04',
          '4b932e80-fe80-4ab4-86e3-69f5b7b114cf',
          '4e7d26f1-14e2-4f1b-b3fd-b376bc41c173',
          '66c3a929-5af5-4ca1-a9b1-529499980403',
          '3fc45026-ca32-4d04-9804-270eabaa84aa'
        )
        AND status <> 'completed'
      )
      AND EXISTS (
        SELECT 1 FROM public.platform_implementation_tasks
        WHERE id='f27651ff-c4fa-40a3-98f3-b54284e37af3'
          AND status='in_progress' AND progress >= 90
      )
    INTO v_ready;
    IF v_ready THEN
      UPDATE public.api_quota_limits
      SET daily_cap = CASE provider
            WHEN 'parallel' THEN 1000
            WHEN 'parallel-extract' THEN 2100
            WHEN 'parallel-chat:low' THEN 400
            WHEN 'parallel-chat:medium' THEN 18
          END,
          monthly_cap = CASE provider
            WHEN 'parallel' THEN 10000
            WHEN 'parallel-extract' THEN 8000
            WHEN 'parallel-chat:low' THEN 9000
            WHEN 'parallel-chat:medium' THEN 1000
          END,
          updated_at = now()
      WHERE provider IN ('parallel','parallel-extract','parallel-chat:low','parallel-chat:medium');
      GET DIAGNOSTICS v_updated = ROW_COUNT;

      UPDATE public.api_quota_limits
      SET daily_cap = CASE provider
            WHEN 'parallel:settlement' THEN 200
            WHEN 'parallel-extract:settlement' THEN 400
            WHEN 'parallel-chat:low:settlement' THEN 100
          END,
          monthly_cap = CASE provider
            WHEN 'parallel:settlement' THEN 2000
            WHEN 'parallel-extract:settlement' THEN 2000
            WHEN 'parallel-chat:low:settlement' THEN 3000
          END,
          updated_at = now()
      WHERE provider IN ('parallel:settlement','parallel-extract:settlement','parallel-chat:low:settlement');
      GET DIAGNOSTICS v_reserved_updated = ROW_COUNT;

      IF v_updated = 4 AND v_reserved_updated = 3 THEN
        INSERT INTO public.platform_implementation_task_events(task_id,event_type,detail)
        VALUES (
          'f27651ff-c4fa-40a3-98f3-b54284e37af3',
          'completed',
          jsonb_build_object(
            'quota_restored_at',now(),
            'daily_caps',jsonb_build_object('parallel',1200,'parallel-extract',2500,'parallel-chat:low',500,'parallel-chat:medium',18),
            'monthly_caps',jsonb_build_object('parallel',12000,'parallel-extract',10000,'parallel-chat:low',12000,'parallel-chat:medium',1000),
            'general_daily_caps',jsonb_build_object('parallel',1000,'parallel-extract',2100,'parallel-chat:low',400),
            'settlement_reserved_daily',jsonb_build_object('parallel',200,'parallel-extract',400,'parallel-chat:low',100),
            'general_monthly_caps',jsonb_build_object('parallel',10000,'parallel-extract',8000,'parallel-chat:low',9000),
            'settlement_reserved_monthly',jsonb_build_object('parallel',2000,'parallel-extract',2000,'parallel-chat:low',3000),
            'core_monthly_settlement_reserve_usd',10,
            'shared_q1_settlement_reserve_usd',25,
            'guarded_by_phase3_completion',true
          )
        );
        UPDATE public.platform_implementation_tasks
        SET status='completed',progress=100,completed_at=now(),updated_at=now()
        WHERE id='f27651ff-c4fa-40a3-98f3-b54284e37af3';
        UPDATE public.platform_implementation_tasks
        SET status='completed',progress=100,completed_at=now(),updated_at=now()
        WHERE id='933b923f-07de-435d-a7a1-9ff047a21d69';
        PERFORM cron.unschedule(79);
      END IF;
    END IF;
  END IF;
END
$restore$;$cmd$,
  null,
  null,
  true
);
