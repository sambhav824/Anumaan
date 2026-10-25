# Anumaan (अनुमान) — Phase G.3: Real RLS Integration Test Readiness & Safe Cleanup
## Dedicated Staging PostgREST / PostgreSQL RLS Test Specification

**Document Version:** 1.0.0  
**Date:** 2026-10-24  
**Project Path:** `C:\Users\ARPIT\Documents\antigravity\Anumaan\`  
**Test Suite File:** [services/api/tests/test_sec_rls_001_remediation.py](file:///C:/Users/ARPIT/Documents/antigravity/Anumaan/services/api/tests/test_sec_rls_001_remediation.py)  
**Migration File:** [supabase/migrations/00007_fix_organization_members_owner_escalation.sql](file:///C:/Users/ARPIT/Documents/antigravity/Anumaan/supabase/migrations/00007_fix_organization_members_owner_escalation.sql)  

---

## 1. Executive Summary & Readiness Overview

Phase G.3 implements genuine, kernel-level PostgreSQL Row-Level Security (RLS) integration tests for the Anumaan platform.

### What Was Accomplished in Phase G.3:
1. **Real PostgREST Integration Tests Implemented:** The placeholder stubs in `services/api/tests/test_sec_rls_001_remediation.py` have been replaced with full PostgREST HTTP integration tests. These tests execute direct API calls to `/rest/v1/organization_members` using genuine authenticated Supabase user JWTs (`authenticated` role), strictly verifying the PostgreSQL kernel RLS boundary rather than FastAPI middleware.
2. **Safe, Scoped Test Cleanup Architecture:** Replaced broad wildcard cleanup logic (`LIKE '%Test%'`) with an in-memory `SafeTestTracker`. Cleanup is strictly restricted to explicitly registered synthetic UUIDs created during the test run, verifying ownership and prefix metadata (`ANUMAAN_STAGING_TEST_`) before deletion.
3. **Fail-Closed Environment Guards:** Integrated hardcoded guards that fail closed and abort immediately if staging configuration is missing or if the target project reference matches Production (`knwinlllqjmgzqcjrrio`).
4. **Local Isolation Preserved:** In local test environments without remote credentials, the live integration suite cleanly skips with an informative notice, while all 74 local unit, invariant, and application tests pass with 100% success.

---

## 2. Test Coverage Details (The 5 Real RLS Integration Scenarios)

The test class `TestPostgresRLSIntegrationLive` in `test_sec_rls_001_remediation.py` implements the five core security scenarios:

| Test Method | Actor / Role | Endpoint / Action | Expected Kernel RLS Behavior | Persisted State Check |
| :--- | :--- | :--- | :--- | :--- |
| **1. `test_postgres_rls_attacker_direct_postgrest_insert_rejected`** | `attacker` (`authenticated`) | `POST /rest/v1/organization_members`<br>`{"organization_id": victim_org, "user_id": attacker, "role": "owner"}` | **REJECTED (42501)**<br>PostgREST returns HTTP 400/403 with RLS violation error. | Query `/rest/v1/organization_members`: verifies attacker is NOT in members list. |
| **2. `test_postgres_rls_attacker_insert_member_rejected`** | `attacker` (`authenticated`) | `POST /rest/v1/organization_members`<br>`{"organization_id": victim_org, "user_id": attacker, "role": "member"}` | **REJECTED (42501)**<br>PostgREST returns HTTP 400/403. | Verifies non-admin cannot insert arbitrary members. |
| **3. `test_postgres_rls_creator_onboarding_insert_succeeds`** | `creator` (`authenticated`) | `POST /rest/v1/organizations`<br>`POST /rest/v1/organization_members`<br>`{"organization_id": new_org, "user_id": creator, "role": "owner"}` | **ALLOWED (201 Created)**<br>`SECURITY DEFINER` on `is_org_creator` bypasses `organizations` SELECT RLS. | Query `/rest/v1/organization_members`: row exists with `role == 'owner'`. |
| **4. `test_postgres_rls_admin_invite_member_succeeds`** | `owner` (`authenticated`) | `POST /rest/v1/organization_members`<br>`{"organization_id": org_id, "user_id": colleague, "role": "member"}` | **ALLOWED (201 Created)**<br>Satisfies `is_org_admin(organization_id)`. | Query `/rest/v1/organization_members`: colleague exists with `role == 'member'`. |
| **5. `test_postgres_rls_member_cannot_update_role_to_owner`** | `member` (`authenticated`) | `PATCH /rest/v1/organization_members?organization_id=eq.{id}&user_id=eq.{member}`<br>`{"role": "owner"}` | **REJECTED (200 with `[]` or 403)**<br>UPDATE policy requires `is_org_admin`. | Query `/rest/v1/organization_members`: role remains `'member'`, not `'owner'`. |

---

## 3. Required Staging Environment Configuration & Safety Invariants

### 3.1 Required Environment Variables
To run the live RLS integration suite in Staging, the following environment variables must be exported:

```bash
# [NOT EXECUTED - To be configured only in Staging CI/CD or local test runner]
export STAGING_SUPABASE_URL="https://<staging-project-ref>.supabase.co"
export STAGING_SUPABASE_ANON_KEY="<staging-anon-key>"
export STAGING_SUPABASE_PROJECT_REF="<staging-project-ref>"
export STAGING_CREATOR_JWT="<jwt-for-creator-account>"
export STAGING_CREATOR_UID="<uuid-for-creator-account>"
export STAGING_ATTACKER_JWT="<jwt-for-attacker-account>"
export STAGING_ATTACKER_UID="<uuid-for-attacker-account>"
export STAGING_MEMBER_JWT="<jwt-for-member-account>"
export STAGING_MEMBER_UID="<uuid-for-member-account>"
```

### 3.2 Production Safeguard Invariant
The test suite implements an un-bypassable hardcoded safety check:
```python
PRODUCTION_PROJECT_REF = "knwinlllqjmgzqcjrrio"

if PRODUCTION_PROJECT_REF in url or (project_ref and PRODUCTION_PROJECT_REF in project_ref):
    raise RuntimeError(
        f"CRITICAL SAFETY VIOLATION: STAGING_SUPABASE_URL points to PRODUCTION "
        f"project ref '{PRODUCTION_PROJECT_REF}'! Live tests strictly aborted."
    )
```

---

## 4. Safe Test-Data Cleanup Architecture

### 4.1 Rejection of Broad Wildcard Queries
Previous review drafts noted potential hazards in broad cleanup scripts such as:
`DELETE FROM organizations WHERE name LIKE '%Test%';`
Such queries are dangerous because they could accidentally delete legitimate test organizations created by other developers or QA engineers.

### 4.2 Exact-UUID Scoped Cleanup Implementation
In `test_sec_rls_001_remediation.py`, `SafeTestTracker` enforces:
1. **Explicit Registration:** Only UUIDs generated via `uuid.uuid4()` within that specific test execution are registered.
2. **Metadata Cross-Verification:** Before issuing a DELETE, the cleanup function queries the record:
   - Verifies the organization exists.
   - Verifies that `name` begins with `ANUMAAN_STAGING_TEST_`.
3. **Idempotent Cascade:** Deletes child `organization_members` rows first, then deletes `organizations`.
4. **No Blanket Deletions:** If an organization's identity cannot be verified, it is skipped rather than blindly deleted.

---

## 5. Review of Migration Assumptions Requiring Staging Confirmation

| Security / Schema Property | Local Status | Staging Confirmation Requirement |
| :--- | :--- | :--- |
| **Function Ownership** | Assumed `postgres` | Verify `SELECT rolname FROM pg_proc JOIN pg_roles ON pg_proc.proowner = pg_roles.oid WHERE proname = 'is_org_creator';` returns `postgres`. |
| **`SECURITY DEFINER` Search Path** | Verified in DDL | Confirm `proconfig` contains `search_path=public` in staging catalog. |
| **Function Execution Revocation** | Verified in DDL | Confirm `information_schema.routine_privileges` shows zero grants for role `PUBLIC`. |
| **PostgREST HTTP Error Code** | Standard 400/403 | Verify that PostgREST returns PostgreSQL error `42501` in the response payload. |
| **Schema Migration Table Entry** | Standard SQL | Confirm entry `00007_fix_organization_members_owner_escalation.sql` records cleanly in `public.schema_migrations`. |
| **Existing Multi-Owner Status** | Verified schema | On production prior to final application, audit query 8.4 must confirm no unexpected unlinked owners exist. |

---

## 6. Staging Commands (NOT EXECUTED - AWAITING STAGING APPROVAL)

> [!CAUTION]
> **THE FOLLOWING COMMANDS ARE SPECIFICATIONS FOR STAGING EXECUTION ONLY.**  
> Zero remote commands have been executed during this review phase.

```powershell
# [NOT EXECUTED] Step 1: Preflight check target database (Run in Staging SQL Editor)
SELECT current_database(), current_user;
SELECT version, applied_at FROM public.schema_migrations ORDER BY version;

# [NOT EXECUTED] Step 2: Run Live Integration Test Suite in Staging
$env:STAGING_SUPABASE_URL = "https://<staging-ref>.supabase.co"
$env:STAGING_SUPABASE_ANON_KEY = "<staging-anon-key>"
$env:STAGING_SUPABASE_PROJECT_REF = "<staging-ref>"
$env:STAGING_CREATOR_JWT = "<jwt>"
$env:STAGING_CREATOR_UID = "<uid>"
$env:STAGING_ATTACKER_JWT = "<jwt>"
$env:STAGING_ATTACKER_UID = "<uid>"
$env:STAGING_MEMBER_JWT = "<jwt>"
$env:STAGING_MEMBER_UID = "<uid>"

pytest -v services/api/tests/test_sec_rls_001_remediation.py -k "TestPostgresRLSIntegrationLive"
```

---

## 7. Current Local Test Results (Offline Isolation)

Local test suites executed without remote database connection:

1. **Backend Pytest Suite:**
   - Command: `services/api/.venv/Scripts/python.exe -m pytest -v services/api/tests`
   - **Result:** **74 PASSED**, **5 SKIPPED** (live staging integration suite), **0 FAILED**.
   - **Exit Code:** `0`.
2. **Frontend Vitest Suite:**
   - Command: `npm test -- --run` (in `apps/web`)
   - **Result:** **7 test files passed**, **47 tests passed**.
   - **Exit Code:** `0`.
3. **Frontend TypeScript Check:**
   - Command: `npx tsc --noEmit` (in `apps/web`)
   - **Result:** **Zero type errors**.
   - **Exit Code:** `0`.

---

*Phase G.3 readiness specification complete. Awaiting explicit approval before staging execution.*
