CREATE TABLE IF NOT EXISTS public.early_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  referral_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT early_access_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_early_access_created_at ON public.early_access (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_early_access_plan ON public.early_access (plan);

GRANT INSERT ON public.early_access TO anon;
GRANT INSERT, SELECT ON public.early_access TO authenticated;
GRANT ALL ON public.early_access TO service_role;

ALTER TABLE public.early_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can request early access" ON public.early_access;
CREATE POLICY "Anyone can request early access"
  ON public.early_access FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);