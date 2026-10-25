-- ==============================================================================
-- Migration: 00007_fix_organization_members_owner_escalation.sql
-- Product: अनुमान (Anumaan) — Multilingual Construction Estimation SaaS
-- Security Audit Finding: SEC-RLS-001 (P0 - Critical)
-- Description: Closes the direct PostgREST privilege escalation vulnerability
--              in the public.organization_members INSERT RLS policy.
--
-- Vulnerability Background:
--   The initial policy "Admins and owners can invite / add members" permitted:
--     WITH CHECK (public.is_org_admin(organization_id) OR (user_id = auth.uid() AND role = 'owner'))
--   Because (user_id = auth.uid() AND role = 'owner') lacked a check verifying
--   that auth.uid() actually created the target organization, an authenticated user
--   could send a direct PostgREST insert request specifying any existing organization's
--   UUID and grant themselves the 'owner' role, taking over the organization.
--
-- Secure Remediation:
--   1. Creates public.is_org_creator(target_org_id UUID) helper function
--      (SECURITY DEFINER STABLE SET search_path = public) that checks whether
--      public.organizations.created_by = auth.uid().
--      Using SECURITY DEFINER is required here to safely inspect organizations.created_by
--      without being blocked by the organizations table's SELECT policy
--      (which requires existing membership via is_org_member, which does not yet
--      exist during initial creator onboarding).
--   2. Replaces the vulnerable policy "Admins and owners can invite / add members"
--      on public.organization_members for INSERT with a tightened WITH CHECK clause:
--        - Allows existing admins/owners (is_org_admin) to invite/add members.
--        - Allows initial organization creator to add themselves as 'owner' IF AND ONLY IF
--          user_id = auth.uid() AND role = 'owner' AND public.is_org_creator(organization_id).
-- ==============================================================================

-- 1. Helper function to verify organization creator
CREATE OR REPLACE FUNCTION public.is_org_creator(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = target_org_id
          AND created_by = auth.uid()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Restrict function execution permissions
REVOKE ALL ON FUNCTION public.is_org_creator(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_creator(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.is_org_creator(UUID) IS
    'Checks if the authenticated user (auth.uid()) is the recorded creator (created_by) of the target organization.';

-- 2. Drop the vulnerable INSERT policy using its exact existing name
DROP POLICY IF EXISTS "Admins and owners can invite / add members" ON public.organization_members;

-- 3. Recreate the policy with strict creator validation
CREATE POLICY "Admins and owners can invite / add members"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        public.is_org_admin(organization_id)
        OR
        (
            user_id = auth.uid()
            AND role = 'owner'
            AND public.is_org_creator(organization_id)
        )
    );

COMMENT ON POLICY "Admins and owners can invite / add members" ON public.organization_members IS
    'Remediates SEC-RLS-001: Permits existing admins to add members, or verified organization creators to self-enroll as initial owner.';
