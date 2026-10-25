-- ==============================================================================
-- Migration: 00005_quotations.sql
-- Product: अनुमान (Anumaan) — Multilingual Construction Estimation SaaS
-- Description: Quotations table with immutable snapshots and strict multi-tenant RLS.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    quotation_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'accepted', 'rejected', 'expired')),
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'mr', 'hi')),
    issue_date DATE,
    valid_until_date DATE,
    payment_terms TEXT,
    exclusions TEXT,
    notes TEXT,
    client_instructions TEXT,
    authorized_signatory_name TEXT,
    authorized_signatory_designation TEXT,
    tax_configured BOOLEAN NOT NULL DEFAULT false,
    tax_name TEXT NOT NULL DEFAULT 'GST',
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    overhead_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    overhead_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    contingency_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    contingency_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    snapshot JSONB,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_quotations_org_number UNIQUE (organization_id, quotation_number)
);

CREATE INDEX IF NOT EXISTS idx_quotations_org ON public.quotations(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotations_estimate ON public.quotations(estimate_id);
CREATE INDEX IF NOT EXISTS idx_quotations_project ON public.quotations(project_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client ON public.quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);

-- RLS POLICIES FOR QUOTATIONS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view quotations of their organizations"
    ON public.quotations FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can insert quotations for their organizations"
    ON public.quotations FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Members can update quotations in their organizations"
    ON public.quotations FOR UPDATE
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Admins and owners can delete quotations in their organizations"
    ON public.quotations FOR DELETE
    USING (public.is_org_admin(organization_id));
