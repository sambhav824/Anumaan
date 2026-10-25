# Anumaan (अनुमान) — Phase G.6: Final Staging Runbook Safety Review
## Pre-Staging Verification Audit: Rollback Hardening & Invariant Assurance

**Document Version:** 1.0.0  
**Audit Baseline:** Phase G.5 Staging Execution Plan (`docs/security/phase-g5-staging-execution-plan.md`)  
**Target Migration:** `supabase/migrations/00007_fix_organization_members_owner_escalation.sql`  
**Target Test Suite:** `services/api/tests/test_sec_rls_001_remediation.py`  
**Execution Status:** **LOCAL REVIEW ONLY — ZERO REMOTE OPERATIONS EXECUTED**  

---

## 1. Executive Summary & Review Scope

This Phase G.6 review performs a critical safety and security audit of the staging execution runbook for closing vulnerability **`SEC-RLS-001`** (Privilege Escalation in `public.organization_members` INSERT RLS policy).

### Primary Safety Overhaul in Phase G.6:
- **Remediated Rollback Vulnerability Hazard:** Identified and eliminated a critical vulnerability in prior rollback instructions. Reverting to migration `00001` reintroduced the vulnerable `(user_id = auth.uid() AND role = 'owner')` predicate. Replaced with a safe, fail-closed quarantine policy.
- **Mandatory Allowlisting:** Enforced mandatory `STAGING_APPROVED_PROJECT_REFS`. Missing, empty, or unapproved project references fail closed before any HTTP request or database write.
- **Local Claim Inspection vs. Gateway Verification:** Clearly distinguished preflight unverified JWT claim extraction from PostgREST gateway cryptographic signature verification.
- **Complete Test & Cleanup Scrutiny:** Verified all five live tests enforce exact authorization outcomes, confirm database persistence, handle partial setup failures, and restrict cleanup to explicitly registered synthetic UUIDs.

---

## 2. Action 1: Rollback Policy Safety Overhaul

### 2.1 The Vulnerability Reintroduction Hazard (Defect Identified)
In earlier runbook drafts (including Phase G.5 Step 8), the emergency rollback procedure specified:
```sql
-- DANGEROUS ROLLBACK PREVIOUSLY PROPOSED:
DROP POLICY IF EXISTS "Admins and owners can invite / add members" ON public.organization_members;
CREATE POLICY "Admins and owners can invite / add members"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        public.is_org_admin(organization_id)
        OR
        (user_id = auth.uid() AND role = 'owner') -- VULNERABILITY REINTRODUCED!
    );
```
**Security Impact:**  
If migration `00007` were rolled back due to an operational issue, restoring this predicate would **immediately reopen `SEC-RLS-001`**, allowing any authenticated user to send a direct PostgREST insert and hijack ownership of any organization in the database.

### 2.2 Remediated Safe Rollback Procedure (Fail-Closed Quarantine)
The rollback procedure in `docs/security/phase-g5-staging-execution-plan.md` has been replaced with a **fail-closed admin-only quarantine policy**:

```sql
-- ==============================================================================
-- SAFE FAIL-CLOSED ROLLBACK (Step 8 Remediation)
-- ==============================================================================
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

**Security Guarantees of Safe Rollback:**
1. **Zero Exploit Window:** An attacker cannot insert themselves as `owner` into any organization.
2. **Operational Continuity:** Existing admins and owners can still invite team members (`is_org_admin` evaluates to `True`).
3. **Onboarding Isolation:** New organization creation through direct PostgREST is suspended until the fix is corrected, forcing onboarding through backend service-role API endpoints or manual admin provisioning.

---

## 3. Action 2: Staging Project Allowlisting & Cryptographic Guardrails

### 3.1 Mandatory Staging Allowlist (`STAGING_APPROVED_PROJECT_REFS`)
The configuration loader `StagingEnvironmentConfig.get_config()` in `services/api/tests/test_sec_rls_001_remediation.py` enforces:
1. `STAGING_APPROVED_PROJECT_REFS` is **mandatory** for live test execution.
2. If `STAGING_APPROVED_PROJECT_REFS` is not set or is empty, the harness raises:
   `RuntimeError: CRITICAL CONFIG ERROR: STAGING_APPROVED_PROJECT_REFS is mandatory for staging execution.`
3. If `STAGING_SUPABASE_PROJECT_REF` is not in the parsed allowlist, execution aborts immediately before any HTTP client initialization.

### 3.2 Exact Hostname & Production Ref Rejection
1. **Production Blocklist:**
   `PRODUCTION_PROJECT_REF = "knwinlllqjmgzqcjrrio"`
   If `project_ref == "knwinlllqjmgzqcjrrio"` or `"knwinlllqjmgzqcjrrio"` is detected in `STAGING_SUPABASE_URL` or `service_role_key`, execution aborts with `RuntimeError: CRITICAL SAFETY VIOLATION`.
2. **URL Hostname Parsing:**
   `urllib.parse.urlparse(clean_url)` verifies:
   - Scheme is strictly `https`.
   - Hostname matches `{STAGING_SUPABASE_PROJECT_REF}.supabase.co` exactly.

### 3.3 JWT Verification Architecture (Local Decoding vs. Gateway Signature)
The runbook strictly distinguishes the two verification domains:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          Two-Tier JWT Verification Model                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Local Preflight (Offline / Client Side):                                            │
│    jwt.decode(token, options={"verify_signature": False})                              │
│    - Decodes unverified payload claims: 'sub', 'role', 'ref'                           │
│    - Asserts claims['sub'] == configured UID (prevents credential misconfiguration)    │
│    - Asserts service_role key has role == 'service_role' and ref == staging_ref        │
│    - Zero secret exposure: tokens/keys are NEVER logged or printed                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. Cryptographic Gateway Verification (Remote / PostgREST & GoTrue Boundary):         │
│    Authorization: Bearer <token> over TLS                                              │
│    - Cryptographic signature verified against project JWKS / JWT Secret (ES256/HS256) │
│    - Validates expiration (exp), audience (aud == 'authenticated')                     │
│    - Injects verified claims into PostgreSQL session: auth.uid(), auth.role()          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Action 3: Review of the Five Live RLS Integration Tests

We inspected the test bodies in `services/api/tests/test_sec_rls_001_remediation.py`:

| Test Identifier | Tested Actor | Action & Endpoint | Expected HTTP Status & Error Code | Persisted State Check |
| :--- | :--- | :--- | :--- | :--- |
| **Test 1: Attacker Owner Takeover** | Attacker (`authenticated`) | `POST /rest/v1/organization_members`<br>`{"org_id": victim, "user_id": attacker, "role": "owner"}` | **400 or 403**<br>Rejects 401/404. Asserts SQLSTATE `42501` or `"row-level security"`. | GET query confirms attacker UID is **NOT** present in `organization_members`. |
| **Test 2: Attacker Member Injection** | Attacker (`authenticated`) | `POST /rest/v1/organization_members`<br>`{"org_id": victim, "user_id": attacker, "role": "member"}` | **400 or 403**<br>Rejects 401/404. Asserts SQLSTATE `42501` or `"row-level security"`. | GET query confirms attacker UID is **NOT** present in `organization_members`. |
| **Test 3: Creator Onboarding** | Creator (`authenticated`) | `POST /rest/v1/organizations`<br>`POST /rest/v1/organization_members` (`role="owner"`) | **201 Created**<br>`is_org_creator` helper (`SECURITY DEFINER`) allows initial self-enrollment. | Independent GET query confirms row committed with `role == "owner"`. |
| **Test 4: Admin Member Invite** | Owner (`authenticated`) | `POST /rest/v1/organization_members`<br>`{"org_id": org, "user_id": colleague, "role": "member"}` | **201 Created**<br>Satisfies `is_org_admin(organization_id)`. | Independent GET query confirms row committed with `role == "member"`. |
| **Test 5: Member Role Self-Promotion** | Colleague (`authenticated`) | `PATCH /rest/v1/organization_members`<br>`{"role": "owner"}` | **403 or 200 `[]`**<br>UPDATE policy requires `is_org_admin`. 0 rows updated. | Independent GET query confirms member role remains strictly `"member"`. |

### Partial Setup Failure Handling:
- In all five tests, synthetic organization UUIDs are registered in `tracker.register(org_id)` **before** issuing the initial creation POST request.
- The `finally: await tracker.cleanup_org(...)` block executes unconditionally on any exception or assertion failure.
- If Step 1 (create organization) succeeds and Step 2 (insert owner/member) fails, `cleanup_org` queries the organization by ID and removes any partially created rows.

---

## 5. Action 4: Scoped Exact-UUID Cleanup Architecture

### 5.1 Exact-UUID Scoping vs. Dangerous Wildcards
Previous audits identified dangerous wildcard cleanup scripts such as `DELETE FROM organizations WHERE name LIKE '%Test%'`.  
`SafeTestTracker` enforces strict safety invariants:
1. **Exact-UUID In-Memory Registration:** Cleanup operates exclusively on UUIDs tracked in `self.created_org_ids`.
2. **Metadata Cross-Verification:** Before issuing a `DELETE` request, the harness issues `GET /rest/v1/organizations?id=eq.{org_id}&select=id,name` and asserts `name.startswith("ANUMAAN_STAGING_TEST_")`.
3. **Child-First Cascade:** Member rows in `organization_members` are deleted before deleting the parent `organizations` record.

### 5.2 Resolution of Baseline Schema Limitation
In baseline schema `00001_initial_schema.sql`, `public.organizations` lacks a `DELETE` RLS policy. Authenticated non-admin users cannot delete organizations via PostgREST.
- When `STAGING_SUPABASE_SERVICE_ROLE_KEY` is provided, `cleanup_org` uses service-role authorization to delete the test organization.
- If no service-role key is supplied, cleanup uses creator headers (removing members, but leaving the empty test org), logs a warning in `tracker.cleanup_warnings`, and alerts the operator for manual verification.

### 5.3 Independent Cleanup Verification Query
Run in Supabase Staging SQL Editor after test execution:
```sql
SELECT count(*) AS orphaned_test_orgs
FROM public.organizations
WHERE name LIKE 'ANUMAAN_STAGING_TEST_%';
-- EXPECTED: count = 0
```

---

## 6. Action 5: Stop Conditions, Backup Recovery, and Smoke Tests

### 6.1 Defined Stop Conditions
Execution must immediately halt and abort if any of the following occur:
1. **Preflight Migration Discrepancy:** `public.schema_migrations` does not contain versions `00001` through `00006`.
2. **Backup Failure:** `supabase db dump` fails, exits non-zero, or produces a zero-byte file.
3. **Production Project Detected:** Target URL, project ref, or service-role key matches `knwinlllqjmgzqcjrrio`.
4. **Allowlist Mismatch:** Target project reference is missing from `STAGING_APPROVED_PROJECT_REFS`.
5. **Identity Mismatch:** Any JWT subject claim (`sub`) does not match the configured UID.
6. **Catalog DDL Anomaly:** Function owner != `postgres`, `prosecdef != true`, `search_path != public`, or execute permissions granted to `PUBLIC`.
7. **Test Failure:** Any of the 5 live RLS tests fails. Trigger emergency rollback quarantine policy.

### 6.2 Backup Recovery Verification
1. Command: `supabase db dump --project-ref "<staging-project-ref>" -f "backup_staging_pre_00007.sql"`
2. Verify file size: `dir backup_staging_pre_00007.sql` (must be > 0 bytes).
3. Verify header: inspect first 10 lines for `PostgreSQL database dump`.
4. Verify table definitions: search for `CREATE TABLE public.organizations` and `CREATE TABLE public.organization_members`.
5. Verify recovery syntax: confirm database can be restored using `psql -h <host> -U postgres -d postgres -f backup_staging_pre_00007.sql`.

### 6.3 Post-Migration Smoke Checks
After migration `00007` and live tests pass, verify core workflows on the staging web application:
1. **Authentication:** User login across English, Marathi, and Hindi interfaces.
2. **Onboarding:** Create a new organization and confirm creator is assigned `owner` role.
3. **Estimates & BOQ:** Create building and road estimates; verify BOQ rate calculations and default 0% GST.
4. **Quotation Exports:** Generate and export PDF quotations (confirming formatting and watermark); generate Excel exports.

---

## 7. Action 6: Remaining Blockers & Preconditions

| Blocker / Dependency | Current Status | Required Action Before Staging Execution |
| :--- | :--- | :--- |
| **Approved Staging Project Reference** | **PENDING USER INPUT** | User must designate the staging project reference (e.g., `anumaan-staging`). Must be distinct from production `knwinlllqjmgzqcjrrio`. |
| **Three Staging Test Identities** | **PENDING SETUP** | Ensure 3 test accounts exist in Supabase Staging Auth: (1) Creator, (2) Attacker, (3) Colleague. |
| **Staging Service-Role Key** | **RECOMMENDED** | Supply staging service-role key for automated test organization cleanup. |
| **Function Owner Verification** | **PRECONDITION** | Applying migration 00007 in Supabase Dashboard SQL Editor automatically sets `proowner = postgres`. Catalog query 4.1 must confirm this prior to running tests. |

---

## 8. Action 7: Exact Local Test Results

All test suites were executed locally in offline isolation. Zero remote operations were performed:

### 8.1 Backend Pytest Suite
- **Command:** `services/api/.venv/Scripts/python.exe -m pytest services/api/tests -q`
- **Result:** **74 PASSED**, **5 SKIPPED** (live staging integration suite), **0 FAILED** (duration: 4.81s).

### 8.2 RLS Remediation & Static Invariant Suite
- **Command:** `services/api/.venv/Scripts/python.exe -m pytest -v services/api/tests/test_sec_rls_001_remediation.py`
- **Results:**
  - `test_migration_00007_replaces_exact_policy_name`: **PASSED**
  - `test_no_alternate_permissive_insert_policies_on_organization_members`: **PASSED**
  - `test_helper_function_security_invariants`: **PASSED**
  - `test_legitimate_creator_onboarding_assigns_owner_role`: **PASSED**
  - `test_creator_cannot_claim_or_access_foreign_organization`: **PASSED**
  - `test_unauthorized_member_cannot_perform_admin_operations`: **PASSED**
  - `test_mock_auth_endpoints_disabled_in_production`: **PASSED**
  - `test_mock_auth_me_endpoint_remains_available`: **PASSED**
  - `test_vulnerability_specification_truth_matrix`: **PASSED**
  - `test_postgres_rls_attacker_direct_postgrest_insert_rejected`: **SKIPPED (offline guard)**
  - `test_postgres_rls_attacker_insert_member_rejected`: **SKIPPED (offline guard)**
  - `test_postgres_rls_creator_onboarding_insert_succeeds`: **SKIPPED (offline guard)**
  - `test_postgres_rls_admin_invite_member_succeeds`: **SKIPPED (offline guard)**
  - `test_postgres_rls_member_cannot_update_role_to_owner`: **SKIPPED (offline guard)**
  - **Summary:** **9 passed, 5 skipped in 0.61s**

### 8.3 Staging Safety Guardrail Unit Invariants
- Missing `STAGING_APPROVED_PROJECT_REFS`: **Blocked (RuntimeError: mandatory error raised)**
- Project ref not in allowlist: **Blocked (RuntimeError: allowlist mismatch blocked)**
- Production service-role key: **Blocked (RuntimeError: production key rejected)**
- Valid staging config with approved ref: **Validated successfully**

### 8.4 Frontend Vitest Suite
- **Command:** `npm test -- --run` (in `apps/web`)
- **Result:** **7 test files passed**, **47 tests passed** (duration: 3.75s).

### 8.5 Frontend TypeScript Check
- **Command:** `npx tsc --noEmit` (in `apps/web`)
- **Result:** **0 errors (exit code 0)**.

---

## 9. Conclusion

The staging execution runbook has been overhauled and fully hardened:
1. The dangerous rollback instruction that re-exposed `SEC-RLS-001` has been eliminated and replaced with a fail-closed admin-only quarantine policy.
2. Mandatory allowlisting, hostname verification, JWT subject preflight checks, and service-role scoping are strictly verified by unit tests.
3. Neither staging nor production is claimed secure until live verification against an approved staging instance proves it.

*Phase G.6 local review complete. Awaiting user input on the approved staging project reference before live staging execution.*
