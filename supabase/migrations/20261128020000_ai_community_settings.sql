insert into public.app_settings (key, value)
values
  ('ai_community_enabled', 'true'),
  ('community_member_daily_post_cap', '10')
on conflict (key) do nothing;