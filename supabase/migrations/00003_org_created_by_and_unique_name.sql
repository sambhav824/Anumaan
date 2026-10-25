-- ==============================================================================
-- Migration: 00003_org_created_by_and_unique_name.sql
-- Product: अनुमान (Anumaan) — Multilingual Construction Estimation SaaS
-- Description: Add created_by column to organizations referencing profiles,
--              backfill from owner role in organization_members,
--              and enforce case-insensitive unique organization names per creator.
-- ==============================================================================

-- 1. Add created_by column referencing profiles
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Backfill created_by from organization_members with role = 'owner'
UPDATE public.organizations o
SET created_by = m.user_id
FROM public.organization_members m
WHERE o.id = m.organization_id
  AND m.role = 'owner'
  AND o.created_by IS NULL;

-- 3. Case-insensitive unique index per creator
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_created_by_lower_name
ON public.organizations (created_by, lower(name));
