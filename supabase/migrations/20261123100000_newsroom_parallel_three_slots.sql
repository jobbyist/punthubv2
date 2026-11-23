-- Newsroom expansion: Parallel-first editorial engine and three daily publishing slots.
-- Safe to deploy before the code: the additional categories are additive and the scheduled endpoints remain auth-protected.

alter table public.newsroom_articles drop constraint if exists newsroom_articles_category_check;
alter table public.newsroom_articles add constraint newsroom_articles_category_check
  check (category in ('company', 'product', 'pfie', 'features', 'community', 'launch', 'sports', 'breaking', 'editorial', 'intelligence'));

create or replace function public.newsroom_after_publish()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'PUBLISHED'
     and (tg_op = 'INSERT' or old.status is distinct from 'PUBLISHED') then
    insert into public.notifications (title, message, category, target_url, newsroom_article_id, published_at)
    values (
      left(new.title, 140), left(new.excerpt, 400),
      case new.category
        when 'company' then 'Company Updates'
        when 'product' then 'Product Development'
        when 'pfie' then 'PFIE & Technology'
        when 'features' then 'Features & Improvements'
        when 'community' then 'Community'
        when 'sports' then 'Sports Intelligence'
        when 'breaking' then 'Breaking News'
        when 'editorial' then 'Editorial Analysis'
        when 'intelligence' then 'Sports Intelligence'
        else 'Launch Announcements'
      end,
      '/newsroom/' || new.slug, new.id, new.published_at)
    on conflict (newsroom_article_id) do nothing;
  end if;
  return new;
end;
$$;

-- The Responses Medium unit price already exists in api_unit_prices. Add a conservative newsroom-specific call cap.
insert into public.api_quota_limits (provider, daily_cap, monthly_cap, note)
values ('parallel-chat:medium', 15, 450, 'Newsroom article generation and editorial revisions; Medium reasoning')
on conflict (provider) do update
set daily_cap = excluded.daily_cap, monthly_cap = excluded.monthly_cap,
    note = excluded.note, updated_at = now();

-- Keep the $35 monthly Parallel family ceiling aligned with the active grant plan.
update public.api_budgets
set monthly_usd = 35.00,
    note = 'Newsroom + research allocation; $245 aggregate planning ceiling through May 2027, subject to the actual $250 grant balance and expiry on 22 May 2027.',
    updated_at = now()
where family = 'parallel';

-- Replace the one-article daily schedule with three independently idempotent editorial slots.
select cron.unschedule('content-daily') where exists (select 1 from cron.job where jobname = 'content-daily');
select cron.unschedule('content-breaking') where exists (select 1 from cron.job where jobname = 'content-breaking');
select cron.unschedule('content-editorial') where exists (select 1 from cron.job where jobname = 'content-editorial');
select cron.unschedule('content-editorial-retry-1') where exists (select 1 from cron.job where jobname = 'content-editorial-retry-1');
select cron.unschedule('content-editorial-retry-2') where exists (select 1 from cron.job where jobname = 'content-editorial-retry-2');
select cron.unschedule('content-intelligence') where exists (select 1 from cron.job where jobname = 'content-intelligence');

-- 06:00 SAST Breaking News; retries at 06:20 and 06:40.
select cron.schedule('content-breaking', '0,20,40 4 * * *',
  $$select public.invoke_cron('/api/cron/content-daily?slot=breaking&trigger=cron&benchmark=1')$$);
-- 12:30 SAST Editorial Analysis; retries at 12:50 and 13:10.
select cron.schedule('content-editorial', '30 10 * * *',
  $$select public.invoke_cron('/api/cron/content-daily?slot=editorial&trigger=cron')$$);
select cron.schedule('content-editorial-retry-1', '50 10 * * *',
  $$select public.invoke_cron('/api/cron/content-daily?slot=editorial&trigger=cron')$$);
select cron.schedule('content-editorial-retry-2', '10 11 * * *',
  $$select public.invoke_cron('/api/cron/content-daily?slot=editorial&trigger=cron')$$);
-- 18:00 SAST Sports Intelligence; retries at 18:20 and 18:40.
select cron.schedule('content-intelligence', '0,20,40 16 * * *',
  $$select public.invoke_cron('/api/cron/content-daily?slot=intelligence&trigger=cron')$$);
