-- ==============================================================================
-- Migration: 00004_estimates_and_boq.sql
-- Product: अनुमान (Anumaan) — Multilingual Construction Estimation SaaS
-- Description: Estimates and BOQ items tables with strict multi-tenant RLS.
-- ==============================================================================

-- 1. ESTIMATES TABLE
CREATE TABLE IF NOT EXISTS public.estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    estimate_number TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('building', 'road')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'archived')),
    overhead_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    contingency_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    gst_pct NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    snapshot JSONB,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_estimates_org_number UNIQUE (organization_id, estimate_number)
);

CREATE INDEX IF NOT EXISTS idx_estimates_org ON public.estimates(organization_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project ON public.estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON public.estimates(status);

-- 2. BOQ ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.boq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
    item_number TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    unit TEXT NOT NULL DEFAULT 'nos',
    unit_rate NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    is_manual BOOLEAN NOT NULL DEFAULT false,
    calculation_type TEXT,
    calculation_details JSONB,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boq_items_estimate ON public.boq_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_org ON public.boq_items(organization_id);

-- 3. RLS POLICIES FOR ESTIMATES
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view estimates of their organizations"
    ON public.estimates FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can insert estimates for their organizations"
    ON public.estimates FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Members can update estimates in their organizations"
    ON public.estimates FOR UPDATE
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Admins and owners can delete estimates in their organizations"
    ON public.estimates FOR DELETE
    USING (public.is_org_admin(organization_id));

-- 4. RLS POLICIES FOR BOQ ITEMS
ALTER TABLE public.boq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view BOQ items of their organizations"
    ON public.boq_items FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can insert BOQ items for their organizations"
    ON public.boq_items FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Members can update BOQ items in their organizations"
    ON public.boq_items FOR UPDATE
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Members can delete BOQ items in their organizations"
    ON public.boq_items FOR DELETE
    USING (public.is_org_member(organization_id));
