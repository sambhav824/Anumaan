-- ==============================================================================
-- Migration: 00001_initial_schema.sql
-- Product: अनुमान (Anumaan) — Multilingual Construction Estimation SaaS
-- Description: Core schema for profiles, organizations, memberships, clients,
--              projects, with Row Level Security (RLS) and integrity constraints.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES TABLE
-- Extends auth.users with app-specific profile info and language preference.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    language_preference TEXT NOT NULL DEFAULT 'en' CHECK (language_preference IN ('en', 'mr', 'hi')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_lang ON public.profiles(language_preference);

-- ==============================================================================
-- 2. ORGANIZATIONS TABLE
-- Multi-tenant companies using the SaaS independently.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_person TEXT,
    email TEXT,
    phone TEXT,
    business_address TEXT,
    city TEXT,
    state TEXT,
    pin_code TEXT,
    gstin TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations(name);

-- ==============================================================================
-- 3. ORGANIZATION MEMBERS TABLE
-- RBAC membership linking users to organizations.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_org_member UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

-- ==============================================================================
-- 4. CLIENTS TABLE
-- Clients / developers / government departments associated with an organization.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    billing_address TEXT,
    gstin TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Needed for composite foreign key constraint from projects
    CONSTRAINT uq_client_org_id UNIQUE (organization_id, id)
);

CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(organization_id, name);

-- ==============================================================================
-- 5. PROJECTS TABLE
-- Construction projects (building and road) managed by an organization.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID,
    name TEXT NOT NULL,
    project_type TEXT NOT NULL CHECK (project_type IN ('building', 'road')),
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'archived')),
    site_location TEXT,
    city TEXT,
    state TEXT,
    description TEXT,
    start_date DATE,
    quotation_language TEXT NOT NULL DEFAULT 'en' CHECK (quotation_language IN ('en', 'mr', 'hi')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Enforce that client belongs to the exact same organization
    CONSTRAINT fk_project_client_org FOREIGN KEY (organization_id, client_id)
        REFERENCES public.clients(organization_id, id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON public.projects(organization_id, project_type);
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client_id);

-- ==============================================================================
-- 6. AUTOMATIC UPDATED_AT TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_org_members_updated_at ON public.organization_members;
CREATE TRIGGER trg_org_members_updated_at BEFORE UPDATE ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 7. NEW USER PROFILE SYNC TRIGGER
-- Automatically creates a profile record when a new user signs up in auth.users
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, language_preference)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'language_preference', 'en')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 8. HELPER SECURITY FUNCTIONS FOR RLS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = target_org_id
          AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = target_org_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- Users can only view and update their own profile.
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------------------------
-- ORGANIZATIONS POLICIES
-- Users can only access organizations where they hold active membership.
-- ------------------------------------------------------------------------------
CREATE POLICY "Members can view their organizations"
    ON public.organizations FOR SELECT
    USING (public.is_org_member(id));

CREATE POLICY "Authenticated users can create organizations"
    ON public.organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and owners can update their organization"
    ON public.organizations FOR UPDATE
    USING (public.is_org_admin(id))
    WITH CHECK (public.is_org_admin(id));

-- ------------------------------------------------------------------------------
-- ORGANIZATION MEMBERS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Members can view membership list for their organizations"
    ON public.organization_members FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Admins and owners can invite / add members"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        public.is_org_admin(organization_id)
        OR
        -- Allow creator to add themselves as owner on organization creation
        (user_id = auth.uid() AND role = 'owner')
    );

CREATE POLICY "Admins and owners can update member roles"
    ON public.organization_members FOR UPDATE
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Admins and owners can remove members"
    ON public.organization_members FOR DELETE
    USING (public.is_org_admin(organization_id) OR user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- CLIENTS POLICIES
-- Organization members can access clients belonging to their organization.
-- ------------------------------------------------------------------------------
CREATE POLICY "Members can view clients in their organization"
    ON public.clients FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can create clients in their organization"
    ON public.clients FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Members can update clients in their organization"
    ON public.clients FOR UPDATE
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Admins can delete clients in their organization"
    ON public.clients FOR DELETE
    USING (public.is_org_admin(organization_id));

-- ------------------------------------------------------------------------------
-- PROJECTS POLICIES
-- Organization members can access projects belonging to their organization.
-- ------------------------------------------------------------------------------
CREATE POLICY "Members can view projects in their organization"
    ON public.projects FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Members can create projects in their organization"
    ON public.projects FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Members can update projects in their organization"
    ON public.projects FOR UPDATE
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Admins can archive / delete projects in their organization"
    ON public.projects FOR DELETE
    USING (public.is_org_admin(organization_id));
