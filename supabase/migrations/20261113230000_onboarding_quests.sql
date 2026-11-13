-- 13 Nov 2026: onboarding quests ("Get started, earn PuntPoints"), Firecrawl-style checklist (owner request).
-- Every quest is tracked and verified before PuntPoints are given:
--   auto    : the database checks it (email confirmed, two-step on, profile complete, identity verified, marketing
--             consent on, a friend joined with your invite and confirmed their email).
--   device  : the app reports it from the device and the database records it (installed app, push turned on);
--             one claim per member.
--   review  : social follows/joins. The member opens the link (tracked), then submits their handle; an admin checks
--             it on the platform and approves or rejects it in Admin > Quests. Points only on approval.
-- Points go into the PuntPoints ledger once per quest (unique index), only for members in good standing.

create table if not exists public.quests (
  code text primary key check (code ~ '^[a-z][a-z0-9_]{2,40}$'),
  title text not null check (char_length(title) between 3 and 80),
  description text not null check (char_length(description) between 3 and 300),
  category text not null check (category in ('account', 'social', 'notifications', 'app', 'referral')),
  verification text not null check (verification in ('auto', 'device', 'review')),
  points integer not null check (points between 1 and 2000),
  action_url text,
  handle_label text,
  sort integer not null default 100,
  active boolean not null default true,
  coming_soon boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.quest_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  quest_code text not null references public.quests (code) on delete cascade,
  status text not null default 'started' check (status in ('started', 'submitted', 'verified', 'rejected')),
  evidence text check (evidence is null or char_length(evidence) <= 120),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  verified_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  review_note text check (review_note is null or char_length(review_note) <= 300),
  points_awarded integer not null default 0,
  primary key (user_id, quest_code)
);
create index if not exists quest_progress_review_idx on public.quest_progress (submitted_at) where status = 'submitted';

alter table public.quests enable row level security;
alter table public.quest_progress enable row level security;

drop policy if exists quests_read on public.quests;
create policy quests_read on public.quests for select to anon, authenticated using (active or public.is_admin());

drop policy if exists quest_progress_own on public.quest_progress;
create policy quest_progress_own on public.quest_progress
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

revoke all on public.quests, public.quest_progress from anon, authenticated;
grant select on public.quests to anon, authenticated;
grant select on public.quest_progress to authenticated;
grant select, insert, update, delete on public.quests, public.quest_progress to service_role;

insert into public.quests (code, title, description, category, verification, points, action_url, handle_label, sort, coming_soon) values
  ('confirm_email', 'Confirm your email', 'Confirm the email on your account.', 'account', 'auto', 50, '/account/security', null, 10, false),
  ('enable_mfa', 'Turn on two-step verification', 'Add an authenticator app to protect your account.', 'account', 'auto', 100, '/account/security', null, 11, false),
  ('complete_profile', 'Complete your profile', 'Add a profile picture, your name, phone, date of birth and province.', 'account', 'auto', 150, '/account', null, 12, false),
  ('verify_identity', 'Verify your identity', 'Needed before you redeem rewards. Your document is deleted once checked.', 'account', 'auto', 100, '/account#identity', null, 13, false),
  ('follow_instagram', 'Follow Puntr on Instagram', 'Follow @puntrza for fixtures, results and community picks.', 'social', 'review', 50, 'https://instagram.com/puntrza', 'Your Instagram username', 20, false),
  ('like_facebook', 'Like Puntr South Africa on Facebook', 'Like and follow the Puntr South Africa page.', 'social', 'review', 50, 'https://www.facebook.com/share/19yV1eSk71/?mibextid=wwXIfr', 'Your Facebook name', 21, false),
  ('follow_x', 'Follow Puntr on X', 'Follow @puntrza on X (Twitter).', 'social', 'review', 50, 'https://x.com/puntrza', 'Your X handle', 22, false),
  ('follow_tiktok', 'Follow Puntr on TikTok', 'Follow @puntrza on TikTok.', 'social', 'review', 50, 'https://tiktok.com/@puntrza', 'Your TikTok username', 23, false),
  ('join_whatsapp', 'Join the Puntr WhatsApp group', 'Join the community group for match-day chat and updates.', 'social', 'review', 75, 'https://chat.whatsapp.com/F7wPY6NrXSc7OPrqq3os7w', 'The name you use on WhatsApp', 24, false),
  ('join_telegram', 'Join Puntr on Telegram', 'Join the Puntr Telegram channel.', 'social', 'review', 50, 'https://t.me/puntrza', 'Your Telegram username', 25, false),
  ('email_updates', 'Turn on email updates', 'Get fixtures, results and Puntr news by email. You can switch it off any time.', 'notifications', 'auto', 50, '/account/privacy', null, 30, false),
  ('whatsapp_updates', 'Turn on WhatsApp and SMS updates', 'Get match-day reminders by WhatsApp or SMS. You can switch it off any time.', 'notifications', 'auto', 50, '/account/privacy', null, 31, false),
  ('push_notifications', 'Turn on push notifications', 'Get alerts on this device when your picks settle.', 'notifications', 'device', 50, null, null, 32, true),
  ('install_app', 'Install the Puntr app', 'Add Puntr to your home screen, then open it from there.', 'app', 'device', 100, null, null, 40, true),
  ('refer_friend', 'Invite a friend', 'A friend joins with your invite link and confirms their email.', 'referral', 'auto', 150, '/referrals', null, 50, false)
on conflict (code) do nothing;

-- Is the member in good standing to earn? (same rule as award_points)
create or replace function public.quest_member_ok(p_user uuid)
returns boolean language sql stable security definer set search_path = public, auth, pg_temp as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user and p.is_18_attested and not p.is_banned
      and (p.posting_paused_until is null or p.posting_paused_until <= now())
      and (p.suspended_until is null or p.suspended_until <= now())
  ) and public.can_post(p_user);
$$;

-- Latest consent choice for a purpose.
create or replace function public.quest_consent(p_user uuid, p_purpose text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select granted from public.consent_records
                   where user_id = p_user and purpose = p_purpose order by seq desc limit 1), false);
$$;

-- Server-side checks for auto quests.
create or replace function public.quest_auto_done(p_user uuid, p_code text)
returns boolean language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  case p_code
    when 'confirm_email' then
      return exists (select 1 from auth.users where id = p_user and email_confirmed_at is not null);
    when 'enable_mfa' then
      return exists (select 1 from auth.mfa_factors where user_id = p_user and status = 'verified');
    when 'complete_profile' then
      return exists (
        select 1 from public.profiles p join public.member_details d on d.user_id = p.id
        where p.id = p_user and p.avatar_url is not null and coalesce(p.display_name, '') <> ''
          and coalesce(d.first_name, '') <> '' and coalesce(d.last_name, '') <> ''
          and coalesce(d.phone, '') <> '' and d.date_of_birth is not null and coalesce(d.province, '') <> ''
      );
    when 'verify_identity' then
      return exists (select 1 from public.identity_verifications where user_id = p_user and status = 'verified');
    when 'email_updates' then
      return public.quest_consent(p_user, 'marketing_email');
    when 'whatsapp_updates' then
      return public.quest_consent(p_user, 'marketing_whatsapp');
    when 'refer_friend' then
      return exists (
        select 1 from public.profiles f join auth.users u on u.id = f.id
        where f.referred_by = p_user and u.email_confirmed_at is not null and not f.is_banned
          and f.username not like 'deleted-%'
      );
    else
      return false;
  end case;
end;
$$;

-- Gives the quest's points once (ledger unique index) and marks it verified.
create or replace function public.quest_award(p_user uuid, p_code text, p_reviewer uuid default null)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_q public.quests;
  v_n integer := 0;
begin
  select * into v_q from public.quests where code = p_code and active and not coming_soon;
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

-- Member: checks every auto quest and gives points for the ones now done. Returns points given in this call.
create or replace function public.quests_sync()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_total integer := 0;
  r record;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  perform pg_advisory_xact_lock(hashtext('quests:' || v_uid::text));
  for r in
    select q.code from public.quests q
    where q.active and not q.coming_soon and q.verification = 'auto'
      and not exists (select 1 from public.quest_progress p
                      where p.user_id = v_uid and p.quest_code = q.code and p.status = 'verified')
  loop
    if public.quest_auto_done(v_uid, r.code) then
      v_total := v_total + public.quest_award(v_uid, r.code, null);
    end if;
  end loop;
  return v_total;
end;
$$;

-- Member: records that a quest link was opened (needed before a review quest can be submitted).
create or replace function public.quest_start(p_code text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.quests where code = p_code and active and not coming_soon) then
    raise exception 'quest_not_found' using errcode = 'P0001';
  end if;
  insert into public.quest_progress (user_id, quest_code) values (auth.uid(), p_code)
  on conflict (user_id, quest_code) do nothing;
end;
$$;

-- Member: submits a handle for a review quest. Allowed only after the link was opened and at least 10 seconds ago.
create or replace function public.quest_submit(p_code text, p_evidence text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_p public.quest_progress;
  v_e text := btrim(coalesce(p_evidence, ''));
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if char_length(v_e) not between 2 and 120 then raise exception 'bad_evidence' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.quests where code = p_code and active and not coming_soon and verification = 'review') then
    raise exception 'quest_not_found' using errcode = 'P0001';
  end if;
  select * into v_p from public.quest_progress where user_id = v_uid and quest_code = p_code for update;
  if not found then raise exception 'open_link_first' using errcode = 'P0001'; end if;
  if v_p.status = 'verified' then return 'verified'; end if;
  if v_p.started_at > now() - interval '10 seconds' then raise exception 'too_soon' using errcode = 'P0001'; end if;
  update public.quest_progress
    set status = 'submitted', evidence = v_e, submitted_at = now(), review_note = null
    where user_id = v_uid and quest_code = p_code;
  return 'submitted';
end;
$$;

-- Member: claims a device quest (install_app, push_notifications). The app calls it only when the device reports it.
create or replace function public.quest_claim_device(p_code text)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.quests where code = p_code and active and not coming_soon and verification = 'device') then
    raise exception 'quest_not_found' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('quests:' || auth.uid()::text));
  return public.quest_award(auth.uid(), p_code, null);
end;
$$;

-- Admin: approve or reject a submitted review quest.
create or replace function public.admin_quest_review(p_user uuid, p_code text, p_approve boolean, p_note text default null)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_points integer := 0;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.quest_progress where user_id = p_user and quest_code = p_code and status = 'submitted') then
    raise exception 'not_submitted' using errcode = 'P0001';
  end if;
  if p_approve then
    v_points := public.quest_award(p_user, p_code, auth.uid());
  else
    update public.quest_progress
      set status = 'rejected', reviewed_by = auth.uid(), review_note = nullif(btrim(coalesce(p_note, '')), '')
      where user_id = p_user and quest_code = p_code;
  end if;
  insert into public.admin_actions (admin_id, action, target_user, detail)
  values (auth.uid(), case when p_approve then 'quest.approve' else 'quest.reject' end, p_user,
          jsonb_build_object('quest', p_code, 'points', v_points, 'note', p_note));
  return v_points;
end;
$$;

revoke all on function public.quest_member_ok(uuid) from public, anon, authenticated;
revoke all on function public.quest_consent(uuid, text) from public, anon, authenticated;
revoke all on function public.quest_auto_done(uuid, text) from public, anon, authenticated;
revoke all on function public.quest_award(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.quests_sync() from public, anon;
revoke all on function public.quest_start(text) from public, anon;
revoke all on function public.quest_submit(text, text) from public, anon;
revoke all on function public.quest_claim_device(text) from public, anon;
revoke all on function public.admin_quest_review(uuid, text, boolean, text) from public, anon;
grant execute on function public.quests_sync(), public.quest_start(text), public.quest_submit(text, text),
  public.quest_claim_device(text), public.admin_quest_review(uuid, text, boolean, text) to authenticated;
grant execute on function public.quest_member_ok(uuid), public.quest_consent(uuid, text),
  public.quest_auto_done(uuid, text), public.quest_award(uuid, text, uuid) to service_role;

insert into public.notice_versions (kind, version, effective_at, url)
values ('privacy', '2026-11-13-r14', now(), '/privacy'), ('terms', '2026-11-13-r14', now(), '/terms')
on conflict (kind, version) do nothing;

-- Privacy: social usernames are deleted 90 days after the quest is checked, and straight away for deleted accounts.
create or replace function public.quest_evidence_purge()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_n integer;
begin
  update public.quest_progress qp
    set evidence = null
    where qp.evidence is not null
      and (
        (qp.status in ('verified', 'rejected') and coalesce(qp.verified_at, qp.submitted_at) < now() - interval '90 days')
        or exists (select 1 from public.profiles p where p.id = qp.user_id and p.username like 'deleted-%')
      );
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.quest_evidence_purge() from public, anon, authenticated;
grant execute on function public.quest_evidence_purge() to service_role;
do $$ begin perform cron.unschedule('quest-evidence-purge'); exception when others then null; end $$;
select cron.schedule('quest-evidence-purge', '30 1 * * *', $$select public.quest_evidence_purge()$$);
