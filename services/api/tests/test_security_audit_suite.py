import time
import pytest
import jwt
from unittest.mock import MagicMock, patch, AsyncMock
from httpx import AsyncClient
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException
from jwt import PyJWKClientError

from app.core.config import settings, Settings
from app.core.security import decode_access_token
from app.models.models import Organization, OrganizationMember, Client, Project, Estimate, BOQItem, Quotation


# ==============================================================================
# 1. Advanced JWT & JWKS Cryptographic Security Tests
# ==============================================================================

def test_jwks_outage_or_timeout_fails_closed():
    """
    Verifies that when the Supabase JWKS endpoint is unreachable (e.g. network timeout or 500),
    the system fails closed with HTTP 401 and does not accept the token.
    """
    mock_jwk_client = MagicMock()
    mock_jwk_client.get_signing_key_from_jwt.side_effect = PyJWKClientError("Connection timed out after 30s")

    private_key = ec.generate_private_key(ec.SECP256R1())
    token = jwt.encode(
        {"sub": "user-outage-test", "aud": "authenticated", "exp": int(time.time()) + 3600},
        private_key,
        algorithm="ES256",
        headers={"kid": "unknown-kid-1"}
    )

    with pytest.raises(HTTPException) as exc:
        decode_access_token(token, custom_jwks_client=mock_jwk_client)
    assert exc.value.status_code == 401
    assert "jwks" in exc.value.detail.lower() or "signing key" in exc.value.detail.lower()


def test_unknown_kid_fails_closed():
    """
    Verifies that an unknown key ID (kid) that cannot be found in JWKS fails closed.
    """
    mock_jwk_client = MagicMock()
    mock_jwk_client.get_signing_key_from_jwt.side_effect = PyJWKClientError('Unable to find a signing key that matches: "fake-kid"')

    private_key = ec.generate_private_key(ec.SECP256R1())
    token = jwt.encode(
        {"sub": "user-fake-kid", "aud": "authenticated", "exp": int(time.time()) + 3600},
        private_key,
        algorithm="ES256",
        headers={"kid": "fake-kid"}
    )

    with pytest.raises(HTTPException) as exc:
        decode_access_token(token, custom_jwks_client=mock_jwk_client)
    assert exc.value.status_code == 401
    assert "fake-kid" in exc.value.detail or "failed to obtain jwks" in exc.value.detail.lower()


def test_key_rotation_cache_refresh():
    """
    Verifies that when a token arrives with a rotated key ID, the JWKS client resolves
    the new key and successfully authenticates the user.
    """
    key_v1 = ec.generate_private_key(ec.SECP256R1())
    key_v2 = ec.generate_private_key(ec.SECP256R1())

    mock_jwk_client = MagicMock()

    def get_key_side_effect(token_str):
        hdr = jwt.get_unverified_header(token_str)
        signing_key = MagicMock()
        if hdr.get("kid") == "key-v1":
            signing_key.key = key_v1.public_key()
        elif hdr.get("kid") == "key-v2":
            signing_key.key = key_v2.public_key()
        else:
            raise PyJWKClientError("Unknown key")
        return signing_key

    mock_jwk_client.get_signing_key_from_jwt.side_effect = get_key_side_effect

    # Token with new rotated key
    token_v2 = jwt.encode(
        {"sub": "user-rotated-key", "aud": "authenticated", "exp": int(time.time()) + 3600},
        key_v2,
        algorithm="ES256",
        headers={"kid": "key-v2"}
    )

    payload = decode_access_token(token_v2, custom_jwks_client=mock_jwk_client)
    assert payload["sub"] == "user-rotated-key"


def test_algorithm_confusion_attack_blocked():
    """
    Verifies that algorithm confusion attacks (e.g. attempting to verify an HMAC token
    using the public key or passing 'none'/'HS256' with public key material) are rejected.
    """
    # Attacker attempts to use HS256 with an arbitrary secret
    malicious_token = jwt.encode(
        {"sub": "user-forged", "aud": "authenticated", "exp": int(time.time()) + 3600},
        "attacker-chosen-secret-that-does-not-match-supabase",
        algorithm="HS256"
    )

    with pytest.raises(HTTPException) as exc:
        decode_access_token(malicious_token)
    assert exc.value.status_code == 401


# ==============================================================================
# 2. Multi-Tenant Cross-Organization & Privilege Escalation Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_cross_tenant_boq_and_quotation_isolation(client: AsyncClient, token_a: str, token_b: str):
    """
    Sets up two isolated organizations (Org A and Org B).
    Verifies that User B (Org B) cannot:
    1. Read Org A's estimate or BOQ items
    2. Add or modify BOQ items in Org A's estimate
    3. Delete BOQ items in Org A's estimate
    4. Duplicate Org A's quotation into Org B
    5. Issue Org A's quotation
    6. Download Org A's quotation PDF or Excel
    """
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Setup Org A
    org_a_res = await client.post("/api/organizations", json={"name": "Org A Construction"}, headers=headers_a)
    org_a_id = org_a_res.json()["id"]

    p_a = await client.post(f"/api/organizations/{org_a_id}/projects", json={"name": "Tower A"}, headers=headers_a)
    proj_a_id = p_a.json()["id"]

    est_a = await client.post(
        f"/api/organizations/{org_a_id}/estimates",
        json={"name": "Estimate A", "project_id": proj_a_id},
        headers=headers_a
    )
    est_a_id = est_a.json()["id"]

    item_a = await client.post(
        f"/api/organizations/{org_a_id}/estimates/{est_a_id}/items",
        json={"item_number": "1.0", "description": "Secret Item A", "quantity": 10.0, "unit_rate": 1000.0, "unit": "cum"},
        headers=headers_a
    )
    item_a_id = item_a.json()["id"]

    quote_a = await client.post(
        f"/api/organizations/{org_a_id}/quotations",
        json={"estimate_id": est_a_id, "quotation_number": "QT-SEC-001"},
        headers=headers_a
    )
    quote_a_id = quote_a.json()["id"]

    # Setup Org B
    org_b_res = await client.post("/api/organizations", json={"name": "Org B Competitors"}, headers=headers_b)
    org_b_id = org_b_res.json()["id"]

    # --- ATTACK 1: User B tries to read Org A's estimate directly ---
    res1 = await client.get(f"/api/organizations/{org_a_id}/estimates/{est_a_id}", headers=headers_b)
    assert res1.status_code == 403, "User B should be forbidden from accessing Org A endpoint"

    # --- ATTACK 2: User B tries to read Org A's estimate by substituting Org B in URL ---
    res2 = await client.get(f"/api/organizations/{org_b_id}/estimates/{est_a_id}", headers=headers_b)
    assert res2.status_code == 404, "Estimate A should not be found in Org B"

    # --- ATTACK 3: User B tries to add a BOQ item to Org A's estimate ---
    res3 = await client.post(
        f"/api/organizations/{org_b_id}/estimates/{est_a_id}/items",
        json={"item_number": "9.9", "description": "Injected item", "quantity": 1.0, "unit_rate": 100.0, "unit": "m"},
        headers=headers_b
    )
    assert res3.status_code == 404

    # --- ATTACK 4: User B tries to delete Org A's BOQ item ---
    res4 = await client.delete(
        f"/api/organizations/{org_b_id}/estimates/{est_a_id}/items/{item_a_id}",
        headers=headers_b
    )
    assert res4.status_code == 404

    # --- ATTACK 5: User B tries to duplicate Org A's quotation ---
    res5 = await client.post(
        f"/api/organizations/{org_b_id}/quotations/{quote_a_id}/duplicate",
        headers=headers_b
    )
    assert res5.status_code == 404

    # --- ATTACK 6: User B tries to issue Org A's quotation ---
    res6 = await client.post(
        f"/api/organizations/{org_a_id}/quotations/{quote_a_id}/issue",
        json={"confirm_tax_configured": True, "tax_rate": 18.0},
        headers=headers_b
    )
    assert res6.status_code == 403

    # --- ATTACK 7: User B tries to download Org A's quotation PDF ---
    res7 = await client.get(
        f"/api/organizations/{org_a_id}/quotations/{quote_a_id}/pdf",
        headers=headers_b
    )
    assert res7.status_code == 403

    # --- ATTACK 8: User B tries to download Org A's quotation Excel ---
    res8 = await client.get(
        f"/api/organizations/{org_a_id}/quotations/{quote_a_id}/excel",
        headers=headers_b
    )
    assert res8.status_code == 403


@pytest.mark.asyncio
async def test_role_privilege_escalation_blocked(client: AsyncClient, token_a: str):
    """
    Verifies that a regular 'member' (non-admin, non-owner) is strictly forbidden from:
    1. Deleting an estimate
    2. Deleting a client
    3. Updating organization company profile
    """
    from tests.conftest import create_test_jwt

    headers_owner = {"Authorization": f"Bearer {token_a}"}

    # Create Org with User A as owner
    org_res = await client.post("/api/organizations", json={"name": "Privilege Test Infra"}, headers=headers_owner)
    org_id = org_res.json()["id"]

    # Create a regular member User C in database
    user_c_id = "33333333-3333-3333-3333-333333333333"
    token_c = create_test_jwt(user_c_id, "user.c@privilege.in", "Regular Member")
    headers_member = {"Authorization": f"Bearer {token_c}"}

    # Add User C as a 'member' (not admin/owner) to Org in DB
    from app.core.database import get_db
    from tests.conftest import override_get_db
    from app.models.models import OrganizationMember, Profile

    async for db in override_get_db():
        # Ensure Profile exists for C
        p_c = await db.get(Profile, user_c_id)
        if not p_c:
            db.add(Profile(id=user_c_id, full_name="Regular Member", language_preference="en"))
        db.add(OrganizationMember(organization_id=org_id, user_id=user_c_id, role="member"))
        await db.commit()
        break

    # Owner creates a client and estimate
    c_res = await client.post(
        f"/api/organizations/{org_id}/clients",
        json={"name": "Client VIP", "email": "vip@client.in"},
        headers=headers_owner
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        f"/api/organizations/{org_id}/projects",
        json={"name": "Project VIP", "client_id": client_id},
        headers=headers_owner
    )
    proj_id = p_res.json()["id"]

    est_res = await client.post(
        f"/api/organizations/{org_id}/estimates",
        json={"name": "Estimate VIP", "project_id": proj_id},
        headers=headers_owner
    )
    est_id = est_res.json()["id"]

    # 1. Member tries to delete estimate -> MUST return 403 Forbidden
    del_est = await client.delete(f"/api/organizations/{org_id}/estimates/{est_id}", headers=headers_member)
    assert del_est.status_code == 403
    assert "administrator" in del_est.json()["detail"].lower() or "denied" in del_est.json()["detail"].lower()

    # 2. Member tries to delete client -> MUST return 403 Forbidden
    del_client = await client.delete(f"/api/organizations/{org_id}/clients/{client_id}", headers=headers_member)
    assert del_client.status_code == 403
    assert "administrator" in del_client.json()["detail"].lower() or "denied" in del_client.json()["detail"].lower()

    # 3. Member tries to update organization profile -> MUST return 403 Forbidden
    upd_org = await client.patch(
        f"/api/organizations/{org_id}",
        json={"name": "Malicious Name Takeover"},
        headers=headers_member
    )
    assert upd_org.status_code == 403
    assert "administrator" in upd_org.json()["detail"].lower() or "denied" in upd_org.json()["detail"].lower()
