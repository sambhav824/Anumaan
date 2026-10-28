-- ==============================================================================
-- Migration: 00010_prefilled_default_rate_library.sql
-- Product: अनुमान (Anumaan) — Multilingual Construction Estimation SaaS
-- Description: Pre-filled Default Rate Library support with regional benchmarking,
--              trustworthy source recording, item code identifiers, rate types
--              (raw material, labour, equipment, completed work/composite), and
--              custom vs default tracking for instant, accurate estimation.
-- Note: Do NOT apply directly to production without safe staging validation.
-- ==============================================================================

-- 1. ADD NEW ENHANCEMENT COLUMNS TO RATE_ITEMS
ALTER TABLE public.rate_items
    ADD COLUMN IF NOT EXISTS code TEXT,
    ADD COLUMN IF NOT EXISTS rate_type TEXT NOT NULL DEFAULT 'raw_material' CHECK (rate_type IN ('raw_material', 'labour_only', 'equipment_only', 'completed_work', 'composite', 'subcontract')),
    ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'national_cpwd',
    ADD COLUMN IF NOT EXISTS source_date TEXT,
    ADD COLUMN IF NOT EXISTS rate_status TEXT NOT NULL DEFAULT 'verified_source' CHECK (rate_status IN ('verified_source', 'illustrative_needs_verification')),
    ADD COLUMN IF NOT EXISTS specification TEXT,
    ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS default_item_id TEXT;

-- 2. CREATE INDEXES FOR FAST REGIONAL LOOKUPS AND FILTERING
CREATE INDEX IF NOT EXISTS idx_rate_items_org_region ON public.rate_items(organization_id, region);
CREATE INDEX IF NOT EXISTS idx_rate_items_org_custom ON public.rate_items(organization_id, is_custom);
CREATE INDEX IF NOT EXISTS idx_rate_items_code ON public.rate_items(organization_id, code);

-- 3. COMMENTS EXPLAINING RATE FIELDS FOR AUDITABILITY
COMMENT ON COLUMN public.rate_items.code IS 'Standard item identifier / DSR code (e.g. CEM-OPC-53, ROA-WMM-BASE)';
COMMENT ON COLUMN public.rate_items.rate_type IS 'Distinguishes raw material, labour, equipment from completed-work / composite rates to avoid double counting';
COMMENT ON COLUMN public.rate_items.rate_status IS 'Flag indicating whether the rate has an official verifiable source or is an illustrative starter rate';
COMMENT ON COLUMN public.rate_items.is_custom IS 'True if the organization customized the default rate; enables 1-click Reset to Default';
