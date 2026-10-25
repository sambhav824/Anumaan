# Anumaan (अनुमान) — Phase G: Supabase RLS Migration Runbook
## Critical Security Remediation: Finding `SEC-RLS-001`

**Document Version:** 1.0.0  
**Target Vulnerability:** `SEC-RLS-001` (P0 - Critical) — Organization Owner Privilege Escalation  
**Related Hardening:** `SEC-AUTH-001` (P1 - High) — Mock Authentication Production Guards  
**Target Migration:** `supabase/migrations/00007_fix_organization_members_owner_escalation.sql`  
**Target Environment:** Staging First (Strict Approval Required Before Production)  

---

## 1. Executive Summary & Risk Context

### 1.1 The Vulnerability (`SEC-RLS-001`)
In `supabase/migrations/00001_initial_schema.sql` (lines 247–255), the INSERT Row-Level Security policy for `public.organization_members` was defined as:

```sql
CREATE POLICY "Admins and owners can invite / add members"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        public.is_org_admin(organization_id)
        OR
        (user_id = auth.uid() AND role = 'owner')
    );
```

Because `(user_id = auth.uid() AND role = 'owner')` did not verify whether the authenticated user (`auth.uid()`) actually created the organization, any user with a valid Supabase JWT could issue a direct PostgREST API call:

```http
POST /rest/v1/organization_members
Host: <supabase-project>.supabase.co
Authorization: Bearer <attacker_token>
apikey: <anon_key>
Content-Type: application/json

{
  "organization_id": "<victim_org_uuid>",
  "user_id": "<attacker_uuid>",
  "role": "owner"
}
```

The database evaluated `user_id = auth.uid()` as `true` and `role = 'owner'` as `true`, granting the attacker full owner permissions over any organization whose UUID was known or discovered.

### 1.2 Remediation Scope
Migration `00007_fix_organization_members_owner_escalation.sql` replaces the vulnerable policy with:
```sql
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
```
Where `public.is_org_creator(target_org_id UUID)` is a `SECURITY DEFINER STABLE SET search_path = public` helper function verifying that `public.organizations.created_by = auth.uid()`.

---

## 2. Repository Artifacts & Reviewed Files

| File | Type | Audit Verdict |
| :--- | :--- | :--- |
| `supabase/migrations/00001_initial_schema.sql` | Migration Baseline | Root cause identified: policy lacked `created_by` check. |
| `supabase/migrations/00003_org_created_by_and_unique_name.sql` | Migration Baseline | Added `created_by UUID` and backfilled owners, but did not update RLS. |
| `supabase/migrations/00007_fix_organization_members_owner_escalation.sql` | Forward-Only Fix | Drafted locally; fully verified via static AST and logic models. |
| `services/api/app/routers/auth.py` | Backend Router | Hardened with production 404 guards (`SEC-AUTH-001`). |
| `services/api/tests/test_sec_rls_001_remediation.py` | Regression Tests | 9 tests passed, 5 live PostgreSQL integration tests drafted & skipped pending staging. |

---

## 3. Dedicated Staging Supabase Preconditions

Before applying migration `00007` to Staging:
1. **Isolated Project:** The staging database must be a completely separate Supabase project (e.g. `anumaan-staging`), never the production project (`knwinlllqjmgzqcjrrio`).
2. **Schema Baseline:** Migrations `00001` through `00006` must be applied and confirmed in `public.schema_migrations`.
3. **Synthetic Test Accounts:** Configure at least three synthetic user accounts in Staging Supabase Auth:
   - `creator@anumaan-test.in` (Legitimate Creator)
   - `colleague@anumaan-test.in` (Invited Team Member)
   - `attacker@anumaan-test.in` (Adversary / External User)
4. **Clean Git Working Tree:** Ensure all local changes are reviewed and no unverified modifications exist.

---

## 4. Backup & Rollback / Recovery Plan

### 4.1 Pre-Migration Backup Procedure
Before applying migration `00007`, export a full schema and data snapshot from the target database:

```bash
# Using Supabase CLI (Targeting Staging):
supabase db dump --project-ref <staging-project-ref> -f "backup_pre_migration_00007_staging.sql"

# OR using standard PostgreSQL pg_dump:
pg_dump -h <staging-pooler-host> -p 5432 -U <staging-db-user> -d postgres -F p -b -v -f "backup_pre_migration_00007_staging.sql"
```

### 4.2 Emergency Rollback SQL Script
If legitimate creator onboarding fails or unexpected regression occurs during staging testing, execute this rollback script to restore the `00001` policy state:

```sql
-- ==============================================================================
-- EMERGENCY ROLLBACK SCRIPT (STAGING ONLY)
-- Restores migration 00001 policy on organization_members
-- ==============================================================================

BEGIN;

DROP POLICY IF EXISTS "Admins and owners can invite / add members" ON public.organization_members;

CREATE POLICY "Admins and owners can invite / add members"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        public.is_org_admin(organization_id)
        OR
        (user_id = auth.uid() AND role = 'owner')
    );

DROP FUNCTION IF EXISTS public.is_org_creator(UUID);

DELETE FROM public.schema_migrations WHERE version = '00007_fix_organization_members_owner_escalation.sql';

COMMIT;
```

### 4.3 CRITICAL SECURITY WARNING ON ROLLBACK LIMITATIONS
> [!WARNING]
> **SQL rollback restores policy definition, but DOES NOT reverse unauthorized data access or data modifications.**  
> If an attacker exploited `SEC-RLS-001` prior to migration `00007` being applied:
> 1. Any rows read, copied, or exported by the unauthorized owner cannot be recalled via database rollback.
> 2. Any records deleted or modified by an illegitimate owner require data restoration from point-in-time recovery (PITR) or table backups.
> 3. Always inspect `public.organization_members` for anomalous memberships (see Audit Queries in Section 7).

---

## 5. Safe Target Project Verification (Zero Secret Exposure)

To ensure DDL commands are never accidentally executed against Production:

```sql
-- Run this in SQL Editor before any migration statement:
SELECT 
    current_database() AS db_name,
    current_user AS db_user,
    inet_server_addr() AS server_ip,
    version() AS pg_version;

-- Confirm existing applied migrations:
SELECT version, applied_at 
FROM public.schema_migrations 
ORDER BY version ASC;
```

**Verification Rule:** Confirm the database hostname and project reference match the designated Staging environment before proceeding.

---

## 6. Pre-Application Checklist

- [ ] Target project confirmed as **STAGING** (not production).
- [ ] Database backup completed and verified non-empty.
- [ ] `00001` through `00006` verified present in `public.schema_migrations`.
- [ ] No active estimators or pilot users on the staging instance.
- [ ] Local backend test suite passes completely (74 passed, 5 skipped).
- [ ] Local frontend test suite passes completely (47 passed).

---

## 7. Staging Migration Execution Instructions

### Step 1: Execute Migration DDL
Execute the following statements in the Staging Supabase SQL Editor:

```sql
-- ==============================================================================
-- Migration: 00007_fix_organization_members_owner_escalation.sql
-- ==============================================================================

BEGIN;

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

-- 4. Record migration
INSERT INTO public.schema_migrations (version) 
VALUES ('00007_fix_organization_members_owner_escalation.sql');

COMMIT;
```

---

## 8. Post-Migration SQL Verification Queries

Run these queries to verify the migration state in PostgreSQL:

### 8.1 Verify Active Policy on `organization_members`
```sql
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    with_check
FROM pg_policies
WHERE tablename = 'organization_members'
ORDER BY cmd, policyname;
```
**Expected Result:** Exactly one INSERT policy named `"Admins and owners can invite / add members"`. The `with_check` clause must include `public.is_org_creator(organization_id)`.

### 8.2 Verify `is_org_creator` Function Security Invariants
```sql
SELECT 
    proname, 
    prosecdef, -- Must be TRUE (SECURITY DEFINER)
    proconfig   -- Must contain 'search_path=public'
FROM pg_proc 
WHERE proname = 'is_org_creator';
```
**Expected Result:** `prosecdef = true`, `proconfig = {search_path=public}`.

### 8.3 Verify Function Permissions
```sql
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'is_org_creator';
```
**Expected Result:** Privileges granted ONLY to `authenticated` and `service_role`. `PUBLIC` must NOT appear.

### 8.4 Audit Existing Memberships for Unlinked Owners
```sql
-- Verifies that every existing owner matches the organization's created_by
SELECT 
    o.id AS org_id, 
    o.name AS org_name, 
    o.created_by, 
    m.user_id AS owner_user_id, 
    m.role
FROM public.organizations o
JOIN public.organization_members m ON o.id = m.organization_id
WHERE m.role = 'owner' AND (o.created_by IS NULL OR o.created_by != m.user_id);
```
**Expected Result:** 0 rows. (Any returned row represents an unlinked owner that requires investigation).

---

## 9. Live Staging Authorization Verification Tests

Execute these tests in Staging using synthetic test tokens:

### Test 1: Exploit Attempt (Attacker Direct PostgREST Insert) — NEGATIVE
- **Action:** Authenticated as `attacker@anumaan-test.in`, send POST to `/rest/v1/organization_members` with `{"organization_id": "<victim_org_id>", "user_id": "<attacker_id>", "role": "owner"}`.
- **Expected Outcome:** `HTTP 403 Forbidden` / `42501 new row violates row-level security policy for table "organization_members"`.

### Test 2: Exploit Attempt (Attacker Self-Insert as Member) — NEGATIVE
- **Action:** Authenticated as `attacker@anumaan-test.in`, send POST to `/rest/v1/organization_members` with `{"organization_id": "<victim_org_id>", "user_id": "<attacker_id>", "role": "member"}`.
- **Expected Outcome:** `HTTP 403 Forbidden` / `42501 new row violates row-level security policy`.

### Test 3: Legitimate Creator Onboarding — POSITIVE
- **Action:** Authenticated as `creator@anumaan-test.in`, create an organization in `/api/organizations`.
- **Expected Outcome:** `HTTP 201 Created`. Organization created with `created_by = creator_id`, and initial owner membership inserted successfully.

### Test 4: Legitimate Admin Member Invitation — POSITIVE
- **Action:** Authenticated as `creator@anumaan-test.in` (Owner), invite `colleague@anumaan-test.in` as role `'member'`.
- **Expected Outcome:** Row inserted successfully.

### Test 5: Member Self-Promotion Attempt — NEGATIVE
- **Action:** Authenticated as `colleague@anumaan-test.in` (Member), send PATCH/UPDATE to `/rest/v1/organization_members` setting `role = 'owner'`.
- **Expected Outcome:** `HTTP 403 Forbidden` / 0 rows updated under UPDATE RLS policy.

---

## 10. Criteria for Deciding Production Readiness

Production application is authorized ONLY when ALL of the following criteria are met:
1. **Staging Tests 1–5 Pass 100%:** Exploit attempts are blocked; legitimate onboarding and member management succeed without error.
2. **Web Frontend Verification:** An estimator can log in via Supabase Auth, create a company profile, and navigate to Estimates and Quotations without RLS errors.
3. **Audit Query Clean:** Query in Section 8.4 returns 0 anomalous records on production.
4. **Recent Production Backup Confirmed:** Fresh production database backup verified within 1 hour prior to execution.
5. **Signed Approval:** Explicit written approval from repository owner.

---

*Runbook prepared and validated offline. Zero remote database mutations performed during Phase G.*
