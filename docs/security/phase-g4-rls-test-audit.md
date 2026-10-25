# Anumaan (अनुमान) — Phase G.4: RLS Test Quality and Staging Safety Audit

**Audit Date:** 2026-10-25  
**Auditor:** Antigravity AI Pair Programmer  
**Repository Working Copy:** `c:\Users\ARPIT\Downloads\Anumaan\` / `C:\Users\ARPIT\Documents\antigravity\Anumaan\`  
**Target Migration:** `supabase/migrations/00007_fix_organization_members_owner_escalation.sql`  
**Target Test Suite:** `services/api/tests/test_sec_rls_001_remediation.py`  
**Prior Readiness Document:** `docs/security/phase-g3-rls-test-readiness.md`  

---

## 1. Executive Summary & Safety Declaration

This audit independently reviews the implementation quality, cryptographic assertions, PostgreSQL kernel boundary enforcement, and staging safety guardrails for the remediation of **`SEC-RLS-001`** (Privilege escalation in `public.organization_members` INSERT RLS policy).

### Safety Guardrails Observed During Audit:
- **Zero remote operations performed:** No network connection was established to Supabase staging or production.
- **Zero SQL migrations executed:** Migration `00007` was NOT applied to any remote database.
- **Zero secrets printed:** No JWTs, API keys, database passwords, or connection strings were logged or displayed.
- **Strict local execution:** All validations were performed against local static DDL AST parsers, FastAPI/SQLite in-memory test fixtures, and offline PyJWT claim verification.
- **Pre-existing changes preserved:** All working-tree changes across apps and services remain intact.

---

## 2. Target Files Inspected

| Target File | Lines Inspected | Description & Purpose |
| :--- | :--- | :--- |
| `supabase/migrations/00007_fix_organization_members_owner_escalation.sql` | Lines 1–68 | DDL migration creating `is_org_creator` helper and replacing `organization_members` INSERT policy. |
| `services/api/tests/test_sec_rls_001_remediation.py` | Lines 1–850 | DDL invariant tests, FastAPI authorization tests, SEC-AUTH-001 production guards, boolean truth matrix, and live PostgREST staging test suite. |
| `docs/security/phase-g3-rls-test-readiness.md` | Lines 1–148 | Prior staging test readiness specification. |
| `supabase/migrations/00001_initial_schema.sql` | Lines 170–306 | Baseline RLS policies on `organizations` and `organization_members`. |

---

## 3. Comprehensive Audit Against the 9 Criteria

### Point 1: Full Inspection of the Five Integration Test Bodies
We inspected all five methods in `TestPostgresRLSIntegrationLive` in `services/api/tests/test_sec_rls_001_remediation.py`:

1. **`test_postgres_rls_attacker_direct_postgrest_insert_rejected` (Lines 542–610):**
   - **Mechanism:** Creator generates synthetic UUID org and self-enrolls as owner. Attacker issues direct PostgREST `POST /rest/v1/organization_members` specifying `victim_org_id`, `attacker_uid`, and `role="owner"`.
   - **Audit Finding:** The previous implementation accepted `status_code in (400, 401, 403, 404)`. If PostgREST returned 401 (e.g., malformed token) or 404 (wrong URL), the test passed without testing PostgreSQL RLS.
2. **`test_postgres_rls_attacker_insert_member_rejected` (Lines 612–661):**
   - **Mechanism:** Creator creates org and owner row. Attacker attempts `POST /rest/v1/organization_members` with `role="member"`.
   - **Audit Finding:** Accepted `status_code in (400, 401, 403, 404)` with **zero body verification** and did not verify that the attacker was omitted from the persisted members list. Setup steps lacked HTTP 201 assertions.
3. **`test_postgres_rls_creator_onboarding_insert_succeeds` (Lines 663–707):**
   - **Mechanism:** Creator creates an organization and immediately inserts themselves as `owner`.
   - **Audit Finding:** Verified returned JSON representation from the `POST` response, but did NOT perform an independent `GET` query to confirm that the row was committed and retrievable under `SELECT` RLS.
4. **`test_postgres_rls_admin_invite_member_succeeds` (Lines 709–751):**
   - **Mechanism:** Verified owner issues `POST /rest/v1/organization_members` to enroll a colleague as `member`.
   - **Audit Finding:** Asserted `status_code == 201` on the `POST` response, but did NOT perform a follow-up query to verify persistence in the database. Setup calls lacked status assertions.
5. **`test_postgres_rls_member_cannot_update_role_to_owner` (Lines 753–821):**
   - **Mechanism:** Regular member attempts `PATCH /rest/v1/organization_members` with `{"role": "owner"}`.
   - **Audit Finding:** Verified PostgREST returns 200 with `[]` or 403, and verified persisted member role remains `"member"`. Setup calls lacked HTTP 201 assertions.

---

### Point 2: Negative Authorization Tests (Reject Ambiguous 401/404 & Verify Persistence)
- **Defect Identified:** Prior assertions `assert res.status_code in (400, 401, 403, 404)` treated HTTP 401 (Unauthorized) and HTTP 404 (Not Found) as passing proofs of RLS enforcement.
  - *Risk:* If an expired JWT, wrong anon key, or mistyped URL was provided, the test passed falsely without verifying PostgreSQL kernel RLS.
- **Required & Implemented Fix:**
  1. Strictly assert `status_code in (400, 403)`: HTTP 401 and 404 are explicitly rejected as ambiguous.
  2. Inspect response payload for PostgreSQL SQLSTATE `42501` or string `"row-level security"`.
  3. Query `GET /rest/v1/organization_members?organization_id=eq.{victim_org_id}` to confirm `attacker_uid` was NOT persisted in the database table.
  4. Ensure both identities (creator and attacker) are valid and authenticated before asserting policy enforcement.

---

### Point 3: Positive Tests (Verify Expected Records Actually Persist)
- **Defect Identified:** Tests 3 and 4 only checked the immediate HTTP 201 response status and `Prefer: return=representation` header payload. They did not verify that the database table actually contains the committed record.
- **Required & Implemented Fix:**
  - Added an independent follow-up query:
    `GET /rest/v1/organization_members?organization_id=eq.{org_id}&user_id=eq.{target_uid}&select=role,user_id`
  - Assert that the response returns HTTP 200, contains exactly 1 row, and matches the expected role (`owner` for creator onboarding, `member` for admin invitation). This proves both `INSERT` and `SELECT` RLS policies succeed.

---

### Point 4: JWT Subject Matching & Zero Secret Exposure
- **Defect Identified:** `StagingEnvironmentConfig.get_config()` previously loaded `STAGING_CREATOR_JWT` and `STAGING_CREATOR_UID` without cross-checking the `sub` claim. If mismatched credentials were supplied, tests would execute with unintentional actor identities.
- **Required & Implemented Fix:**
  - Added `StagingEnvironmentConfig.verify_token_subject(token, expected_uid, role_name)`:
    - Decodes JWT claims safely without verification (`jwt.decode(token, options={"verify_signature": False})`).
    - Compares `claims.get("sub")` against the configured UID.
    - Raises a `ValueError("Identity Mismatch: ...")` if they differ.
    - **Never prints raw tokens or secret keys in error messages, exception tracebacks, or test outputs.**

---

### Point 5: Explicit Staging Project Reference & URL Host Verification
- **Defect Identified:** Configuration only checked if the substring `"knwinlllqjmgzqcjrrio"` was in `url`. If `STAGING_SUPABASE_PROJECT_REF` was omitted or mismatched with the URL host, the check did not fail closed.
- **Required & Implemented Fix:**
  - Require explicit `STAGING_SUPABASE_PROJECT_REF`.
  - Parse `url` with `urllib.parse.urlparse(clean_url)`:
    - Assert `parsed_url.scheme == "https"`.
    - Assert `parsed_url.hostname == f"{project_ref}.supabase.co"`.
    - Assert `project_ref != PRODUCTION_PROJECT_REF` and `PRODUCTION_PROJECT_REF not in clean_url`.
    - If `STAGING_APPROVED_PROJECT_REFS` is exported, enforce that `project_ref in approved_refs`.
  - Missing, mismatched, or ambiguous configuration fails closed immediately before any HTTP request or database write.

---

### Point 6: Production Protection & Scoped Exact-UUID Cleanup
- **Tracking & Scoping:**
  - `SafeTestTracker` registers exact synthetic UUIDs (`uuid.uuid4()`) and verifies that `name.startswith("ANUMAAN_STAGING_TEST_")` prior to deletion.
  - No broad wildcard deletions (`LIKE '%Test%'`) are permitted.
- **CRITICAL Schema Finding (Audit Discovery):**
  - Inspection of `supabase/migrations/00001_initial_schema.sql` reveals that **`public.organizations` has NO `DELETE` RLS policy**:
    - Lines 227–239 define `SELECT`, `INSERT`, and `UPDATE` policies.
    - No `FOR DELETE` policy exists on `public.organizations`.
  - *Consequence:* When `cleanup_org` sends `DELETE /rest/v1/organizations?id=eq.{org_id}` using `creator_headers` (`authenticated` role), PostgreSQL RLS denies the delete by default.
  - In previous code, `cleanup_org` wrapped this in `try: ... except Exception: pass`, which masked the failure and left synthetic organization records in the staging catalog.
  - *Fix Implemented:* Track cleanup warnings in `tracker.cleanup_warnings`, verify delete response codes (200/204), and allow staging runners to configure `STAGING_SUPABASE_SERVICE_ROLE_KEY` for teardown if authenticated deletion is not permitted by schema.

---

### Point 7: Pytest Discovery & Silent Skip Prevention
- **Discovery Check:**
  - Pytest command `pytest --collect-only` discovers all 14 tests in `test_sec_rls_001_remediation.py` (9 unit/application/invariant tests + 5 live staging tests).
  - None of the 5 tests contain empty `pass` statements; all have complete test logic.
- **Silent Skipping Prevention:**
  - In local development without credentials, tests skip with a descriptive message to protect against remote mutations.
  - If `STAGING_RUN_LIVE_TESTS=1` is exported in CI or staging execution, missing or incomplete credentials call `pytest.fail()`, **preventing silent green passes in CI pipelines**.

---

### Point 8: Failure Handling and Partial Setup Cleanup
- **Setup Assertions:**
  - All preparatory calls (`POST /rest/v1/organizations` and `POST /rest/v1/organization_members`) in Tests 1, 2, 3, 4, and 5 now explicitly assert `status_code == 201`.
  - Any partial setup failure immediately aborts the test with an informative error rather than continuing into false negative assertions.
- **Teardown on Partial Success:**
  - Synthetic organization UUIDs are registered with `SafeTestTracker` before the creation HTTP request.
  - The `finally:` block executes `await tracker.cleanup_org(...)` regardless of where an exception occurs during the test body.
  - `cleanup_org` checks existence and deletes member associations before attempting organization removal.

---

### Point 9: Migration 00007 DDL Logic & Invariant Proof
Inspection of `supabase/migrations/00007_fix_organization_members_owner_escalation.sql`:
1. **Helper Function `public.is_org_creator(target_org_id UUID)`:**
   - Declared as `SECURITY DEFINER` with `SET search_path = public`.
   - *Why `SECURITY DEFINER` is mandatory:* When a creator creates an organization, they do not yet have an `organization_members` row. Querying `public.organizations` under normal caller permissions triggers `organizations` SELECT RLS (`is_org_member`), which would evaluate to `FALSE`. `SECURITY DEFINER` allows safely reading `organizations.created_by = auth.uid()`.
   - Execution is restricted: `REVOKE ALL ON FUNCTION public.is_org_creator(UUID) FROM PUBLIC; GRANT EXECUTE ... TO authenticated, service_role;`.
2. **Hardened INSERT Policy:**
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
   - **Self-Promotion Blocked:** An attacker cannot satisfy `is_org_admin` (they are not an admin) and cannot satisfy `is_org_creator` (they did not create the target organization). PostgreSQL kernel raises SQLSTATE `42501`.
   - **Legitimate Onboarding Preserved:** The creator is recorded in `organizations.created_by`. `is_org_creator` returns `TRUE`, `user_id = auth.uid()` is `TRUE`, and `role = 'owner'` is `TRUE`. The insert succeeds.
   - **Admin Invitations Preserved:** Existing owners/admins satisfy `is_org_admin(organization_id)`. The insert succeeds.
   - **Role Escalation via UPDATE Blocked:** Existing UPDATE policy `"Admins and owners can update member roles"` in `00001_initial_schema.sql` requires `is_org_admin` in `USING` and `WITH CHECK`. Unprivileged members cannot update their role to `'owner'`.

---

## 4. Fixes Implemented in `test_sec_rls_001_remediation.py`

| Audit Finding | File & Lines | Implementation Fix |
| :--- | :--- | :--- |
| **Ambiguous 401/404 accepted** | `test_sec_rls_001_remediation.py:593, 657` | Replaced with `assert status_code in (400, 403)` and verified SQLSTATE `42501` / `"row-level security"` in payload. |
| **Missing member non-persistence check** | `test_sec_rls_001_remediation.py:657` | Added query verifying attacker was NOT persisted in `organization_members`. |
| **Missing positive persistence checks** | `test_sec_rls_001_remediation.py:702, 747` | Added follow-up `GET` queries verifying creator owner and invited member records are queryable. |
| **No JWT subject verification** | `test_sec_rls_001_remediation.py:477` | Added `verify_token_subject()` decoding `sub` claim and matching configured UIDs without printing tokens. |
| **Weak project ref / host checks** | `test_sec_rls_001_remediation.py:470` | Added `urllib.parse` host validation (`{ref}.supabase.co`), approved ref allowlist, and strict production blocking. |
| **Missing setup HTTP 201 assertions** | `test_sec_rls_001_remediation.py:640, 730, 781` | Added explicit `assert status_code == 201` on all organization and membership setup requests. |
| **Silent CI skip hazard** | `test_sec_rls_001_remediation.py:465` | Added `STAGING_RUN_LIVE_TESTS` check that triggers `pytest.fail()` instead of skip when live execution is requested. |
| **Swallowed cleanup exceptions** | `test_sec_rls_001_remediation.py:530` | Replaced `except Exception: pass` with `self.cleanup_warnings` collection and deletion status validation. |

---

## 5. Local Verification & Exact Test Results

All tests executed locally in an offline environment without external database operations:

### 5.1 Backend Pytest Suite
- **Command:** `services/api/.venv/Scripts/python.exe -m pytest services/api/tests -q`
- **Results:**
  - **74 PASSED**
  - **5 SKIPPED** (The 5 live PostgREST integration tests, skipped offline)
  - **0 FAILED**
  - **Duration:** 6.04s

### 5.2 RLS Remediation & Invariant Test Suite
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
  - **Summary:** **9 passed, 5 skipped in 0.65s**

### 5.3 Safety Guardrail Invariant Validation
- **Unit Invariant Checks:**
  1. Target points to production (`knwinlllqjmgzqcjrrio`): **Blocked (RuntimeError: CRITICAL SAFETY VIOLATION)**
  2. Hostname mismatch (`different-host.supabase.co` vs project ref): **Blocked (RuntimeError: CRITICAL CONFIG MISMATCH)**
  3. JWT subject mismatch (`sub` != UID): **Blocked (ValueError: Identity Mismatch)**
  4. Matching JWT subject: **Validated successfully**
  5. `STAGING_RUN_LIVE_TESTS=1` without config: **Failed closed (pytest.fail)**

### 5.4 Frontend Vitest Suite
- **Command:** `npm test -- --run` (in `apps/web`)
- **Results:** **7 test files passed**, **47 tests passed**, 0 failed.

### 5.5 Frontend TypeScript Check
- **Command:** `npx tsc --noEmit` (in `apps/web`)
- **Results:** **0 errors**.

---

## 6. Separation of Verified Facts vs. Assumptions

| Item / Claim | Classification | Evidence / Basis |
| :--- | :--- | :--- |
| Migration 00007 replaces exact policy name | **Verified Fact** | AST regex match proves identical policy name `"Admins and owners can invite / add members"`. |
| No secondary permissive INSERT policy exists on `organization_members` | **Verified Fact** | Automated scan across all migrations confirmed exactly 2 definitions (00001 and 00007). |
| Helper function enforces `SECURITY DEFINER` and `SET search_path = public` | **Verified Fact** | DDL static inspection confirmed syntax and execution grants restricted to authenticated/service_role. |
| Guardrails fail closed against production `knwinlllqjmgzqcjrrio` | **Verified Fact** | Unit invariant test confirmed immediate runtime exception on production match. |
| JWT subject claim matching prevents identity confusion | **Verified Fact** | Claim decoding confirmed without printing raw secret tokens. |
| All 74 local backend tests and 47 frontend tests pass | **Verified Fact** | Local test execution logs recorded 0 failures. |
| `public.organizations` lacks a DELETE RLS policy in baseline schema | **Verified Fact** | Migration 00001 defines SELECT, INSERT, UPDATE only; authenticated DELETE is blocked by RLS. |
| Live PostgREST returns HTTP 400/403 with code 42501 on Supabase staging | **Assumption** | Requires staging database deployment with migration 00007 applied to verify live PostgREST response format. |
| Staging PostgreSQL role ownership of `is_org_creator` will be `postgres` | **Assumption** | Depends on the execution role in the Supabase Staging SQL Editor. Must be confirmed during Phase G.5 staging run. |

---

## 7. Audit Conclusion & Pre-Staging Recommendations

1. **Test Quality Hardening Complete:** `services/api/tests/test_sec_rls_001_remediation.py` now meets all 9 quality and safety criteria. Ambiguous status codes are rejected, positive tests verify persisted state, JWT subjects are cross-checked, and URL hostnames are strictly validated.
2. **Cleanup Schema Advisory:** Because `public.organizations` lacks a `DELETE` policy, tests running under an `authenticated` user role cannot delete created organizations via PostgREST. For staging teardown, tests must either:
   - Provide `STAGING_SUPABASE_SERVICE_ROLE_KEY` exclusively for cleanup teardown, OR
   - Add a scoped DELETE policy in a future migration:
     `CREATE POLICY "Owners can delete their organization" ON public.organizations FOR DELETE USING (public.is_org_admin(id));`
3. **Approval Required Before Staging:** Zero remote operations have been conducted. Phase G.5 staging execution must only proceed upon explicit confirmation of the designated staging project reference.
