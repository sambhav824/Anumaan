-- ==============================================================================
-- Migration: 00009_rate_library_enhancements.sql
-- Product: अनुमान (Anumaan) — Multilingual Construction Estimation SaaS
-- Description: Enhances Rate Library with optional description, equipment rate,
--              rate source (Manual, Supplier Quote, Schedule of Rates), source name,
--              location, and links BOQ items with rate_item_id for rate refresh.
-- Note: Do NOT apply directly to production without safe staging validation.
-- ==============================================================================

-- 1. ADD NEW COLUMNS TO RATE_ITEMS
ALTER TABLE public.rate_items
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS equipment_rate NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (equipment_rate >= 0),
    ADD COLUMN IF NOT EXISTS rate_source TEXT NOT NULL DEFAULT 'Manual' CHECK (rate_source IN ('Manual', 'Supplier Quote', 'Schedule of Rates')),
    ADD COLUMN IF NOT EXISTS supplier_or_source_name TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT;

-- Update category check constraint on rate_items to include 'other'
ALTER TABLE public.rate_items
    DROP CONSTRAINT IF EXISTS rate_items_category_check;

ALTER TABLE public.rate_items
    ADD CONSTRAINT rate_items_category_check
    CHECK (category IN ('material', 'labour', 'equipment', 'other', 'composite', 'subcontract'));

-- 2. ADD RATE_ITEM_ID TO BOQ_ITEMS FOR RATE SNAPSHOT PRESERVATION & REFRESH
ALTER TABLE public.boq_items
    ADD COLUMN IF NOT EXISTS rate_item_id UUID REFERENCES public.rate_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_boq_items_rate_item ON public.boq_items(rate_item_id);
