-- 28 Nov 2026 (owner request): the Puntr cap and T-shirt become the "Good Sport" cap and T-shirt, the mug is
-- rebranded and "Good Sport" socks are added. Product photos live in /public/rewards/merch and are matched to
-- the reward code in src/lib/reward-images.ts, so no schema change is needed. Idempotent: safe to run twice.
-- Points costs keep the 22 Nov repricing; socks are proposed at 8,000 PuntPoints (owner edits in Admin > Rewards).

update public.rewards
set title = 'Good Sport cap',
    description = 'Black six-panel cap with the green Good Sport wordmark embroidered on the front.',
    terms = 'South African addresses only. One size, adjustable strap. Delivery in about 10 working days. While stocks last.'
where code = 'merch-cap';

update public.rewards
set title = 'Good Sport T-shirt',
    description = 'Black heavyweight cotton T-shirt with the Good Sport wordmark printed on the chest. Sizes S to XXL.',
    terms = 'South African addresses only. We confirm your size by email. Delivery in about 10 working days. While stocks last.'
where code = 'merch-tee';

update public.rewards
set title = 'Good Sport mug',
    description = 'White ceramic 330 ml mug with a black handle and the Good Sport wordmark on both sides.',
    terms = 'South African addresses only. Delivery in about 10 working days. While stocks last.'
where code = 'merch-mug';

insert into public.rewards
  (code, title, description, kind, category, points_cost, face_value_cents, stock, sponsor, requires_approval, active,
   fulfilment, sort, terms)
values
  ('merch-socks', 'Good Sport socks', 'White crew sports socks with a black cuff, green stripes and the Good Sport wordmark. One pair, sizes 6 to 11.',
   'perk', 'puntr_merch', 8000, null, 25, null, true, true, 'shipping', 43,
   'South African addresses only. We confirm your size by email. Delivery in about 10 working days. While stocks last.')
on conflict (code) do update
set title = excluded.title, description = excluded.description, category = excluded.category, terms = excluded.terms;
