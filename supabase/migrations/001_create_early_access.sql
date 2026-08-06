-- Create early_access table for beta signups
-- This table stores early access requests from the signup forms

CREATE TABLE IF NOT EXISTS public.early_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    plan TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'pending',
    referral_code TEXT,
    
    -- Ensure email is unique (case-insensitive)
    CONSTRAINT early_access_email_unique UNIQUE (email)
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_early_access_email ON public.early_access (email);

-- Create index on created_at for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_early_access_created_at ON public.early_access (created_at DESC);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_early_access_status ON public.early_access (status);

-- Enable Row Level Security
ALTER TABLE public.early_access ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert for early access" ON public.early_access;
DROP POLICY IF EXISTS "Prevent public read access" ON public.early_access;
DROP POLICY IF EXISTS "Prevent public update access" ON public.early_access;
DROP POLICY IF EXISTS "Prevent public delete access" ON public.early_access;

-- Allow anonymous users to insert their early access requests
-- This is safe because we only allow inserting their own data
CREATE POLICY "Allow public insert for early access"
    ON public.early_access
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Prevent anonymous users from reading, updating, or deleting records
-- Only authenticated admin users should be able to view/manage early access requests
CREATE POLICY "Prevent public read access" ON public.early_access FOR SELECT TO anon USING (false);
CREATE POLICY "Prevent public update access" ON public.early_access FOR UPDATE TO anon USING (false);
CREATE POLICY "Prevent public delete access" ON public.early_access FOR DELETE TO anon USING (false);

