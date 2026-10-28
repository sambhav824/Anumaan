-- ==============================================================================
-- Migration: 00008_rate_library_and_actual_costs.sql
-- Product: अनुमान (Anumaan) — Multilingual Construction Estimation SaaS
-- Description: Creates reusable rate library (material/labour rates) and actual
--              expense tracking tables with strict multi-tenant Row Level Security.
-- Note: Do NOT apply directly to production without safe staging validation.
-- ==============================================================================

-- 1. CONTRACTOR RATE LIBRARY TABLE
CREATE TABLE IF NOT EXISTS public.rate_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'material' CHECK (category IN ('material', 'labour', 'equipment', 'composite', 'subcontract')),
    unit TEXT NOT NULL DEFAULT 'nos',
    material_rate NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (material_rate >= 0),
    labour_rate NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (labour_rate >= 0),
    combined_rate NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (combined_rate >= 0),
    supplier_or_location TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_items_org ON public.rate_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_rate_items_category ON public.rate_items(organization_id, category);

-- 2. ACTUAL EXPENSES & COST TRACKING TABLE
CREATE TABLE IF NOT EXISTS public.actual_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'material' CHECK (category IN ('material', 'labour', 'equipment', 'transport', 'subcontract', 'other')),
    description TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor_or_payee TEXT,
    invoice_or_voucher_ref TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actual_expenses_org ON public.actual_expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_actual_expenses_estimate ON public.actual_expenses(estimate_id);
CREATE INDEX IF NOT EXISTS idx_actual_expenses_date ON public.actual_expenses(organization_id, expense_date);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES FOR RATE ITEMS
ALTER TABLE public.rate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organization rate items"
    ON public.rate_items FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Members can insert organization rate items"
    ON public.rate_items FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Members can update organization rate items"
    ON public.rate_items FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins and owners can delete organization rate items"
    ON public.rate_items FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- 4. ROW LEVEL SECURITY (RLS) POLICIES FOR ACTUAL EXPENSES
ALTER TABLE public.actual_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organization actual expenses"
    ON public.actual_expenses FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Members can record actual expenses"
    ON public.actual_expenses FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Members can update actual expenses"
    ON public.actual_expenses FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins and owners can delete actual expenses"
    ON public.actual_expenses FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );
