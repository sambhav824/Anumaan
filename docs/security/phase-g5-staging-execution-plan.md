# Anumaan (अनुमान) — Phase G.5: Staging RLS Verification Execution Plan
## Migration `00007_fix_organization_members_owner_escalation.sql` Pre-Execution Specification

**Document Version:** 1.0.0  
**Audit Baseline:** Phase G.4 Local Quality & Safety Audit (`docs/security/phase-g4-rls-test-audit.md`)  
**Target Migration:** `supabase/migrations/00007_fix_organization_members_owner_escalation.sql`  
**Target Test Suite:** `services/api/tests/test_sec_rls_001_remediation.py`  
**Execution Status:** **PREPARATION ONLY — ZERO REMOTE OPERATIONS EXECUTED**  

---

## 1. Safety Mandate & Boundaries Declaration

This document defines the safe, evidence-based staging verification plan for closing vulnerability **`SEC-RLS-001`** (Privilege Escalation in `public.organization_members` INSERT RLS policy).

### Strict Safety Boundaries Maintained:
- **Zero remote connections:** No connection was opened to Supabase staging or production.
- **Zero remote migrations applied:** Migration `00007` has **NOT** been applied to any live database.
- **Zero secret exposure:** No tokens, API keys, service-role keys, passwords, or connection strings are logged, printed, or persisted in version control.
- **No environment changes:** No `.env` files were modified.
- **No deployments or git commits:** Working tree changes remain untouched.
- **No claim of staging completion:** Staging verification has **NOT** passed; this document specifies the verification plan only.

---

## 2. Mandatory Configuration & Fail-Closed Guardrails

### 2.1 Mandatory Approved Project Reference Allowlist (`STAGING_APPROVED_PROJECT_REFS`)
To guarantee that tests cannot be pointed at an arbitrary or unauthorized project:
1. `STAGING_APPROVED_PROJECT_REFS` is **mandatory** for live test execution.
2. If `STAGING_APPROVED_PROJECT_REFS` is missing, empty, or does not contain the exact target project reference, the test runner immediately raises:
   `RuntimeError: CRITICAL CONFIG ERROR: STAGING_APPROVED_PROJECT_REFS is mandatory for staging execution.`
3. The check executes before initializing any HTTP client or sending any network request.

### 2.2 Hostname & Production Reference Verification
The test harness in `services/api/tests/test_sec_rls_001_remediation.py` enforces:
1. **Production Project Reference Reject List:**
   `PRODUCTION_PROJECT_REF = "knwinlllqjmgzqcjrrio"`
   If `project_ref == "knwinlllqjmgzqcjrrio"` or `"knwinlllqjmgzqcjrrio"` appears anywhere in `STAGING_SUPABASE_URL`, execution aborts immediately with `RuntimeError: CRITICAL SAFETY VIOLATION`.
2. **Exact Hostname Parsing:**
   `STAGING_SUPABASE_URL` is parsed with `urllib.parse.urlparse`:
   - Must use scheme `https`.
   - Hostname must match `{STAGING_SUPABASE_PROJECT_REF}.supabase.co` exactly.
   - Any port, IP address, or mismatched subdomain raises `RuntimeError: CRITICAL CONFIG MISMATCH`.

### 2.3 Distinction: Local Unverified Claim Decoding vs. Gateway Signature Verification
The verification architecture strictly distinguishes local syntactic preflight from cryptographic gateway verification:

| Verification Layer | Execution Mechanism | Purpose & Guarantees | Secret Exposure Risk |
| :--- | :--- | :--- | :--- |
| **Local Harness Preflight** | `jwt.decode(token, options={"verify_signature": False})` | **Local syntactic claim inspection only.** Inspects `sub` claim to guarantee that `creator_uid`, `attacker_uid`, and `colleague_uid` are paired with their corresponding tokens before test execution. Does **not** verify signature. | **Zero:** Token strings are decoded in-memory and never logged or included in exception messages. |
| **Gateway Enforcement** | Supabase GoTrue / PostgREST Gateway (`Authorization: Bearer <token>`) | **Cryptographic signature verification.** Verifies asymmetric ES256 / HMAC HS256 signature, expiration (`exp`), audience (`aud = 'authenticated'`), and sets `auth.uid()` in transaction context. | **Zero:** Handled via TLS transport headers; tokens are never printed. |

### 2.4 Service-Role Cleanup Credential Validation
Because `public.organizations` lacks a `DELETE` RLS policy in baseline migration `00001_initial_schema.sql`, teardown of synthetic test organizations requires service-role elevation.
Before using `STAGING_SUPABASE_SERVICE_ROLE_KEY`:
1. Harness decodes the service-role JWT payload.
2. Verifies that `claims.get("role") == "service_role"`.
3. Verifies that `claims.get("ref")` (if present) does **not** match `knwinlllqjmgzqcjrrio` (Production).
4. Verifies that `claims.get("ref")` matches `STAGING_SUPABASE_PROJECT_REF`.
5. Verifies that `claims.get("iss")` does not contain `knwinlllqjmgzqcjrrio`.
6. If any check fails, execution aborts before any write. The key is never printed or displayed.

---

## 3. Specification of the Five Live RLS Integration Tests

All five tests reside in `TestPostgresRLSIntegrationLive` in `services/api/tests/test_sec_rls_001_remediation.py`:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL RLS Integration Test Matrix                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Test 1: Attacker Direct Owner Insert   │ POST /rest/v1/organization_members (role=owner)│
│         Outcome: REJECTED (400/403)     │ SQLSTATE 42501; Attacker NOT in members list  │
├─────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Test 2: Attacker Member Insert         │ POST /rest/v1/organization_members (role=mbr)  │
│         Outcome: REJECTED (400/403)     │ SQLSTATE 42501; Attacker NOT in members list  │
├─────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Test 3: Creator Initial Onboarding      │ POST /rest/v1/organizations + members (owner) │
│         Outcome: ALLOWED (201 Created)  │ Persisted row confirmed via follow-up GET     │
├─────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Test 4: Owner Member Invitation         │ POST /rest/v1/organization_members (colleague)│
│         Outcome: ALLOWED (201 Created)  │ Persisted member confirmed via follow-up GET  │
├─────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Test 5: Member Role Self-Promotion     │ PATCH /rest/v1/organization_members (to owner)│
│         Outcome: REJECTED (403 or [])   │ Persisted role confirmed unchanged ('member') │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Test 1: `test_postgres_rls_attacker_direct_postgrest_insert_rejected`
- **Scenario:** SEC-RLS-001 Exploit Reproduction Attempt.
- **Actor:** Attacker (`authenticated` role, `STAGING_ATTACKER_JWT`).
- **Target:** Victim Organization created by Creator (`created_by = creator_uid`).
- **Request:** `POST /rest/v1/organization_members` with payload:
  `{"organization_id": victim_org_id, "user_id": attacker_uid, "role": "owner"}`
- **Assertions:**
  1. Status code must be `400` or `403`. HTTP 401 and 404 are **strictly rejected as test failures**.
  2. Response payload must contain SQLSTATE `42501` or string `"row-level security"`.
  3. Creator issues `GET /rest/v1/organization_members?organization_id=eq.{victim_org_id}&select=user_id`.
  4. Assert `attacker_uid not in member_uids`.

### Test 2: `test_postgres_rls_attacker_insert_member_rejected`
- **Scenario:** Unauthorized Member Injection Attempt.
- **Actor:** Attacker (`authenticated` role, `STAGING_ATTACKER_JWT`).
- **Target:** Victim Organization created by Creator.
- **Request:** `POST /rest/v1/organization_members` with payload:
  `{"organization_id": victim_org_id, "user_id": attacker_uid, "role": "member"}`
- **Assertions:**
  1. Setup calls (org creation and owner assignment) assert HTTP 201.
  2. Attack response asserts status in `(400, 403)`. Status 401/404 fails the test.
  3. Response payload confirms SQLSTATE `42501` or `"row-level security"`.
  4. Creator queries member list; confirms `attacker_uid` is **not persisted**.

### Test 3: `test_postgres_rls_creator_onboarding_insert_succeeds`
- **Scenario:** Legitimate Organization Creation & Initial Owner Enrollment.
- **Actor:** Creator (`authenticated` role, `STAGING_CREATOR_JWT`).
- **Mechanism:** `public.is_org_creator` helper (`SECURITY DEFINER`) safely checks `organizations.created_by = auth.uid()` without being blocked by `organizations` SELECT RLS.
- **Request 1:** `POST /rest/v1/organizations` with `{"id": new_org_id, "name": test_name, "created_by": creator_uid}` -> Asserts 201.
- **Request 2:** `POST /rest/v1/organization_members` with `{"organization_id": new_org_id, "user_id": creator_uid, "role": "owner"}` -> Asserts 201.
- **Persistence Verification:**
  - Creator queries `GET /rest/v1/organization_members?organization_id=eq.{new_org_id}&user_id=eq.{creator_uid}&select=role,user_id`.
  - Asserts HTTP 200, length == 1, `role == "owner"`, and `user_id == creator_uid`.

### Test 4: `test_postgres_rls_admin_invite_member_succeeds`
- **Scenario:** Authorized Admin Invites Team Member.
- **Actor:** Creator / Owner (`authenticated` role, `STAGING_CREATOR_JWT`).
- **Mechanism:** Satisfies `public.is_org_admin(organization_id)`.
- **Request:** `POST /rest/v1/organization_members` with `{"organization_id": org_id, "user_id": colleague_uid, "role": "member"}` -> Asserts 201.
- **Persistence Verification:**
  - Creator queries `GET /rest/v1/organization_members?organization_id=eq.{org_id}&user_id=eq.{colleague_uid}&select=role,user_id`.
  - Asserts HTTP 200, length == 1, `role == "member"`, and `user_id == colleague_uid`.

### Test 5: `test_postgres_rls_member_cannot_update_role_to_owner`
- **Scenario:** Ordinary Member Attempts Privilege Escalation via UPDATE.
- **Actor:** Colleague Member (`authenticated` role, `STAGING_MEMBER_JWT`).
- **Mechanism:** Tested against `organization_members` UPDATE policy (`"Admins and owners can update member roles"`).
- **Request:** `PATCH /rest/v1/organization_members?organization_id=eq.{org_id}&user_id=eq.{colleague_uid}` with `{"role": "owner"}`.
- **Assertions:**
  1. Response status must be `403` OR `200` with body `[]` (PostgREST returns 200 `[]` when 0 rows match UPDATE policy).
  2. Creator queries member record via GET.
  3. Asserts length == 1 and `role == "member"` (role is unchanged).

---

## 4. Scoped Cleanup Architecture & Service-Role Isolation

### 4.1 Exact-UUID Registration & Metadata Verification
`SafeTestTracker` guarantees no data corruption or broad deletions:
1. **Explicit In-Memory Registration:** Only UUIDs generated by `uuid.uuid4()` within that specific test run are registered in `self.created_org_ids`.
2. **Metadata Cross-Verification:** Before issuing any DELETE, `cleanup_org`:
   - Issues `GET /rest/v1/organizations?id=eq.{org_id}&select=id,name`.
   - Confirms that `name` starts with `ANUMAAN_STAGING_TEST_`.
   - If metadata does not match, the deletion is skipped.
3. **Cascade Deletion Order:** Deletes child rows in `organization_members` first, then deletes the parent `organizations` row.
4. **Zero Wildcard Deletions:** No queries of the form `DELETE FROM organizations WHERE name LIKE '%Test%'` are executed.

### 4.2 Handling Baseline Schema Limitation
In `00001_initial_schema.sql`, `public.organizations` lacks a `DELETE` RLS policy. Authenticated users cannot delete organizations via PostgREST.
- When `STAGING_SUPABASE_SERVICE_ROLE_KEY` is provided, cleanup uses service-role credentials to remove the synthetic organization.
- If `service_role_key` is not provided, cleanup uses creator headers (deleting members, but leaving the empty test org), records a warning in `tracker.cleanup_warnings`, and reports the orphaned test ID for manual removal.

---

## 5. End-to-End Staging Runbook (Step-by-Step)

> [!CAUTION]
> **DO NOT EXECUTE THESE COMMANDS UNTIL EXPLICIT USER APPROVAL IS GIVEN.**  
> The following steps are the verified procedure for Phase G.5 staging verification.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              Phase G.5 Staging Sequence                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Preflight Backup & Schema Check   ──► Verify staging snapshot & applied migrations │
│ 2. Apply Migration 00007             ──► Execute DDL in Staging SQL Editor            │
│ 3. Database Catalog DDL Audit        ──► Confirm owner=postgres, SECURITY DEFINER     │
│ 4. Run Pytest Live RLS Test Suite    ──► Execute the 5 real PostgREST integration tests│
│ 5. Application Smoke Tests           ──► Test login, estimates, BOQ, PDF export       │
│ 6. Staging Cleanup Audit             ──► Verify count of test records is exactly 0    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Step 1: Pre-Migration Backup & Usability Verification
Run in local terminal pointing to Staging:
```bash
# Export staging database snapshot via Supabase CLI
supabase db dump --project-ref "<staging-project-ref>" -f "backup_staging_pre_00007.sql"
```
**Verification of Backup Usability:**
1. Check file size is non-zero (`dir backup_staging_pre_00007.sql`).
2. Inspect header: verify `PostgreSQL database dump` banner.
3. Confirm core tables exist in dump: search for `CREATE TABLE public.organizations` and `CREATE TABLE public.organization_members`.

### Step 2: Preflight Migration Review in Staging SQL Editor
Execute in Supabase Staging SQL Editor:
```sql
-- Confirm connected environment is NOT production
SELECT current_database(), current_user;

-- Confirm applied migrations: must show 00001 through 00006
SELECT version, applied_at 
FROM public.schema_migrations 
ORDER BY version ASC;

-- Confirm existing INSERT policy on organization_members
SELECT policyname, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'organization_members' AND cmd = 'INSERT';
```

### Step 3: Apply Migration 00007 in Staging SQL Editor
Apply the full DDL from [`supabase/migrations/00007_fix_organization_members_owner_escalation.sql`](file:///c:/Users/ARPIT/Downloads/Anumaan/supabase/migrations/00007_fix_organization_members_owner_escalation.sql):
```sql
-- 1. Helper function
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

-- 2. Drop the vulnerable INSERT policy using exact existing name
DROP POLICY IF EXISTS "Admins and owners can invite / add members" ON public.organization_members;

-- 3. Recreate policy with strict creator validation
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

-- Record in migration tracking table
INSERT INTO public.schema_migrations (version, applied_at)
VALUES ('00007_fix_organization_members_owner_escalation.sql', now())
ON CONFLICT (version) DO NOTHING;
```

### Step 4: Catalog DDL Verification Queries
Execute in Staging SQL Editor to confirm catalog state:
```sql
-- 4.1 Verify function ownership, SECURITY DEFINER, and search_path
SELECT 
    p.proname,
    r.rolname AS function_owner,
    p.prosecdef AS is_security_definer,
    p.proconfig AS configuration
FROM pg_proc p
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.proname = 'is_org_creator';
-- EXPECTED: function_owner = 'postgres', is_security_definer = true, configuration = '{search_path=public}'

-- 4.2 Verify permissions: PUBLIC must have 0 rows, only authenticated & service_role
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = 'is_org_creator';
-- EXPECTED: grantee IN ('authenticated', 'service_role'), NO 'PUBLIC'

-- 4.3 Verify replacement policy on organization_members
SELECT policyname, permissive, roles, cmd, with_check
FROM pg_policies
WHERE tablename = 'organization_members' AND policyname = 'Admins and owners can invite / add members';
-- EXPECTED: with_check contains 'is_org_creator(organization_id)'
```

### Step 5: Execute Live Integration Tests
Execute in terminal with staging credentials exported:
```powershell
$env:STAGING_SUPABASE_URL = "https://<staging-project-ref>.supabase.co"
$env:STAGING_SUPABASE_ANON_KEY = "<staging-anon-key>"
$env:STAGING_SUPABASE_PROJECT_REF = "<staging-project-ref>"
$env:STAGING_APPROVED_PROJECT_REFS = "<staging-project-ref>"
$env:STAGING_SUPABASE_SERVICE_ROLE_KEY = "<staging-service-role-key>"
$env:STAGING_CREATOR_UID = "<creator-uuid>"
$env:STAGING_CREATOR_JWT = "<creator-jwt>"
$env:STAGING_ATTACKER_UID = "<attacker-uuid>"
$env:STAGING_ATTACKER_JWT = "<attacker-jwt>"
$env:STAGING_MEMBER_UID = "<colleague-uuid>"
$env:STAGING_MEMBER_JWT = "<colleague-jwt>"
$env:STAGING_RUN_LIVE_TESTS = "1"

# Run the 5 live RLS tests
& "C:\Users\ARPIT\Documents\antigravity\Anumaan\services\api\.venv\Scripts\python.exe" -m pytest -v `
    services/api/tests/test_sec_rls_001_remediation.py -k "TestPostgresRLSIntegrationLive"
```
**Expected Outcome:** 5 passed, 0 failed, 0 skipped.

### Step 6: Post-Migration Application Smoke Checks
Verify core application features in staging frontend:
1. User login (Marathi / Hindi / English).
2. Create new organization: verify creator is assigned `owner` role.
3. Create estimate: verify BOQ line items calculate totals and GST (default 0%).
4. Generate and export PDF quotation: confirm clean formatting and watermarks.
5. Generate and export Excel quotation.

### Step 7: Cleanup Verification Query
Execute in Staging SQL Editor:
```sql
-- Confirm zero test organizations remain in staging database
SELECT count(*) AS orphaned_test_orgs
FROM public.organizations
WHERE name LIKE 'ANUMAAN_STAGING_TEST_%';
-- EXPECTED: count = 0
```

### Step 8: Safe Emergency Rollback Procedure (Fail-Closed Quarantine)
> [!CRITICAL]
> **SAFETY INVARIANT:** Rollback must NEVER reintroduce the vulnerable predicate `(user_id = auth.uid() AND role = 'owner')`. Restoring the 00001 policy would reopen critical vulnerability `SEC-RLS-001`.
> If migration 00007 must be rolled back, execute the fail-closed quarantine policy below. This preserves existing team member management by admins while strictly blocking self-enrollment takeover attacks.

If migration 00007 experiences an unresolvable error in staging, execute in Staging SQL Editor:
```sql
-- 1. Drop the failing policy
DROP POLICY IF EXISTS "Admins and owners can invite / add members" ON public.organization_members;

-- 2. SAFE ROLLBACK: Install fail-closed admin-only policy.
-- NEVER restore '(user_id = auth.uid() AND role = ''owner'')' without creator validation!
CREATE POLICY "Admins and owners can invite / add members"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        public.is_org_admin(organization_id)
    );

COMMENT ON POLICY "Admins and owners can invite / add members" ON public.organization_members IS
    'SAFE FAIL-CLOSED ROLLBACK: Permits existing admins/owners to add members. Direct PostgREST self-enrollment is disabled.';

-- 3. Drop helper function if defective
DROP FUNCTION IF EXISTS public.is_org_creator(UUID);

-- 4. Remove migration tracking record
DELETE FROM public.schema_migrations 
WHERE version = '00007_fix_organization_members_owner_escalation.sql';
```

---

## 6. Remaining Blockers & Preconditions for Staging Execution

| Blocker / Requirement | Status | Resolution Requirement |
| :--- | :--- | :--- |
| **Approved Staging Project Reference** | **PENDING USER INPUT** | User must provide the exact staging project reference (e.g., `anumaan-staging`). Must be different from production `knwinlllqjmgzqcjrrio`. |
| **Staging Test Identities (3 Accounts)** | **PENDING STAGING SETUP** | Three authenticated test accounts must exist in Supabase Staging Auth: (1) Creator, (2) Attacker, (3) Colleague Member. |
| **Service-Role Teardown Key** | **RECOMMENDED** | `STAGING_SUPABASE_SERVICE_ROLE_KEY` should be exported to allow automated teardown of test organizations created during testing. |
| **Function Owner Verification** | **PRECONDITION** | Applying SQL in Supabase Dashboard SQL Editor automatically sets `proowner = postgres`. Catalog query 4.1 must confirm this before tests run. |

---

## 7. Verified Facts vs. Assumptions

| Item / Claim | Classification | Evidence / Basis |
| :--- | :--- | :--- |
| `STAGING_APPROVED_PROJECT_REFS` is mandatory and fails closed | **Verified Fact** | Tested in local Python invariant suite: missing or mismatched allowlist immediately raises `RuntimeError`. |
| Production project reference `knwinlllqjmgzqcjrrio` is blocked | **Verified Fact** | Unit invariant test confirmed runtime exception if `knwinlllqjmgzqcjrrio` is in URL, project ref, or service-role key. |
| URL hostname must match `{project_ref}.supabase.co` | **Verified Fact** | Unit invariant test confirmed hostname mismatch is blocked. |
| JWT subject check validates identity pairing locally | **Verified Fact** | Unit invariant test confirmed mismatch between token `sub` and configured UID raises `ValueError`. |
| Local tests pass (74 backend, 47 frontend, 0 TypeScript errors) | **Verified Fact** | Full local test suites executed with 100% pass rate. |
| Staging PostgREST will return SQLSTATE 42501 on RLS rejection | **Assumption** | Based on PostgREST standard behavior. Will be proven during Phase G.5 staging run. |
| Staging backup can be restored cleanly | **Assumption** | Pre-migration backup step 1 must be confirmed by checking dump size and headers prior to migration. |

---

*Phase G.5 staging execution plan complete. No remote commands or database changes have been performed. Awaiting explicit user approval and staging credentials.*
