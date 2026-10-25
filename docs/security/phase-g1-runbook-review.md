# Anumaan (अनुमान) — Phase G.1: Staging Runbook Independent Review
## Detailed Technical Review of RLS Remediation (`SEC-RLS-001`) Staging Plan

**Document Version:** 1.0.0  
**Date:** 2026-10-24  
**Project Path:** `C:\Users\ARPIT\Documents\antigravity\Anumaan\`  
**Reviewed Documents:**
- `docs/security/phase-g-rls-migration-runbook.md`
- `supabase/migrations/00007_fix_organization_members_owner_escalation.sql`
- `services/api/tests/test_sec_rls_001_remediation.py`

---

## 1. Executive Summary & Staging Procedure

This review performs a strict, independent safety and technical analysis of the staging runbook for migration `00007_fix_organization_members_owner_escalation.sql`.

### The Staging Procedure in 8 Numbered Steps
1. **Target Staging Isolation & Preflight Check:** Confirm the staging Supabase project is completely isolated from production. Verify that the project reference in the dashboard URL does NOT match production (`knwinlllqjmgzqcjrrio`).
2. **Pre-Migration Usable Backup:** Export a full staging database dump and verify that the backup file is non-empty, contains valid SQL header/footers, and matches expected pre-migration table counts.
3. **Migration Baseline Confirmation:** Inspect `public.schema_migrations` in the staging database to confirm migrations `00001` through `00006` are applied, and `00007` is absent.
4. **Manual Migration DDL Execution:** Manually execute `00007_fix_organization_members_owner_escalation.sql` in a transaction in the Staging Supabase SQL Editor.
5. **Post-DDL Metadata Verification:** Run read-only verification queries against `pg_policies`, `pg_proc`, and `information_schema.routine_privileges` to confirm policy creation, `SECURITY DEFINER` status, and permission revocation from `PUBLIC`.
6. **Live Staging Authorization Matrix (5 Scenarios):** Execute the 5 required positive and negative authorization tests using dedicated synthetic staging accounts (`creator`, `attacker`, `colleague`).
7. **Application & API Smoke Test:** Verify that the FastAPI backend (`/api/health/ready`) and the Next.js web application operate seamlessly without RLS errors during user login and company onboarding.
8. **Anomalous Owner Audit:** Run the audit query to inspect existing memberships and confirm zero unauthorized ownership records exist.

---

## 2. Ranked Findings

| Finding ID | Severity | Category | Description | Required Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **REV-SEC-01** | **HIGH** | Production Safety | Recommending `python run_migrations.py` without an explicit environment check poses a risk of targeting production if local `.env` has production credentials. | Prohibit automated runner execution; require manual execution in Staging SQL Editor or explicit CLI parameter override. |
| **REV-SEC-02** | **HIGH** | Data Integrity | The backup instruction only checks that a backup file exists, without verifying that the backup is non-empty, structurally valid, and restorable. | Add explicit usability verification: file size check, header/footer validation, and record count checks. |
| **REV-SEC-03** | **MEDIUM** | Audit Logic | The "unlinked owners" query flags any owner whose `user_id != created_by`, which will produce false positives for legitimate co-owners and misses unauthorized `member`/`admin` roles. | Clarify exact scope of query: it identifies discrepancies between creator and owner, not proof of an attack. Supplement with role audit. |
| **REV-SEC-04** | **MEDIUM** | Environment Identity | `inet_server_addr()` in pooled PostgreSQL connections returns the pooler proxy IP rather than a unique project identifier. | Rely on Supabase Dashboard project reference matching (`dashboard/project/<ref>`) and query `current_database()`. |
| **REV-SEC-05** | **LOW** | Smoke Testing | Runbook lacked explicit backend health probe (`/api/health/ready`) and end-to-end UI onboarding smoke test after migration. | Add post-migration API readiness probe and UI smoke checklist to Section 10 of runbook. |

---

## 3. Deep-Dive Review of Specific Objectives

### 3.1 Verification of Backup Instructions & Usability
In `docs/security/phase-g-rls-migration-runbook.md`, section 4.1 specifies:
```bash
supabase db dump --project-ref <staging-project-ref> -f "backup_pre_migration_00007_staging.sql"
```
**Usability Criteria (How to Confirm the Backup is Usable):**
1. **Non-Zero File Size:** A valid schema+data backup for Anumaan must be greater than 15 KB. A 0-byte or < 1 KB file indicates CLI authentication failure or an aborted dump.
2. **Header and Footer Integrity:**
   - Header must contain: `-- PostgreSQL database dump`
   - Footer must contain: `-- PostgreSQL database dump complete`
3. **Key Table Definitions:** The dump must contain table definitions for `public.organizations` and `public.organization_members`.
4. **Table Count Cross-Check:** Query table record counts prior to backup and verify table rows exist in the dump:
   ```sql
   SELECT count(*) FROM public.organizations;
   SELECT count(*) FROM public.organization_members;
   ```

### 3.2 Review of SQL Verification Queries
- **Query 8.1 (Policy Verification on `organization_members`):**
  - *Correctness:* Safe and read-only.
  - *Improvement:* Explicitly add `AND schemaname = 'public'` to avoid namespace ambiguity.
- **Query 8.2 (`is_org_creator` Security Invariants):**
  - *Correctness:* Safe and read-only.
  - *Improvement:* Join `pg_namespace` to ensure `public.is_org_creator` is targeted.
  - *Verification:* `prosecdef = true` confirms `SECURITY DEFINER`; `proconfig = {search_path=public}` confirms fixed search path.
- **Query 8.3 (Function Routine Privileges):**
  - *Correctness:* Safe and read-only.
  - *Verification:* Confirms `EXECUTE` is revoked from `PUBLIC` and restricted to `authenticated` and `service_role`.
- **Query 8.4 (Audit for Unlinked Owners):**
  - *SQL Statement:*
    ```sql
    SELECT o.id, o.name, o.created_by, m.user_id, m.role
    FROM public.organizations o
    JOIN public.organization_members m ON o.id = m.organization_id
    WHERE m.role = 'owner' AND (o.created_by IS NULL OR o.created_by != m.user_id);
    ```
  - *What it PROVES:* It identifies any owner membership where the user is not the recorded creator in `organizations.created_by`.
  - *What it DOES NOT PROVE:*
    1. **Does not prove unauthorized attack:** A legitimate company co-founder added as a second `owner` by the creator will have `m.user_id != o.created_by`. This is valid business logic, not an exploit.
    2. **Does not detect non-owner attackers:** If an attacker inserted themselves as `admin` or `member`, this query ignores them completely because of `m.role = 'owner'`.
    3. **Does not detect attacker-created orgs:** If an attacker created their own organization legitimately, `created_by == user_id` will be true.

### 3.3 Verification of the Five Required Authorization Scenarios

| Scenario | Actor / Payload | Evaluated Predicate | Expected Result | Technical Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **1. Attacker makes self owner of another org** | `auth.uid() = attacker`<br>`org = victim_org`<br>`role = 'owner'` | `is_org_admin(victim)` = F<br>`user_id = auth.uid()` = T<br>`role = 'owner'` = T<br>`is_org_creator(victim)` = **F** | **REJECTED (42501)** | `is_org_creator` checks `created_by = auth.uid()`. Victim org has creator != attacker. Predicate is False. |
| **2. Unauthorized user inserts self as member** | `auth.uid() = attacker`<br>`org = victim_org`<br>`role = 'member'` | `is_org_admin(victim)` = F<br>`role = 'owner'` = **F** | **REJECTED (42501)** | `role = 'owner'` fails; attacker is not admin. Predicate is False. |
| **3. Legitimate creator becomes initial owner** | `auth.uid() = creator`<br>`org = new_org`<br>`role = 'owner'` | `is_org_admin(new_org)` = F<br>`user_id = auth.uid()` = T<br>`role = 'owner'` = T<br>`is_org_creator(new_org)` = **T** | **ALLOWED (201)** | `new_org.created_by = creator`. `SECURITY DEFINER` on `is_org_creator` bypasses `organizations` SELECT RLS during onboarding. |
| **4. Authorized owner/admin invites member** | `auth.uid() = owner`<br>`org = my_org`<br>`role = 'member'` | `public.is_org_admin(my_org)` = **T** | **ALLOWED (201)** | Existing owner/admin satisfies first branch of OR. Colleague is added. |
| **5. Regular member promotes self to owner** | `auth.uid() = member`<br>`org = my_org`<br>`UPDATE role='owner'` | UPDATE policy checks `is_org_admin(my_org)` = **F** | **REJECTED (42501)** | UPDATE policy on `organization_members` strictly requires `is_org_admin(organization_id)`. Member cannot update roles. |

### 3.4 Verification of Project Ref & Prevention of Accidental Production Targeting
- **The Risk:** Running commands against the wrong database.
- **Safeguards Required:**
  1. **Strict Project Reference Check:** Production project ref is `knwinlllqjmgzqcjrrio`. The Staging project ref MUST be completely different.
  2. **Never Run `run_migrations.py` Without Argument / Guard:** `run_migrations.py` reads `.env`. If `.env` contains production connection strings, running `python run_migrations.py` would mutate production.
  3. **SQL Editor Execution Rule:** Execute migration statements exclusively via the Supabase Dashboard SQL Editor in the browser tab verified to display the Staging project ref in the URL (`/project/<staging-ref>/sql`).

### 3.5 Missing Rollback, Recovery, and Post-Migration Steps
- **Rollback Refinement:** The emergency rollback script should ensure that dropping `public.is_org_creator` does not leave dangling triggers or dependencies.
- **Data Remediation Warning:** Rollback only alters policy logic. If an attacker had previously gained owner access, they could have read or copied estimates, quotations, or client data. Rollback does not undo data leakage. An audit of access logs is required if active exploitation is suspected.
- **API Health & Smoke Test:** Add an explicit post-migration check invoking `GET /api/health/ready` to ensure connection pooler connectivity.

---

## 4. Safe Manual Checklist for Staging

### Phase 1: Pre-Execution Verification
- [ ] Confirm Staging Supabase project URL and project ref (must NOT be `knwinlllqjmgzqcjrrio`).
- [ ] Verify `public.schema_migrations` contains versions `00001` through `00006`.
- [ ] Verify version `00007_fix_organization_members_owner_escalation.sql` is NOT present.
- [ ] Execute pre-migration backup via `supabase db dump` or `pg_dump`.
- [ ] Verify backup file size > 15 KB, inspect headers (`PostgreSQL database dump`), and confirm table definitions exist.
- [ ] Record baseline row count: `SELECT count(*) FROM public.organization_members;`.

### Phase 2: Migration Execution
- [ ] Open Staging Supabase Dashboard -> SQL Editor.
- [ ] Re-verify browser URL contains `<staging-ref>`.
- [ ] Paste contents of `supabase/migrations/00007_fix_organization_members_owner_escalation.sql`.
- [ ] Execute script within a single transaction block (`BEGIN ... COMMIT`).
- [ ] Insert migration record: `INSERT INTO public.schema_migrations (version) VALUES ('00007_fix_organization_members_owner_escalation.sql');`.

### Phase 3: Post-Migration Metadata & Privilege Audit
- [ ] Run Policy Check: Confirm exactly 1 INSERT policy on `public.organization_members` with `public.is_org_creator` in `with_check`.
- [ ] Run Function Check: Confirm `public.is_org_creator` has `prosecdef = true` and `proconfig = {search_path=public}`.
- [ ] Run Privilege Check: Confirm `EXECUTE` on `is_org_creator` is revoked from `PUBLIC` and granted to `authenticated, service_role`.

### Phase 4: Live Authorization Matrix Execution
- [ ] Scenario 1 (Negative): Attacker direct insert as owner -> Verify 42501 RLS violation.
- [ ] Scenario 2 (Negative): Attacker direct insert as member -> Verify 42501 RLS violation.
- [ ] Scenario 3 (Positive): Creator onboarding -> Verify 201 Created and owner membership assigned.
- [ ] Scenario 4 (Positive): Owner invites colleague as member -> Verify 201 Created.
- [ ] Scenario 5 (Negative): Member promotes self to owner -> Verify 42501 or 0 rows updated.

### Phase 5: Application Smoke Testing
- [ ] Backend API: Invoke `GET /api/health/ready` -> Expect `HTTP 200 {"status": "ready", "database": "connected"}`.
- [ ] Web Frontend: Log in as test creator, create a company profile, verify dashboard loads without RLS errors.

---

## 5. Exact Commands to Run Later (NOT EXECUTED - AWAITING APPROVAL)

> [!CAUTION]
> **THE FOLLOWING COMMANDS ARE REVIEW SPECIFICATIONS ONLY. THEY HAVE NOT BEEN EXECUTED.**  
> Execution is prohibited until explicit approval for Phase G Staging is granted.

### 5.1 Safe Target Verification Query (Read-Only)
```sql
-- [NOT EXECUTED] - Run in Staging SQL Editor
SELECT 
    current_database() AS db_name,
    current_user AS db_user,
    version() AS pg_version;

SELECT version, applied_at 
FROM public.schema_migrations 
ORDER BY version ASC;
```

### 5.2 Backup Command & Usability Verification
```bash
# [NOT EXECUTED] - Export Staging Backup
supabase db dump --project-ref <staging-ref> -f "staging_backup_pre_00007.sql"

# [NOT EXECUTED] - Verify Usability
# 1. Check size > 15KB
Get-Item "staging_backup_pre_00007.sql" | Select-Object Name, Length

# 2. Check header/footer
Get-Content -Path "staging_backup_pre_00007.sql" -TotalCount 5
Get-Content -Path "staging_backup_pre_00007.sql" -Tail 5
```

### 5.3 Enhanced Metadata Verification Queries
```sql
-- [NOT EXECUTED] - 1. Verify Active Policies on organization_members
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'organization_members'
ORDER BY cmd, policyname;

-- [NOT EXECUTED] - 2. Verify Function Security Attributes
SELECT 
    p.proname, 
    p.prosecdef AS is_security_definer,
    p.proconfig AS search_path_config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname = 'is_org_creator';

-- [NOT EXECUTED] - 3. Verify Function Routine Privileges
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' 
  AND routine_name = 'is_org_creator';
```

---

## 6. Separation of Verified Facts vs Assumptions

### Verified Facts (Confirmed by Static Code Analysis & Local Tests)
1. **Root Cause Confirmed:** Migration `00001` policy on `organization_members` permitted any authenticated user to insert themselves as `owner` if `user_id = auth.uid() AND role = 'owner'` without verifying `created_by`.
2. **Absence of Alternate Policies:** Scanned all migration files (`00001`–`00007`); exactly one INSERT policy exists on `public.organization_members`.
3. **Helper Function Security:** `is_org_creator` in `00007` includes `SECURITY DEFINER`, `SET search_path = public`, explicitly revokes from `PUBLIC`, and grants only to `authenticated, service_role`.
4. **Mock Auth Endpoints Fail Closed:** Verified by `pytest` that `/api/auth/signup` and `/api/auth/login` return `HTTP 404 Not Found` when `ENVIRONMENT == "production"`.
5. **Local Test Suite:** 74 tests pass, 5 real PostgreSQL tests are skipped pending staging, 47 frontend tests pass, and TypeScript has 0 errors.

### Assumptions & Pending Verifications (Must Be Validated on Staging)
1. **Assumption:** Staging Supabase project is configured identically to production regarding extensions, auth schema, and RLS behavior. *(Must be verified prior to migration).*
2. **Assumption:** Direct PostgREST API calls in Supabase cloud behave identically to PostgreSQL kernel RLS evaluation. *(Must be verified via Live Staging Tests 1–5).*
3. **Pending Verification:** Real PostgreSQL RLS enforcement has NOT been executed locally because local PostgreSQL is not installed and safety rules prohibit connecting to remote databases without authorization.
4. **Assumption:** Existing production organizations all have valid `created_by` values matching their legitimate owner. *(Must be audited on production prior to production migration).*

---

*Review completed in offline isolation. Zero remote operations performed.*
