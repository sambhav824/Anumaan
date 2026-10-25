-- ==============================================================================
-- Migration: 00006_align_gst_default.sql
-- Product: अनुमान (Anumaan) — Multilingual Construction Estimation SaaS
-- Description: Align estimates.gst_pct DDL default to 0.00 (Tax unconfigured).
-- Note: Modifies column default for future inserts; does not alter existing records.
-- ==============================================================================

ALTER TABLE public.estimates
    ALTER COLUMN gst_pct SET DEFAULT 0.00;

COMMENT ON COLUMN public.estimates.gst_pct IS
    'Configurable GST percentage. Defaults to 0.00 (unconfigured). Explicit contractor confirmation required before issuing tax-inclusive quotations.';
