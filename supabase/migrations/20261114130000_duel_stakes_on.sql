-- Owner decision (14 Nov 2026, 15:00 SAST): counsel has approved PuntPoints stakes on Community Duels.
-- Applied to production on 14 Nov 2026 via Admin settings; recorded here so a fresh database matches.
update public.app_settings set value = 'true' where key = 'duels_stakes_enabled';
