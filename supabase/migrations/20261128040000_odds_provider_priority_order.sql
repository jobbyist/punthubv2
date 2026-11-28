-- Align live odds-source registry ordering with the approved pre-launch rollout priority.
-- This changes discovery priority only. It deliberately does not enable any bookmaker or
-- change licence/data-rights/automated-access approval states.
update public.bookmaker_odds_permissions
set affiliate_priority = case lower(bookmaker_name)
  when 'hollywoodbets' then 1
  when 'betway' then 2
  when 'easybet' then 3
  when '1xbet' then 4
  when 'sportingbet sa' then 5
  when 'supabets' then 6
  when 'yesplay' then 7
  when 'playbet' then 8
  else affiliate_priority + 10
end
where lower(bookmaker_name) in (
  'hollywoodbets', 'betway', 'easybet', '1xbet', 'sportingbet sa',
  'supabets', 'yesplay', 'playbet'
);
