-- Harden Supabase security without changing the public RPC contract.
-- Public SECURITY DEFINER RPCs are moved into a non-exposed schema and replaced
-- with SECURITY INVOKER shims that preserve their signatures and role grants.
-- Internal implementations retain their original owners, bodies and ACL intent.

CREATE SCHEMA IF NOT EXISTS private AUTHORIZATION postgres;
COMMENT ON SCHEMA private IS 'Internal, non-PostgREST implementation helpers. Do not expose this schema through the Supabase API.';
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- Convert public SECURITY DEFINER RPCs into invoker shims. This keeps the
-- existing RPC names, argument defaults, return types and role access intact,
-- while removing privileged implementations from the exposed public schema.
DO $security_definer_rpc_hardening$
DECLARE
  r record;
  v_call_args text;
  v_select_sql text;
  v_volatility text;
  v_create_sql text;
BEGIN
  FOR r IN
    SELECT
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS identity_args,
      pg_get_function_arguments(p.oid) AS argument_declarations,
      pg_get_function_result(p.oid) AS result_declaration,
      p.pronargs,
      p.provolatile,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_exec,
      has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_exec
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype <> 'trigger'::regtype
      AND (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        WHERE t.tgfoid = p.oid AND NOT t.tgisinternal
      )
    ORDER BY p.proname, p.oid
  LOOP
    SELECT string_agg('$' || g.i::text, ', ' ORDER BY g.i)
      INTO v_call_args
    FROM generate_series(1, r.pronargs) AS g(i);
    v_call_args := coalesce(v_call_args, '');

    v_volatility := CASE r.provolatile
      WHEN 'i' THEN 'IMMUTABLE'
      WHEN 's' THEN 'STABLE'
      ELSE 'VOLATILE'
    END;

    IF r.result_declaration LIKE 'TABLE(%'
       OR r.result_declaration LIKE 'SETOF %'
       OR r.result_declaration = 'record' THEN
      v_select_sql := format(
        'SELECT * FROM private.%I(%s)',
        r.proname,
        v_call_args
      );
    ELSE
      v_select_sql := format(
        'SELECT private.%I(%s)',
        r.proname,
        v_call_args
      );
    END IF;

    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET SCHEMA private',
      r.proname,
      r.identity_args
    );

    EXECUTE format(
      'REVOKE ALL ON FUNCTION private.%I(%s) FROM PUBLIC, anon, authenticated, service_role',
      r.proname,
      r.identity_args
    );
    IF r.anon_exec THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION private.%I(%s) TO anon', r.proname, r.identity_args);
    END IF;
    IF r.authenticated_exec THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION private.%I(%s) TO authenticated', r.proname, r.identity_args);
    END IF;
    IF r.service_exec THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION private.%I(%s) TO service_role', r.proname, r.identity_args);
    END IF;

    v_create_sql := format(
      'CREATE FUNCTION public.%I(%s) RETURNS %s LANGUAGE sql %s SECURITY INVOKER SET search_path TO public, private, pg_temp AS %L',
      r.proname,
      r.argument_declarations,
      r.result_declaration,
      v_volatility,
      v_select_sql
    );
    EXECUTE v_create_sql;

    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated, service_role',
      r.proname,
      r.identity_args
    );
    IF r.anon_exec THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon', r.proname, r.identity_args);
    END IF;
    IF r.authenticated_exec THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.identity_args);
    END IF;
    IF r.service_exec THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', r.proname, r.identity_args);
    END IF;
  END LOOP;
END
$security_definer_rpc_hardening$;

-- Trigger functions are invoked by their owning triggers, not by API clients.
-- Remove direct RPC execution grants while preserving the trigger bindings.
DO $trigger_function_privileges$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype = 'trigger'::regtype
      AND (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated, service_role',
      r.proname,
      r.identity_args
    );
  END LOOP;
END
$trigger_function_privileges$;

-- Pin the three functions identified by the mutable-search-path lint.
ALTER FUNCTION public.member_details_before_write() SET search_path TO public, pg_temp;
ALTER FUNCTION public.tipster_plan_interval(text) SET search_path TO public, pg_temp;
ALTER FUNCTION public.platform_tasks_touch_updated_at() SET search_path TO public, pg_temp;

-- The following tables intentionally have no client-facing RLS policies.
-- Revoke direct API table privileges as an additional fail-closed safeguard;
-- service_role and SECURITY DEFINER implementations retain their capabilities.
DO $deny_client_access_to_policyless_tables$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND NOT EXISTS (
        SELECT 1
        FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename = c.relname
      )
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', r.relname);
  END LOOP;
END
$deny_client_access_to_policyless_tables$;

-- Replace SECURITY DEFINER views with SECURITY INVOKER views backed by
-- narrowly-scoped helpers in the non-exposed private schema. This preserves
-- the existing safe projections while avoiding broad base-table grants.

CREATE OR REPLACE FUNCTION private.visible_predictions_rows()
RETURNS SETOF public.visible_predictions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
  SELECT p.id, p.seq, p.user_id, p.fixture_id, p.market, p.selection, p.line,
         p.odds, p.confidence, p.reasoning, p.created_at, p.prev_hash, p.hash,
         p.reference_odds, st.odds_unverified
  FROM public.predictions p
  JOIN public.prediction_odds_state st ON st.prediction_id = p.id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.hidden_predictions h WHERE h.prediction_id = p.id
  );
$function$;

CREATE OR REPLACE FUNCTION private.public_profiles_rows()
RETURNS SETOF public.public_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
  SELECT id, username::text, display_name, founding_number, created_at,
         avatar_url, is_ai_participant
  FROM public.profiles
  WHERE NOT is_banned;
$function$;

CREATE OR REPLACE FUNCTION private.prediction_odds_state_rows()
RETURNS SETOF public.prediction_odds_state
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
  SELECT p.id AS prediction_id,
         p.odds,
         p.reference_odds,
         COALESCE(o.odds_unverified, p.odds_unverified) AS odds_unverified,
         CASE
           WHEN COALESCE(o.odds_unverified, p.odds_unverified)
                AND p.reference_odds IS NOT NULL
             THEN LEAST(p.odds, p.reference_odds)
           ELSE p.odds
         END AS settle_odds
  FROM public.predictions p
  LEFT JOIN public.prediction_odds_overrides o ON o.prediction_id = p.id;
$function$;

CREATE OR REPLACE FUNCTION private.public_affiliate_partners_rows()
RETURNS SETOF public.public_affiliate_partners
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
  SELECT id, name, tracking_link, website_url, slug
  FROM public.affiliate_partners
  WHERE category = 'bookmaker'
    AND status = 'live'
    AND tracking_link IS NOT NULL
    AND licence_checked_at IS NOT NULL
    AND terms_accepted_at IS NOT NULL;
$function$;

CREATE OR REPLACE FUNCTION private.public_affiliate_creatives_rows()
RETURNS SETOF public.public_affiliate_creatives
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
  SELECT c.id, c.partner_id, p.name AS partner_name, p.slug AS partner_slug,
         c.format, c.headline, c.body, c.cta_label, c.image_url,
         COALESCE(c.tracking_link, p.tracking_link) AS tracking_link,
         c.terms_line, c.placements, c.weight
  FROM public.affiliate_creatives c
  JOIN public.affiliate_partners p ON p.id = c.partner_id
  WHERE c.active
    AND c.approved_at IS NOT NULL
    AND (c.starts_at IS NULL OR c.starts_at <= now())
    AND (c.ends_at IS NULL OR c.ends_at > now())
    AND p.category = 'bookmaker'
    AND p.status = 'live'
    AND p.tracking_link IS NOT NULL
    AND p.licence_checked_at IS NOT NULL
    AND p.terms_accepted_at IS NOT NULL;
$function$;

CREATE OR REPLACE FUNCTION private.public_bookmaker_reviews_rows()
RETURNS SETOF public.public_bookmaker_reviews
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
  SELECT r.id, r.bookmaker_slug, r.overall, r.ease_of_use, r.payouts, r.support,
         r.body, r.created_at, r.updated_at, p.username, p.display_name, p.avatar_url
  FROM public.bookmaker_reviews r
  JOIN public.public_profiles p ON p.id = r.user_id
  WHERE r.status = 'published';
$function$;

CREATE OR REPLACE FUNCTION private.bookmaker_review_stats_rows()
RETURNS SETOF public.bookmaker_review_stats
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $function$
  SELECT r.bookmaker_slug,
         count(*)::integer AS review_count,
         round(avg(r.overall), 1) AS avg_overall,
         round(avg(r.ease_of_use), 1) AS avg_ease_of_use,
         round(avg(r.payouts), 1) AS avg_payouts,
         round(avg(r.support), 1) AS avg_support
  FROM public.bookmaker_reviews r
  JOIN public.public_profiles p ON p.id = r.user_id
  WHERE r.status = 'published'
  GROUP BY r.bookmaker_slug;
$function$;

REVOKE ALL ON FUNCTION private.visible_predictions_rows() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.public_profiles_rows() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.prediction_odds_state_rows() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.public_affiliate_partners_rows() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.public_affiliate_creatives_rows() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.public_bookmaker_reviews_rows() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.bookmaker_review_stats_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.visible_predictions_rows() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.public_profiles_rows() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.prediction_odds_state_rows() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.public_affiliate_partners_rows() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.public_affiliate_creatives_rows() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.public_bookmaker_reviews_rows() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.bookmaker_review_stats_rows() TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.visible_predictions WITH (security_invoker = true)
AS SELECT * FROM private.visible_predictions_rows();
CREATE OR REPLACE VIEW public.public_profiles WITH (security_invoker = true)
AS SELECT * FROM private.public_profiles_rows();
CREATE OR REPLACE VIEW public.prediction_odds_state WITH (security_invoker = true)
AS SELECT * FROM private.prediction_odds_state_rows();
CREATE OR REPLACE VIEW public.public_affiliate_partners WITH (security_invoker = true)
AS SELECT * FROM private.public_affiliate_partners_rows();
CREATE OR REPLACE VIEW public.public_affiliate_creatives WITH (security_invoker = true)
AS SELECT * FROM private.public_affiliate_creatives_rows();
CREATE OR REPLACE VIEW public.public_bookmaker_reviews WITH (security_invoker = true)
AS SELECT * FROM private.public_bookmaker_reviews_rows();
CREATE OR REPLACE VIEW public.bookmaker_review_stats WITH (security_invoker = true)
AS SELECT * FROM private.bookmaker_review_stats_rows();

-- Trigger execution remains intact; the trigger functions are not exposed as RPCs.
