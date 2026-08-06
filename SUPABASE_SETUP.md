# Supabase Early Access Integration Setup Guide

This guide explains how to set up and configure the Supabase backend for the Puntr Early Access forms.

## Overview

The Early Access integration connects the existing frontend forms to Supabase for storing beta signups. All UI/UX remains unchanged - only the backend submission logic has been updated.

## Prerequisites

- Supabase project created at: https://dskyyujqajlgtooywgpf.supabase.co
- Node.js/Bun installed
- Access to Supabase project settings

## Setup Steps

### 1. Install Dependencies

```bash
bun install
```

This will install `@supabase/supabase-js` which was added to package.json.

### 2. Configure Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://dskyyujqajlgtooywgpf.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

**To get your credentials:**
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "Project URL" (should be https://dskyyujqajlgtooywgpf.supabase.co)
4. Copy the "anon public" key (this is safe to use on the frontend)

**Security Note:** Never use the service_role key on the frontend - only use the anon/public key.

### 3. Run Database Migration

The SQL migration file is located at `supabase/migrations/001_create_early_access.sql`.

**Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref dskyyujqajlgtooywgpf

# Run migration
supabase db push
```

**Option B: Using Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Open `supabase/migrations/001_create_early_access.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click "Run" to execute the migration

### 4. Verify Database Setup

After running the migration, verify the table was created:

1. Go to Table Editor in Supabase dashboard
2. You should see a new table called `early_access`
3. Check that it has these columns:
   - `id` (uuid, primary key)
   - `email` (text, unique)
   - `name` (text)
   - `plan` (text)
   - `created_at` (timestamptz)
   - `status` (text, default: 'pending')
   - `referral_code` (text, nullable)

### 5. Verify RLS Policies

Check that Row Level Security is properly configured:

1. Go to Authentication > Policies in Supabase dashboard
2. Select the `early_access` table
3. You should see these policies:
   - **Allow public insert for early access** - Allows anonymous inserts
   - **Prevent public read access** - Blocks anonymous reads
   - **Prevent public update access** - Blocks anonymous updates
   - **Prevent public delete access** - Blocks anonymous deletes

### 6. Start Development Server

```bash
bun run dev
```

## Testing the Integration

1. Navigate to the pricing page: http://localhost:3000/pricing
2. Click any "Get started", "Go Premium", or "Go Puntr AI" button
3. Fill in the early access form with:
   - Full name
   - Email address
4. Click "Request early access"
5. You should see a success message: "Welcome to the beta list!"
6. Check the Supabase Table Editor to confirm the record was inserted

### Testing Duplicate Email Protection

1. Try submitting the same email again
2. You should see an error: "Already registered"
3. This confirms duplicate email prevention is working

## Architecture

- **Frontend Form**: `src/components/early-access-modal.tsx` - Unchanged UI, updated submission logic
- **Supabase Client**: `src/lib/supabase.ts` - Configured typed client
- **Helper Functions**: `src/lib/early-access.ts` - Reusable submission and validation logic
- **Database Types**: `src/types/database.types.ts` - TypeScript types for type safety
- **Migration**: `supabase/migrations/001_create_early_access.sql` - Database schema and policies

## Security Features

✅ Row Level Security (RLS) enabled
✅ Public can only INSERT (submit forms)
✅ Public cannot READ, UPDATE, or DELETE
✅ Email uniqueness constraint prevents duplicates
✅ Input sanitization and validation
✅ Only anonymous key exposed to frontend
✅ Proper error handling for all edge cases

## Troubleshooting

**Error: "Missing VITE_SUPABASE_URL environment variable"**
- Ensure `.env` file exists in project root
- Check that the variable is spelled correctly
- Restart the dev server after adding environment variables

**Error: "relation 'early_access' does not exist"**
- Run the database migration (Step 3)
- Verify in Supabase Table Editor that the table exists

**Form submits but no data appears**
- Check RLS policies are correctly configured
- Verify you're using the correct anon key (not service_role key)
- Check browser console for any error messages

**Duplicate email not being caught**
- Ensure the migration created the unique constraint
- Check that emails are being lowercased (handled in code)

## What Changed

**Files Modified:**
1. `package.json` - Added @supabase/supabase-js dependency
2. `src/components/early-access-modal.tsx` - Replaced Formspree with Supabase

**Files Created:**
1. `src/lib/supabase.ts` - Supabase client configuration
2. `src/lib/early-access.ts` - Helper functions for submissions
3. `src/types/database.types.ts` - TypeScript database types
4. `supabase/migrations/001_create_early_access.sql` - Database migration
5. `.env.example` - Environment variables template
6. `SUPABASE_SETUP.md` - This setup guide

## Support

If you encounter any issues during setup, check:
1. Supabase project is active and accessible
2. Environment variables are correctly set
3. Migration has been run successfully
4. RLS policies are properly configured

