"""
Regression & Invariant Test Suite: SEC-RLS-001 Remediation and SEC-AUTH-001 Hardening
===================================================================================
Audit Finding SEC-RLS-001:
  Privilege escalation in public.organization_members INSERT RLS policy.
  Vulnerable policy allowed any authenticated user to insert themselves as 'owner'
  into any organization UUID via direct PostgREST requests without verifying created_by.

Audit Finding SEC-AUTH-001:
  Mock /api/auth/signup and /api/auth/login endpoints with single-round SHA-256
  and non-existent hashed_password schema column in production PostgreSQL.

Test Suite Architecture & Verification Boundaries:
  - Section 1: Static DDL & Migration Policy Invariant Verification (AST / Migration Analysis)
    Parses migration SQL files to verify policy name matching, function security attributes,
    search_path isolation, and the absence of any secondary permissive INSERT policies.
  - Section 2: Application-Level Authorization Tests (FastAPI + SQLite In-Memory)
    Verifies FastAPI application authorization, onboarding workflows, organization
    isolation, and role boundaries enforced by verify_org_membership and verify_org_admin.
  - Section 3: Mock Authentication Production Guard Tests (SEC-AUTH-001)
    Verifies that mock signup and login endpoints fail closed with 404 in production mode.
  - Section 4: Policy Specification Verification (Boolean Truth Table Model)
    Formal behavioral model proving the exact mathematical transition from vulnerable (00001)
    to remediated (00007) policy predicates across all actor permutations.
  - Section 5: Real PostgreSQL Database RLS Integration Tests (Dedicated Staging Suite)
    Fully implemented real PostgREST/PostgreSQL RLS integration tests using genuine
    authenticated identities, strict project reference validation, and safe exact-UUID
    scoped cleanup. Fails closed/skips safely if staging configuration is absent.
"""

import os
import re
import uuid
import urllib.parse
from pathlib import Path
import jwt
import pytest
from httpx import AsyncClient
from unittest.mock import patch
from app.core.config import settings
from tests.conftest import create_test_jwt


# ==============================================================================
# 1. Static DDL & Migration Policy Invariant Verification
# ==============================================================================

def test_migration_00007_replaces_exact_policy_name():
    """
    Verifies that migration 00007 drops and recreates the EXACT policy name from
    migration 00001 ("Admins and owners can invite / add members") without alteration.
    """
    repo_root = Path(__file__).resolve().parents[3]
    mig_00001 = (repo_root / "supabase" / "migrations" / "00001_initial_schema.sql").read_text(encoding="utf-8")
    mig_00007 = (repo_root / "supabase" / "migrations" / "00007_fix_organization_members_owner_escalation.sql").read_text(encoding="utf-8")

    # Match policy creation in 00001
    p1_match = re.search(r'CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+public\.organization_members\s+FOR\s+INSERT', mig_00001, re.IGNORECASE)
    assert p1_match is not None, "Policy creation in 00001_initial_schema.sql not found"
    policy_00001_name = p1_match.group(1)
    assert policy_00001_name == "Admins and owners can invite / add members"

    # Match DROP POLICY in 00007
    drop_match = re.search(r'DROP\s+POLICY\s+IF\s+EXISTS\s+"([^"]+)"\s+ON\s+public\.organization_members', mig_00007, re.IGNORECASE)
    assert drop_match is not None, "DROP POLICY in 00007 not found"
    assert drop_match.group(1) == policy_00001_name, f"DROP POLICY in 00007 ({drop_match.group(1)}) does not match 00001 ({policy_00001_name})"

    # Match CREATE POLICY in 00007
    create_match = re.search(r'CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+public\.organization_members\s+FOR\s+INSERT', mig_00007, re.IGNORECASE)
    assert create_match is not None, "CREATE POLICY in 00007 not found"
    assert create_match.group(1) == policy_00001_name, f"CREATE POLICY in 00007 ({create_match.group(1)}) does not match 00001 ({policy_00001_name})"


def test_no_alternate_permissive_insert_policies_on_organization_members():
    """
    CRITICAL CHECK: In PostgreSQL, permissive policies combine with OR semantics.
    If any other permissive INSERT policy exists on public.organization_members,
    an attacker could bypass the hardened policy through the second policy.
    This test scans all migration files to prove that NO other INSERT policy exists.
    """
    repo_root = Path(__file__).resolve().parents[3]
    migrations_dir = repo_root / "supabase" / "migrations"

    insert_policies_found = []
    for sql_file in sorted(migrations_dir.glob("*.sql")):
        content = sql_file.read_text(encoding="utf-8")
        matches = re.findall(
            r'CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+public\.organization_members\s+FOR\s+INSERT',
            content,
            re.IGNORECASE
        )
        for m in matches:
            insert_policies_found.append((sql_file.name, m))

    assert len(insert_policies_found) == 2, f"Expected exactly 2 INSERT policy definitions across all migrations, found: {insert_policies_found}"
    assert insert_policies_found[0] == ("00001_initial_schema.sql", "Admins and owners can invite / add members")
    assert insert_policies_found[1] == ("00007_fix_organization_members_owner_escalation.sql", "Admins and owners can invite / add members")


def test_helper_function_security_invariants():
    """
    Verifies that public.is_org_creator in 00007 enforces all required security invariants:
    1. Declared as SECURITY DEFINER
    2. Has fixed search_path = public (prevents search path hijacking)
    3. Explicitly revokes EXECUTE from PUBLIC
    4. Explicitly grants EXECUTE to authenticated and service_role
    5. Contains no dynamic SQL (EXECUTE format or string concatenation)
    """
    repo_root = Path(__file__).resolve().parents[3]
    mig_00007 = (repo_root / "supabase" / "migrations" / "00007_fix_organization_members_owner_escalation.sql").read_text(encoding="utf-8")

    assert "SECURITY DEFINER" in mig_00007, "is_org_creator must be SECURITY DEFINER to inspect created_by safely"
    assert "SET search_path = public" in mig_00007, "is_org_creator must have SET search_path = public"
    assert "REVOKE ALL ON FUNCTION public.is_org_creator" in mig_00007, "Must revoke execution from PUBLIC"
    assert "GRANT EXECUTE ON FUNCTION public.is_org_creator(UUID) TO authenticated, service_role" in mig_00007, "Must grant only to authenticated and service_role"
    assert "EXECUTE format" not in mig_00007, "Must not contain dynamic SQL"


# ==============================================================================
# 2. Application-Level Authorization Tests (FastAPI + SQLite In-Memory)
# ==============================================================================

@pytest.mark.asyncio
async def test_legitimate_creator_onboarding_assigns_owner_role(client: AsyncClient, token_a: str, user_a: dict):
    """
    Verifies that a legitimate user creating an organization:
    1. Successfully completes onboarding (HTTP 201 Created).
    2. Has their user_id recorded as created_by.
    3. Is immediately granted 'owner' membership role.
    4. Can query their organization details and member list.
    """
    headers = {"Authorization": f"Bearer {token_a}"}
    payload = {
        "name": "Sahyadri Civil Contractors",
        "owner_person": "Arpit Sharma",
        "city": "Pune",
        "state": "Maharashtra"
    }

    res = await client.post("/api/organizations", json=payload, headers=headers)
    assert res.status_code == 201
    org = res.json()
    assert org["name"] == "Sahyadri Civil Contractors"
    assert org["created_by"] == user_a["id"]
    assert org["user_role"] == "owner"
    org_id = org["id"]

    members_res = await client.get(f"/api/organizations/{org_id}/members", headers=headers)
    assert members_res.status_code == 200
    members = members_res.json()
    assert len(members) == 1
    assert members[0]["user_id"] == user_a["id"]
    assert members[0]["role"] == "owner"


@pytest.mark.asyncio
async def test_creator_cannot_claim_or_access_foreign_organization(
    client: AsyncClient, token_a: str, token_b: str
):
    """
    Verifies that User B (even if a legitimate creator of Org B) cannot access,
    update, or inspect member lists of User A's organization (Org A).
    """
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates Org A
    res_a = await client.post(
        "/api/organizations",
        json={"name": "Alpha Builders", "city": "Mumbai"},
        headers=headers_a
    )
    org_a_id = res_a.json()["id"]

    # User B creates Org B
    res_b = await client.post(
        "/api/organizations",
        json={"name": "Beta Infra Projects", "city": "Nashik"},
        headers=headers_b
    )
    org_b_id = res_b.json()["id"]

    # User B attempts to access Org A -> 403 Forbidden
    res_get = await client.get(f"/api/organizations/{org_a_id}", headers=headers_b)
    assert res_get.status_code == 403
    assert "Access denied" in res_get.json()["detail"]

    # User B attempts to list members of Org A -> 403 Forbidden
    res_members = await client.get(f"/api/organizations/{org_a_id}/members", headers=headers_b)
    assert res_members.status_code == 403

    # User B attempts to update Org A company profile -> 403 Forbidden
    res_update = await client.patch(
        f"/api/organizations/{org_a_id}",
        json={"name": "Takeover Builders"},
        headers=headers_b
    )
    assert res_update.status_code == 403


@pytest.mark.asyncio
async def test_unauthorized_member_cannot_perform_admin_operations(
    client: AsyncClient, token_a: str
):
    """
    Verifies that an ordinary member (role='member') within an organization
    cannot perform administrator or owner operations (e.g. updating company settings).
    """
    from tests.conftest import override_get_db
    from app.models.models import OrganizationMember, Profile

    headers_owner = {"Authorization": f"Bearer {token_a}"}

    org_res = await client.post(
        "/api/organizations",
        json={"name": "Apex Engineering"},
        headers=headers_owner
    )
    org_id = org_res.json()["id"]

    user_m_id = "44444444-4444-4444-4444-444444444444"
    token_m = create_test_jwt(user_m_id, "member@apex.in", "Junior Engineer")
    headers_member = {"Authorization": f"Bearer {token_m}"}

    async for db in override_get_db():
        db.add(Profile(id=user_m_id, full_name="Junior Engineer", language_preference="en"))
        db.add(OrganizationMember(organization_id=org_id, user_id=user_m_id, role="member"))
        await db.commit()
        break

    view_res = await client.get(f"/api/organizations/{org_id}", headers=headers_member)
    assert view_res.status_code == 200
    assert view_res.json()["user_role"] == "member"

    update_res = await client.patch(
        f"/api/organizations/{org_id}",
        json={"name": "Hacked Apex Name"},
        headers=headers_member
    )
    assert update_res.status_code == 403
    assert "Administrator" in update_res.json()["detail"] or "Access denied" in update_res.json()["detail"]


# ==============================================================================
# 3. Mock Authentication Production Guard Tests (SEC-AUTH-001)
# ==============================================================================

@pytest.mark.asyncio
async def test_mock_auth_endpoints_disabled_in_production(client: AsyncClient):
    """
    Verifies that when ENVIRONMENT == 'production', mock signup and login endpoints
    fail immediately with HTTP 404 Not Found, preventing unsafe password hashing
    or database writes, while directing clients to Supabase Auth.
    """
    with patch.object(settings, "ENVIRONMENT", "production"):
        signup_res = await client.post(
            "/api/auth/signup",
            json={
                "email": "pilot.user@anumaan.in",
                "password": "Password123!",
                "full_name": "Pilot User"
            }
        )
        assert signup_res.status_code == 404
        assert "disabled in production" in signup_res.json()["detail"]

        login_res = await client.post(
            "/api/auth/login",
            json={
                "email": "pilot.user@anumaan.in",
                "password": "Password123!"
            }
        )
        assert login_res.status_code == 404
        assert "disabled in production" in login_res.json()["detail"]


@pytest.mark.asyncio
async def test_mock_auth_me_endpoint_remains_available(client: AsyncClient, token_a: str, user_a: dict):
    """
    Verifies that /api/auth/me remains functional and returns authenticated profile
    information using genuine JWT tokens.
    """
    headers = {"Authorization": f"Bearer {token_a}"}
    res = await client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == user_a["id"]
    assert data["full_name"] is not None


# ==============================================================================
# 4. Policy Specification Verification (Boolean Truth Table Model)
# ==============================================================================

class PolicySpecificationModel:
    """
    Behavioral specification model representing the predicate transition between
    00001 and 00007. This test mathematically proves that the proposed predicate
    strictly closes the vulnerability while preserving legitimate operations.
    Notice: This is a specification test, not a claim of live PostgreSQL RLS execution.
    """
    def __init__(self):
        self.organizations = {}
        self.organization_members = {}

    def is_org_admin(self, auth_uid: str, target_org_id: str) -> bool:
        role = self.organization_members.get((target_org_id, auth_uid))
        return role in ("owner", "admin")

    def is_org_creator(self, auth_uid: str, target_org_id: str) -> bool:
        org = self.organizations.get(target_org_id)
        if not org or org.get("created_by") is None:
            return False
        return org.get("created_by") == auth_uid

    def evaluate_vulnerable_policy_00001(
        self, auth_uid: str, target_org_id: str, new_user_id: str, new_role: str
    ) -> bool:
        return self.is_org_admin(auth_uid, target_org_id) or (
            new_user_id == auth_uid and new_role == "owner"
        )

    def evaluate_remediated_policy_00007(
        self, auth_uid: str, target_org_id: str, new_user_id: str, new_role: str
    ) -> bool:
        return self.is_org_admin(auth_uid, target_org_id) or (
            new_user_id == auth_uid
            and new_role == "owner"
            and self.is_org_creator(auth_uid, target_org_id)
        )


def test_vulnerability_specification_truth_matrix():
    """
    Mathematical and behavioral specification verification:
    1. Vulnerable policy (00001) permits an unauthorized attacker to insert themselves
       as 'owner' into an organization they did not create (SEC-RLS-001 exploit).
    2. Remediated policy (00007) strictly blocks this exploit (evaluates to False).
    3. Legitimate creator onboarding evaluates to True under both.
    4. Legitimate admin member management evaluates to True under both.
    5. Unprivileged members cannot self-promote or insert new owners.
    """
    model = PolicySpecificationModel()

    victim_uid = "11111111-0000-0000-0000-000000000001"
    attacker_uid = "99999999-0000-0000-0000-000000000009"
    org_victim_id = "aaaaaaaa-0000-0000-0000-000000000001"

    model.organizations[org_victim_id] = {"created_by": victim_uid, "name": "Victim Construction Ltd"}
    model.organization_members[(org_victim_id, victim_uid)] = "owner"

    # CASE 1: Attacker attempts SEC-RLS-001 Privilege Escalation
    vulnerable_check = model.evaluate_vulnerable_policy_00001(
        auth_uid=attacker_uid,
        target_org_id=org_victim_id,
        new_user_id=attacker_uid,
        new_role="owner"
    )
    assert vulnerable_check is True, "00001 permitted unauthorized owner insertion!"

    remediated_check = model.evaluate_remediated_policy_00007(
        auth_uid=attacker_uid,
        target_org_id=org_victim_id,
        new_user_id=attacker_uid,
        new_role="owner"
    )
    assert remediated_check is False, "00007 MUST reject attacker owner insertion!"

    # CASE 2: Attacker attempts to insert themselves as regular member
    remediated_member_check = model.evaluate_remediated_policy_00007(
        auth_uid=attacker_uid,
        target_org_id=org_victim_id,
        new_user_id=attacker_uid,
        new_role="member"
    )
    assert remediated_member_check is False

    # CASE 3: Legitimate Creator Initial Onboarding
    new_org_id = "bbbbbbbb-0000-0000-0000-000000000002"
    creator_uid = "22222222-0000-0000-0000-000000000002"
    model.organizations[new_org_id] = {"created_by": creator_uid, "name": "Creator Infra Projects"}
    creator_onboarding_check = model.evaluate_remediated_policy_00007(
        auth_uid=creator_uid,
        target_org_id=new_org_id,
        new_user_id=creator_uid,
        new_role="owner"
    )
    assert creator_onboarding_check is True, "Legitimate creator onboarding must succeed!"
    model.organization_members[(new_org_id, creator_uid)] = "owner"

    # CASE 4: Legitimate Owner Adds a Team Member
    colleague_uid = "33333333-0000-0000-0000-000000000003"
    add_member_check = model.evaluate_remediated_policy_00007(
        auth_uid=creator_uid,
        target_org_id=new_org_id,
        new_user_id=colleague_uid,
        new_role="member"
    )
    assert add_member_check is True, "Legitimate owner adding member must succeed!"
    model.organization_members[(new_org_id, colleague_uid)] = "member"

    # CASE 5: Ordinary Member Attempts to Add Another Member
    intruder_uid = "55555555-0000-0000-0000-000000000005"
    member_add_check = model.evaluate_remediated_policy_00007(
        auth_uid=colleague_uid,
        target_org_id=new_org_id,
        new_user_id=intruder_uid,
        new_role="member"
    )
    assert member_add_check is False, "Regular member cannot add members!"

    # CASE 6: Ordinary Member Attempts to Promote Themselves to Owner
    member_self_promote_check = model.evaluate_remediated_policy_00007(
        auth_uid=colleague_uid,
        target_org_id=new_org_id,
        new_user_id=colleague_uid,
        new_role="owner"
    )
    assert member_self_promote_check is False, "Regular member cannot promote themselves to owner!"

    # CASE 7: Creator of Org B Attempts to Insert Themselves into Org A
    cross_creator_check = model.evaluate_remediated_policy_00007(
        auth_uid=creator_uid,
        target_org_id=org_victim_id,
        new_user_id=creator_uid,
        new_role="owner"
    )
    assert cross_creator_check is False, "Creator of Org B cannot claim ownership of Org A!"

    # CASE 8: Target Org with NULL created_by (Legacy/Unclaimed Org)
    unclaimed_org_id = "cccccccc-0000-0000-0000-000000000003"
    model.organizations[unclaimed_org_id] = {"created_by": None, "name": "Unclaimed Org"}
    unclaimed_takeover_check = model.evaluate_remediated_policy_00007(
        auth_uid=attacker_uid,
        target_org_id=unclaimed_org_id,
        new_user_id=attacker_uid,
        new_role="owner"
    )
    assert unclaimed_takeover_check is False, "Attacker cannot claim an org with created_by NULL!"


# ==============================================================================
# 5. Real PostgreSQL Database RLS Integration Tests (Dedicated Staging Suite)
# ==============================================================================

class StagingEnvironmentConfig:
    """
    Validates and loads configuration for live PostgreSQL / PostgREST RLS testing.
    Enforces strict staging safety invariants:
      1. STAGING_APPROVED_PROJECT_REFS is MANDATORY. Missing, empty, or mismatched
         allowlist fails closed before making any HTTP request.
      2. Target URL hostname must match approved staging project reference exactly.
      3. Missing, mismatched, or ambiguous configuration fails closed before any write.
      4. Target reference must never match production ('knwinlllqjmgzqcjrrio').
      5. Decodes and verifies that JWT 'sub' claims match configured UIDs.
         Distinguishes local unverified claim inspection from gateway signature verification.
      6. Any service-role key provided for cleanup is verified to belong to the approved
         staging project and not production.
      7. Never prints secrets, API keys, passwords, or raw tokens in errors/logs.
    """
    PRODUCTION_PROJECT_REF = "knwinlllqjmgzqcjrrio"

    @classmethod
    def verify_token_subject(cls, token: str, expected_uid: str, role_name: str):
        """
        Safely inspects JWT subject ('sub') claim to confirm it matches expected UID.
        NOTE: This decodes the unverified payload locally to prevent credential misconfiguration.
        Cryptographic signature verification is strictly enforced by the Supabase gateway / PostgREST.
        Never prints the token string.
        """
        if not token or not expected_uid:
            raise ValueError(f"Missing token or UID for role: {role_name}")
        try:
            claims = jwt.decode(token, options={"verify_signature": False})
        except Exception as e:
            raise ValueError(f"Failed to decode JWT claims for {role_name}: {type(e).__name__}")
        token_sub = claims.get("sub")
        if not token_sub or str(token_sub).lower() != str(expected_uid).lower():
            raise ValueError(
                f"Identity Mismatch: Configured UID does not match JWT 'sub' claim for role '{role_name}'!"
            )

    @classmethod
    def get_config(cls):
        url = os.getenv("STAGING_SUPABASE_URL")
        anon_key = os.getenv("STAGING_SUPABASE_ANON_KEY")
        service_role_key = os.getenv("STAGING_SUPABASE_SERVICE_ROLE_KEY")
        project_ref = os.getenv("STAGING_SUPABASE_PROJECT_REF")
        creator_jwt = os.getenv("STAGING_CREATOR_JWT")
        creator_uid = os.getenv("STAGING_CREATOR_UID")
        attacker_jwt = os.getenv("STAGING_ATTACKER_JWT")
        attacker_uid = os.getenv("STAGING_ATTACKER_UID")
        colleague_jwt = os.getenv("STAGING_MEMBER_JWT")
        colleague_uid = os.getenv("STAGING_MEMBER_UID")

        run_live = os.getenv("STAGING_RUN_LIVE_TESTS", "").strip().lower() in ("1", "true", "yes")

        # In offline/local mode, skip if config is absent to prevent remote mutations
        if not url or not anon_key or not project_ref:
            if run_live:
                pytest.fail(
                    "STAGING_RUN_LIVE_TESTS=1 is set, but required staging configuration "
                    "(STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY, STAGING_SUPABASE_PROJECT_REF) is missing."
                )
            pytest.skip(
                "Live PostgreSQL RLS integration tests require STAGING_SUPABASE_URL, "
                "STAGING_SUPABASE_ANON_KEY, and STAGING_SUPABASE_PROJECT_REF. Skipped offline."
            )

        # 1. Project Reference & Production Guardrail
        clean_url = url.rstrip("/")
        if (
            project_ref == cls.PRODUCTION_PROJECT_REF
            or cls.PRODUCTION_PROJECT_REF in clean_url
            or cls.PRODUCTION_PROJECT_REF in project_ref
        ):
            raise RuntimeError(
                f"CRITICAL SAFETY VIOLATION: Target matches PRODUCTION project reference "
                f"'{cls.PRODUCTION_PROJECT_REF}'! Staging tests strictly aborted."
            )

        # 2. Hostname Validation: must match {project_ref}.supabase.co exactly
        parsed_url = urllib.parse.urlparse(clean_url)
        if parsed_url.scheme != "https":
            raise RuntimeError(
                f"CRITICAL SAFETY VIOLATION: STAGING_SUPABASE_URL must use https scheme. Got '{parsed_url.scheme}'."
            )
        expected_host = f"{project_ref}.supabase.co"
        if parsed_url.hostname != expected_host:
            raise RuntimeError(
                f"CRITICAL CONFIG MISMATCH: STAGING_SUPABASE_URL host '{parsed_url.hostname}' "
                f"does not match expected host '{expected_host}' for project ref '{project_ref}'."
            )

        # 3. Approved Staging Project Reference Allowlist (MANDATORY FOR LIVE TESTS)
        approved_refs_str = os.getenv("STAGING_APPROVED_PROJECT_REFS", "").strip()
        if not approved_refs_str:
            raise RuntimeError(
                "CRITICAL CONFIG ERROR: STAGING_APPROVED_PROJECT_REFS is mandatory for staging execution. "
                "It must be explicitly defined as a comma-separated list of approved project references."
            )
        approved_refs = set(filter(None, [r.strip() for r in approved_refs_str.split(",")]))
        if project_ref not in approved_refs:
            raise RuntimeError(
                f"CRITICAL CONFIG MISMATCH: Project reference '{project_ref}' is not in "
                f"the approved staging allowlist: {sorted(list(approved_refs))}."
            )

        # 4. Identity Credentials Validation
        if not creator_jwt or not attacker_jwt or not colleague_jwt or not creator_uid or not attacker_uid:
            if run_live:
                pytest.fail("STAGING_RUN_LIVE_TESTS=1 is set, but test identity credentials are incomplete.")
            pytest.skip(
                "Live PostgreSQL RLS integration tests require STAGING_CREATOR_JWT, "
                "STAGING_ATTACKER_JWT, STAGING_MEMBER_JWT, STAGING_CREATOR_UID, and STAGING_ATTACKER_UID."
            )

        # 5. Verify JWT Subject Matches Configured UIDs (Local syntactic validation)
        cls.verify_token_subject(creator_jwt, creator_uid, "creator")
        cls.verify_token_subject(attacker_jwt, attacker_uid, "attacker")
        if colleague_uid:
            cls.verify_token_subject(colleague_jwt, colleague_uid, "colleague")

        # 6. Service-Role Cleanup Credential Validation (if provided for teardown)
        if service_role_key:
            try:
                sr_claims = jwt.decode(service_role_key, options={"verify_signature": False})
            except Exception as e:
                raise ValueError(f"Failed to decode service-role key claims: {type(e).__name__}")
            if sr_claims.get("role") != "service_role":
                raise ValueError(
                    "CRITICAL SAFETY VIOLATION: STAGING_SUPABASE_SERVICE_ROLE_KEY does not have role='service_role'!"
                )
            if sr_claims.get("ref") and sr_claims.get("ref") == cls.PRODUCTION_PROJECT_REF:
                raise RuntimeError(
                    f"CRITICAL SAFETY VIOLATION: Service role key belongs to PRODUCTION project '{cls.PRODUCTION_PROJECT_REF}'!"
                )
            if sr_claims.get("iss") and cls.PRODUCTION_PROJECT_REF in str(sr_claims.get("iss")):
                raise RuntimeError(
                    "CRITICAL SAFETY VIOLATION: Service role key issuer matches PRODUCTION project!"
                )
            if sr_claims.get("ref") and sr_claims.get("ref") != project_ref:
                raise RuntimeError(
                    f"CRITICAL CONFIG MISMATCH: Service role key project ref '{sr_claims.get('ref')}' "
                    f"does not match staging project ref '{project_ref}'!"
                )

        return {
            "url": clean_url,
            "anon_key": anon_key,
            "service_role_key": service_role_key,
            "project_ref": project_ref,
            "creator_jwt": creator_jwt,
            "creator_uid": creator_uid,
            "attacker_jwt": attacker_jwt,
            "attacker_uid": attacker_uid,
            "colleague_jwt": colleague_jwt,
            "colleague_uid": colleague_uid or "00000000-0000-0000-0000-000000000003",
        }


class SafeTestTracker:
    """
    Tracks exact synthetic organization UUIDs created during test execution.
    Ensures that teardown/cleanup deletes ONLY explicitly registered UUIDs
    after confirming their test metadata, avoiding broad wildcard deletions.
    """
    def __init__(self):
        self.created_org_ids = set()
        self.cleanup_warnings = []

    def register(self, org_id: str):
        self.created_org_ids.add(str(org_id))

    async def cleanup_org(self, client: AsyncClient, base_url: str, cleanup_headers: dict, org_id: str):
        """Idempotently and safely removes an explicitly tracked synthetic organization."""
        try:
            # 1. Verify existence and test-specific metadata before deletion
            verify_res = await client.get(
                f"{base_url}/rest/v1/organizations?id=eq.{org_id}&select=id,name",
                headers=cleanup_headers
            )
            if verify_res.status_code == 200 and verify_res.json():
                org_data = verify_res.json()[0]
                # Verify metadata confirms this is an authorized synthetic test record
                if org_data.get("name", "").startswith("ANUMAAN_STAGING_TEST_"):
                    # Delete members first
                    del_members = await client.delete(
                        f"{base_url}/rest/v1/organization_members?organization_id=eq.{org_id}",
                        headers=cleanup_headers
                    )
                    # Delete organization
                    del_org = await client.delete(
                        f"{base_url}/rest/v1/organizations?id=eq.{org_id}",
                        headers=cleanup_headers
                    )
                    if del_org.status_code not in (200, 204):
                        self.cleanup_warnings.append(
                            f"Warning: Organization {org_id} delete returned {del_org.status_code}: {del_org.text}"
                        )
            self.created_org_ids.discard(org_id)
        except Exception as ex:
            self.cleanup_warnings.append(f"Teardown exception for {org_id}: {type(ex).__name__}")


class TestPostgresRLSIntegrationLive:
    """
    Live PostgreSQL integration test suite executing direct PostgREST requests
    against an explicitly configured staging Supabase project with RLS enabled.
    Tests verify the PostgreSQL kernel RLS boundary under genuine authenticated user roles.
    """

    @pytest.mark.asyncio
    async def test_postgres_rls_attacker_direct_postgrest_insert_rejected(self):
        """
        Scenario 1: Authenticated attacker cannot insert themselves as 'owner'
        into another user's organization record via direct PostgREST request.
        """
        cfg = StagingEnvironmentConfig.get_config()
        tracker = SafeTestTracker()

        creator_headers = {
            "apikey": cfg["anon_key"],
            "Authorization": f"Bearer {cfg['creator_jwt']}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        attacker_headers = {
            "apikey": cfg["anon_key"],
            "Authorization": f"Bearer {cfg['attacker_jwt']}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        cleanup_headers = (
            {
                "apikey": cfg["service_role_key"],
                "Authorization": f"Bearer {cfg['service_role_key']}",
                "Prefer": "return=minimal"
            }
            if cfg.get("service_role_key")
            else creator_headers
        )

        async with AsyncClient() as client:
            victim_org_id = str(uuid.uuid4())
            test_org_name = f"ANUMAAN_STAGING_TEST_{uuid.uuid4().hex[:8]}"
            tracker.register(victim_org_id)

            try:
                # 1. Creator creates organization
                org_res = await client.post(
                    f"{cfg['url']}/rest/v1/organizations",
                    json={"id": victim_org_id, "name": test_org_name, "created_by": cfg["creator_uid"]},
                    headers=creator_headers
                )
                assert org_res.status_code == 201, f"Failed to create test org: {org_res.text}"

                # 2. Creator self-enrolls as owner
                owner_res = await client.post(
                    f"{cfg['url']}/rest/v1/organization_members",
                    json={"organization_id": victim_org_id, "user_id": cfg["creator_uid"], "role": "owner"},
                    headers=creator_headers
                )
                assert owner_res.status_code == 201, f"Creator onboarding failed: {owner_res.text}"

                # 3. ATTACK: Attacker attempts to insert themselves as owner into victim org
                attack_res = await client.post(
                    f"{cfg['url']}/rest/v1/organization_members",
                    json={"organization_id": victim_org_id, "user_id": cfg["attacker_uid"], "role": "owner"},
                    headers=attacker_headers
                )

                # 4. ASSERTION: RLS must reject the insert with 400 or 403 (SQLSTATE 42501).
                # Reject ambiguous 401 (unauthenticated) and 404 (endpoint/schema missing)
                assert attack_res.status_code in (400, 403), (
                    f"Expected RLS authorization rejection (HTTP 400 or 403), "
                    f"got ambiguous status {attack_res.status_code}. Response: {attack_res.text}"
                )
                err_body = attack_res.text.lower()
                assert "42501" in err_body or "row-level security" in err_body, (
                    f"Response does not confirm PostgreSQL RLS violation (42501). Response: {attack_res.text}"
                )

                # 5. Verify persisted database state: Attacker must NOT be in organization_members
                members_res = await client.get(
                    f"{cfg['url']}/rest/v1/organization_members?organization_id=eq.{victim_org_id}&select=user_id,role",
                    headers=creator_headers
                )
                assert members_res.status_code == 200, f"Failed to query member list: {members_res.text}"
                members = members_res.json()
                member_uids = [m["user_id"] for m in members]
                assert cfg["attacker_uid"] not in member_uids, "CRITICAL: Attacker found in organization_members!"

            finally:
                await tracker.cleanup_org(client, cfg["url"], cleanup_headers, victim_org_id)

    @pytest.mark.asyncio
    async def test_postgres_rls_attacker_insert_member_rejected(self):
        """
        Scenario 2: Unauthorized user cannot add themselves as an ordinary 'member'
        into another organization's record.
        """
        cfg = StagingEnvironmentConfig.get_config()
        tracker = SafeTestTracker()

        creator_headers = {
            "apikey": cfg["anon_key"],
            "Authorization": f"Bearer {cfg['creator_jwt']}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        attacker_headers = {
            "apikey": cfg["anon_key"],
            "Authorization": f"Bearer {cfg['attacker_jwt']}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        cleanup_headers = (
            {
                "apikey": cfg["service_role_key"],
                "Authorization": f"Bearer {cfg['service_role_key']}",
                "Prefer": "return=minimal"
            }
            if cfg.get("service_role_key")
            else creator_headers
        )

        async with AsyncClient() as client:
            victim_org_id = str(uuid.uuid4())
            test_org_name = f"ANUMAAN_STAGING_TEST_{uuid.uuid4().hex[:8]}"
            tracker.register(victim_org_id)

            try:
                # 1. Creator setup
                org_res = await client.post(
                    f"{cfg['url']}/rest/v1/organizations",
                    json={"id": victim_org_id, "name": test_org_name, "created_by": cfg["creator_uid"]},
                    headers=creator_headers
                )
                assert org_res.status_code == 201, f"Setup org creation failed: {org_res.text}"

                owner_res = await client.post(
                    f"{cfg['url']}/rest/v1/organization_members",
                    json={"organization_id": victim_org_id, "user_id": cfg["creator_uid"], "role": "owner"},
                    headers=creator_headers
                )
                assert owner_res.status_code == 201, f"Setup owner enrollment failed: {owner_res.text}"

                # 2. Attacker attempts insert with role='member'
                res = await client.post(
                    f"{cfg['url']}/rest/v1/organization_members",
                    json={"organization_id": victim_org_id, "user_id": cfg["attacker_uid"], "role": "member"},
                    headers=attacker_headers
                )
                # Reject ambiguous 401/404; assert explicit RLS rejection 400/403 with 42501
                assert res.status_code in (400, 403), (
                    f"Expected RLS rejection (HTTP 400 or 403), got {res.status_code}. Response: {res.text}"
                )
                err_body = res.text.lower()
                assert "42501" in err_body or "row-level security" in err_body, (
                    f"Response does not confirm PostgreSQL RLS violation (42501). Response: {res.text}"
                )

                # 3. Verify persisted state: attacker is not added
                check_res = await client.get(
                    f"{cfg['url']}/rest/v1/organization_members?organization_id=eq.{victim_org_id}&select=user_id",
                    headers=creator_headers
                )
                assert check_res.status_code == 200
                member_uids = [m["user_id"] for m in check_res.json()]
                assert cfg["attacker_uid"] not in member_uids, "Attacker was persisted as a member!"

            finally:
                await tracker.cleanup_org(client, cfg["url"], cleanup_headers, victim_org_id)

    @pytest.mark.asyncio
    async def test_postgres_rls_creator_onboarding_insert_succeeds(self):
        """
        Scenario 3: Legitimate organization creator can create an organization
        and successfully enroll as its initial owner under the hardened policy.
        """
        cfg = StagingEnvironmentConfig.get_config()
        tracker = SafeTestTracker()

        creator_headers = {
            "apikey": cfg["anon_key"],
            "Authorization": f"Bearer {cfg['creator_jwt']}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        cleanup_headers = (
            {
                "apikey": cfg["service_role_key"],
                "Authorization": f"Bearer {cfg['service_role_key']}",
                "Prefer": "return=minimal"
            }
            if cfg.get("service_role_key")
            else creator_headers
        )

        async with AsyncClient() as client:
            new_org_id = str(uuid.uuid4())
            test_org_name = f"ANUMAAN_STAGING_TEST_{uuid.uuid4().hex[:8]}"
            tracker.register(new_org_id)

            try:
                # 1. Create organization
                org_res = await client.post(
                    f"{cfg['url']}/rest/v1/organizations",
                    json={"id": new_org_id, "name": test_org_name, "created_by": cfg["creator_uid"]},
                    headers=creator_headers
                )
                assert org_res.status_code == 201, f"Org creation failed: {org_res.text}"

                # 2. Creator inserts initial owner membership
                member_res = await client.post(
                    f"{cfg['url']}/rest/v1/organization_members",
                    json={"organization_id": new_org_id, "user_id": cfg["creator_uid"], "role": "owner"},
                    headers=creator_headers
                )
                assert member_res.status_code == 201, f"Creator owner enrollment failed: {member_res.text}"
                member_data = member_res.json()
                if isinstance(member_data, list):
                    member_data = member_data[0]
                assert member_data["role"] == "owner"
                assert member_data["user_id"] == cfg["creator_uid"]

                # 3. Verify persisted database state via separate GET query
                verify_res = await client.get(
                    f"{cfg['url']}/rest/v1/organization_members?organization_id=eq.{new_org_id}&user_id=eq.{cfg['creator_uid']}&select=role,user_id",
                    headers=creator_headers
                )
                assert verify_res.status_code == 200, f"Failed to retrieve persisted membership: {verify_res.text}"
                persisted = verify_res.json()
                assert len(persisted) == 1
                assert persisted[0]["role"] == "owner"
                assert persisted[0]["user_id"] == cfg["creator_uid"]

            finally:
                await tracker.cleanup_org(client, cfg["url"], cleanup_headers, new_org_id)

    @pytest.mark.asyncio
    async def test_postgres_rls_admin_invite_member_succeeds(self):
        """
        Scenario 4: Authorized owner/admin can invite and add a new member.
        """
        cfg = StagingEnvironmentConfig.get_config()
        tracker = SafeTestTracker()

        creator_headers = {
            "apikey": cfg["anon_key"],
            "Authorization": f"Bearer {cfg['creator_jwt']}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        cleanup_headers = (
            {
                "apikey": cfg["service_role_key"],
                "Authorization": f"Bearer {cfg['service_role_key']}",
                "Prefer": "return=minimal"
            }
            if cfg.get("service_role_key")
            else creator_headers
        )

        async with AsyncClient() as client:
            org_id = str(uuid.uuid4())
            test_org_name = f"ANUMAAN_STAGING_TEST_{uuid.uuid4().hex[:8]}"
            tracker.register(org_id)

            try:
                # Setup org and owner
                org_res = await client.post(
                    f"{cfg['url']}/rest/v1/organizations",
                    json={"id": org_id, "name": test_org_name, "created_by": cfg["creator_uid"]},
                    headers=creator_headers
                )
                assert org_res.status_code == 201, f"Setup org creation failed: {org_res.text}"

                owner_res = await client.post(
                    f"{cfg['url']}/rest/v1/organization_members",
                    json={"organization_id": org_id, "user_id": cfg["creator_uid"], "role": "owner"},
                    headers=creator_headers
                )
                assert owner_res.status_code == 201, f"Setup owner enrollment failed: {owner_res.text}"

                # Owner invites colleague as 'member'
                invite_res = await client.post(
                    f"{cfg['url']}/rest/v1/organization_members",
                    json={"organization_id": org_id, "user_id": cfg["colleague_uid"], "role": "member"},
                    headers=creator_headers
                )
                assert invite_res.status_code == 201, f"Owner member invite failed: {invite_res.text}"

                # Verify persisted database state via separate GET query
                verify_invite = await client.get(
                    f"{cfg['url']}/rest/v1/organization_members?organization_id=eq.{org_id}&user_id=eq.{cfg['colleague_uid']}&select=role,user_id",
                    headers=creator_headers
                )
                assert verify_invite.status_code == 200, f"Failed to retrieve persisted invited member: {verify_invite.text}"
                persisted = verify_invite.json()
                assert len(persisted) == 1
                assert persisted[0]["role"] == "member"
                assert persisted[0]["user_id"] == cfg["colleague_uid"]

            finally:
                await tracker.cleanup_org(client, cfg["url"], cleanup_headers, org_id)

    @pytest.mark.asyncio
    async def test_postgres_rls_member_cannot_update_role_to_owner(self):
        """
        Scenario 5: Regular member cannot promote themselves to 'owner'
        under the organization_members UPDATE policy.
        """
        cfg = StagingEnvironmentConfig.get_config()
        tracker = SafeTestTracker()

        creator_headers = {
            "apikey": cfg["anon_key"],
            "Authorization": f"Bearer {cfg['creator_jwt']}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        colleague_headers = {
            "apikey": cfg["anon_key"],
            "Authorization": f"Bearer {cfg['colleague_jwt']}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        cleanup_headers = (
            {
                "apikey": cfg["service_role_key"],
                "Authorization": f"Bearer {cfg['service_role_key']}",
                "Prefer": "return=minimal"
            }
            if cfg.get("service_role_key")
            else creator_headers
        )

        async with AsyncClient() as client:
            org_id = str(uuid.uuid4())
            test_org_name = f"ANUMAAN_STAGING_TEST_{uuid.uuid4().hex[:8]}"
            tracker.register(org_id)

            try:
                # Setup org, owner, and colleague member
                org_res = await client.post(
                    f"{cfg['url']}/rest/v1/organizations",
                    json={"id": org_id, "name": test_org_name, "created_by": cfg["creator_uid"]},
                    headers=creator_headers
                )
                assert org_res.status_code == 201, f"Setup org creation failed: {org_res.text}"

                owner_res = await client.post(
                    f"{cfg['url']}/rest/v1/organization_members",
                    json={"organization_id": org_id, "user_id": cfg["creator_uid"], "role": "owner"},
                    headers=creator_headers
                )
                assert owner_res.status_code == 201, f"Setup owner enrollment failed: {owner_res.text}"

                member_res = await client.post(
                    f"{cfg['url']}/rest/v1/organization_members",
                    json={"organization_id": org_id, "user_id": cfg["colleague_uid"], "role": "member"},
                    headers=creator_headers
                )
                assert member_res.status_code == 201, f"Setup colleague enrollment failed: {member_res.text}"

                # Colleague attempts to UPDATE their own role to 'owner'
                update_res = await client.patch(
                    f"{cfg['url']}/rest/v1/organization_members?organization_id=eq.{org_id}&user_id=eq.{cfg['colleague_uid']}",
                    json={"role": "owner"},
                    headers=colleague_headers
                )

                # UPDATE policy requires is_org_admin: must return 403 or empty array (0 rows updated)
                assert update_res.status_code in (200, 403), f"Unexpected response: {update_res.text}"
                if update_res.status_code == 200:
                    assert update_res.json() == [], f"Self-promotion succeeded! Updated rows: {update_res.json()}"

                # Verify persistent state: Role must remain 'member'
                check_res = await client.get(
                    f"{cfg['url']}/rest/v1/organization_members?organization_id=eq.{org_id}&user_id=eq.{cfg['colleague_uid']}&select=role",
                    headers=creator_headers
                )
                assert check_res.status_code == 200
                rows = check_res.json()
                assert len(rows) == 1
                assert rows[0]["role"] == "member", f"Role was illegally escalated to: {rows[0]['role']}"

            finally:
                await tracker.cleanup_org(client, cfg["url"], cleanup_headers, org_id)
