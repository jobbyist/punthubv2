-- Keep PFIE's Parallel Responses low-effort lane from contending with PUNT AI.
-- The family-level monthly USD budget remains the hard financial control.
update public.api_quota_limits
set daily_cap = 250,
    monthly_cap = 5000,
    note = 'Parallel Responses low: PFIE structured observations plus PUNT AI live-web; monthly spend remains constrained by core ($50 PFIE) and auxiliary ($35 PUNT AI) budgets.',
    updated_at = now()
where provider = 'parallel-chat:low';

-- Register the local, already-uploaded 1xBet mark in Admin > Logos/Branding.
insert into public.brand_logos (code, name, kind, placements, image_url, link_url, active, sort_order)
values ('1xbet', '1xBet', 'partner', array['bookmakers', 'homepage']::text[], '/logos/1xbet.png', 'https://1xbet.com', true, 50)
on conflict (code) do update
set name = excluded.name,
    kind = excluded.kind,
    placements = array['bookmakers', 'homepage']::text[],
    image_url = excluded.image_url,
    link_url = excluded.link_url,
    active = true,
    sort_order = excluded.sort_order,
    updated_at = now();
