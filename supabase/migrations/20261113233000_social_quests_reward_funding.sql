-- 13 Nov 2026 (owner): (1) no incentive that risks the Puntr social media pages: the Instagram, Facebook, X and TikTok
-- quests stop paying points and become plain "visit" links (Meta, X and TikTok restrict rewarded follows/likes).
-- Community channels (WhatsApp group, Telegram) keep their quests. Anything already submitted for a social page is
-- closed without points. (2) Rewards are funded by Puntr or by a sponsor/partner, set per reward in Admin > Rewards.

alter table public.quests add column if not exists rewarded boolean not null default true;

update public.quests
  set rewarded = false,
      title = case code
        when 'follow_instagram' then 'Visit Puntr on Instagram'
        when 'like_facebook' then 'Visit Puntr South Africa on Facebook'
        when 'follow_x' then 'Visit Puntr on X'
        when 'follow_tiktok' then 'Visit Puntr on TikTok'
      end,
      description = 'Fixtures, results and community picks. No points: just say hi.',
      verification = 'auto',
      handle_label = null,
      updated_at = now()
  where code in ('follow_instagram', 'like_facebook', 'follow_x', 'follow_tiktok');

update public.quest_progress
  set status = 'rejected', review_note = 'Social page visits no longer earn points.'
  where quest_code in ('follow_instagram', 'like_facebook', 'follow_x', 'follow_tiktok') and status in ('started', 'submitted');

-- quest_award never pays an unrewarded quest; quests_sync skips them (their check always returns false anyway).
create or replace function public.quest_award(p_user uuid, p_code text, p_reviewer uuid default null)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_q public.quests;
  v_n integer := 0;
begin
  select * into v_q from public.quests where code = p_code and active and not coming_soon and rewarded;
  if not found then return 0; end if;
  if public.reward_setting('points_enabled') and public.quest_member_ok(p_user) then
    insert into public.puntpoints_ledger (user_id, kind, rule_code, points, ref_id, reason)
    values (p_user, 'award', 'quest', v_q.points, p_code, v_q.title)
    on conflict (user_id, rule_code, ref_id) where kind = 'award' do nothing;
    get diagnostics v_n = row_count;
  end if;
  insert into public.quest_progress (user_id, quest_code, status, verified_at, reviewed_by, points_awarded)
  values (p_user, p_code, 'verified', now(), p_reviewer, case when v_n = 1 then v_q.points else 0 end)
  on conflict (user_id, quest_code) do update
    set status = 'verified', verified_at = now(), reviewed_by = coalesce(excluded.reviewed_by, quest_progress.reviewed_by),
        points_awarded = quest_progress.points_awarded + excluded.points_awarded;
  return case when v_n = 1 then v_q.points else 0 end;
end;
$$;
revoke all on function public.quest_award(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.quest_award(uuid, text, uuid) to service_role;

-- Reward funding.
alter table public.rewards
  add column if not exists funded_by text not null default 'puntr',
  add column if not exists sponsor_url text check (sponsor_url is null or sponsor_url ~ '^https://');
do $$
begin
  alter table public.rewards add constraint rewards_funded_by_check check (funded_by in ('puntr', 'sponsor', 'partner'));
exception when duplicate_object then null;
end $$;

-- The public catalogue shows who funds each reward.
drop function if exists public.rewards_catalogue();
create function public.rewards_catalogue()
returns table (
  id uuid, code text, title text, description text, kind text, category text, points_cost integer,
  face_value_cents integer, sponsor text, funded_by text, sponsor_url text, fulfilment text, terms text,
  in_stock boolean, available boolean, available_from timestamptz
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select r.id, r.code, r.title, r.description, r.kind, r.category, r.points_cost, r.face_value_cents, r.sponsor,
    r.funded_by, r.sponsor_url, r.fulfilment, r.terms,
    case
      when exists (select 1 from public.reward_codes c where c.reward_id = r.id)
        then exists (select 1 from public.reward_codes c where c.reward_id = r.id and c.redemption_id is null)
      else r.stock is null or r.stock > 0
    end,
    public.reward_setting('rewards_enabled') and now() >= public.launch_at()
      and (r.available_from is null or r.available_from <= now()),
    greatest(coalesce(r.available_from, '-infinity'::timestamptz), public.launch_at())
  from public.rewards r
  where r.active and r.kind <> 'betting_voucher' and r.category is not null
  order by r.sort, r.points_cost, r.title;
$$;
revoke all on function public.rewards_catalogue() from public;
grant execute on function public.rewards_catalogue() to anon, authenticated, service_role;

insert into public.notice_versions (kind, version, effective_at, url)
values ('privacy', '2026-11-13-r15', now(), '/privacy'), ('terms', '2026-11-13-r15', now(), '/terms')
on conflict (kind, version) do nothing;
