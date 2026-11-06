-- Three launch briefs, scheduled for 11:10 SAST (09:10 UTC) on 6 Nov 2026. The pg_cron job flips them to
-- PUBLISHED and the trigger creates one bell notification each. Idempotent on slug.
insert into public.newsroom_articles
  (slug, title, excerpt, body, cover_image_url, og_image_url, category, status, published_at, seo_title, seo_description)
values
('founding-member-sign-ups-are-open',
 'Founding Member sign-ups are open',
 'Since 2 November the first 100 people can join Puntr free and earn a permanent, numbered Founding badge ahead of launch on 1 December 2026.',
 E'Founding Member sign-ups opened on Monday 2 November 2026. The first 100 people to join Puntr free get a permanent Founding badge, numbered from #1 to #100, ahead of our official launch on Tuesday 1 December 2026.\n\nPredict what''s next. Prove your worth. Puntr is a community-first football intelligence platform for South African tipsters. You publish predictions, build a public record that is graded on results, and see where you stand on the weekly leaderboard.\n\nWhat Founding Members get: a permanent numbered badge, full access to posting, your record and the weekly leaderboard, and early access to features as they ship. Joining is free.\n\nPuntr does not take bets and does not promise returns of any kind. Predictions are opinions, and results are never guaranteed.\n\nGet in early. Become a Founding Member. Be part of what''s next. Join free at puntr.co.za/founding.\n\nPuntr is for people aged 18 and over. T&Cs apply. If gambling is a problem for you or someone you know, call the National Responsible Gambling Programme on 0800 006 008.',
 'https://puntr.co.za/newsroom/founding-campaign-open.png','https://puntr.co.za/newsroom/founding-campaign-open.png',
 'launch','SCHEDULED','2026-11-06T09:10:00Z',
 'Founding Member sign-ups are open | Puntr',
 'Join Puntr free and claim a permanent numbered Founding badge. The first 100 members, ahead of launch on 1 December 2026.'),
('founding-member-annual-pass',
 'Introducing the Founding Member Annual Pass',
 'One payment of R299 gives Founding Members 12 months of Puntr Pro from launch day. No auto-renewal.',
 E'The Founding Member Annual Pass gives you 12 months of Puntr Pro for a once-off R299. Standard Puntr Pro is R99 a month, which is R1,188 over a year, so the Annual Pass saves you R889.\n\nHow it works: your 12 months start on launch day, 1 December 2026. It is a single payment and it does not renew automatically. When the 12 months end, you choose whether to continue.\n\nThe pass is offered to Founding Members. It is a prepaid membership for the Puntr platform and tools. It is not an investment, and it does not change how predictions are graded.\n\nIf you have not claimed your Founding spot yet, joining is free at puntr.co.za/founding. Pass details and checkout open before launch; we will tell you here and by email when they do.\n\nPuntr is for people aged 18 and over. T&Cs apply. National Responsible Gambling Programme: 0800 006 008.',
 'https://puntr.co.za/newsroom/founding-annual-pass.png','https://puntr.co.za/newsroom/founding-annual-pass.png',
 'product','SCHEDULED','2026-11-06T09:10:00Z',
 'Founding Member Annual Pass: 12 months of Puntr Pro for R299 | Puntr',
 'Founding Members can get 12 months of Puntr Pro for a once-off R299 from launch on 1 December 2026. No auto-renewal.'),
('puntr-roadmap-and-launch-1-december',
 'Our roadmap, and launch on 1 December 2026',
 'Puntr launches on Tuesday 1 December 2026 with football. More sports follow in the weeks after launch.',
 E'Puntr officially launches on Tuesday 1 December 2026. At launch we are football only: the Betway Premiership (PSL), the English Premier League, the UEFA Champions League and more leagues as we add them.\n\nAfter launch we plan to add sports in stages, counting weeks from launch week as week 1: basketball and rugby in week 2, horse racing in week 4, combat sports (boxing and MMA) in weeks 6 to 8, cricket in week 10 and tennis in week 12.\n\nThese are target windows, not promises. A sport goes live only when its data and grading work properly, and you can follow progress on the roadmap page at puntr.co.za/roadmap.\n\nBetween now and launch, Founding Members are shaping what we build first. Join free at puntr.co.za/founding.\n\nPuntr is for people aged 18 and over. T&Cs apply. National Responsible Gambling Programme: 0800 006 008.',
 'https://puntr.co.za/newsroom/roadmap-and-launch.png','https://puntr.co.za/newsroom/roadmap-and-launch.png',
 'company','SCHEDULED','2026-11-06T09:10:00Z',
 'Puntr roadmap and launch on 1 December 2026',
 'Puntr launches 1 December 2026 with football. See the planned order for basketball, rugby, racing, combat sports, cricket and tennis.')
on conflict (slug) do nothing;
