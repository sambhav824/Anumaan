import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_organization_creation_and_membership(client: AsyncClient, token_a: str, token_b: str):
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. User A creates Organization A
    org_a_payload = {
        "name": "सह्याद्री इन्फ्रास्ट्रक्चर्स प्रायव्हेट लिमिटेड",
        "city": "पुणे",
        "state": "महाराष्ट्र",
        "gstin": "27AAAAA0000A1Z5"
    }
    res_a = await client.post("/api/organizations", json=org_a_payload, headers=headers_a)
    assert res_a.status_code == 201
    org_a = res_a.json()
    assert org_a["name"] == "सह्याद्री इन्फ्रास्ट्रक्चर्स प्रायव्हेट लिमिटेड"
    assert org_a["user_role"] == "owner"
    org_a_id = org_a["id"]

    # 2. User B creates Organization B
    org_b_payload = {
        "name": "राजधानी रोड्स एंड बिल्डर्स",
        "city": "नई दिल्ली",
        "state": "दिल्ली",
        "gstin": "07BBBBB1111B1Z2"
    }
    res_b = await client.post("/api/organizations", json=org_b_payload, headers=headers_b)
    assert res_b.status_code == 201
    org_b = res_b.json()
    assert org_b["user_role"] == "owner"
    org_b_id = org_b["id"]

    # 3. User A lists organizations: sees Org A, does NOT see Org B
    list_a = await client.get("/api/organizations", headers=headers_a)
    assert list_a.status_code == 200
    org_ids_a = [o["id"] for o in list_a.json()]
    assert org_a_id in org_ids_a
    assert org_b_id not in org_ids_a

    # 4. User B lists organizations: sees Org B, does NOT see Org A
    list_b = await client.get("/api/organizations", headers=headers_b)
    assert list_b.status_code == 200
    org_ids_b = [o["id"] for o in list_b.json()]
    assert org_b_id in org_ids_b
    assert org_a_id not in org_ids_b

    # 5. CROSS-TENANT ACCESS DENIAL: User B attempts to access Org A -> 403 Forbidden
    cross_res = await client.get(f"/api/organizations/{org_a_id}", headers=headers_b)
    assert cross_res.status_code == 403
    assert "Access denied" in cross_res.json()["detail"]

    # 6. CROSS-TENANT UPDATE DENIAL: User B attempts to update Org A -> 403 Forbidden
    cross_update = await client.patch(
        f"/api/organizations/{org_a_id}",
        json={"name": "Hacked Org Name"},
        headers=headers_b
    )
    assert cross_update.status_code == 403


@pytest.mark.asyncio
async def test_duplicate_organization_returns_existing_200(client: AsyncClient, token_a: str):
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # First creation -> 201 Created
    payload1 = {"name": "Sahyadri Infra Projects"}
    res1 = await client.post("/api/organizations", json=payload1, headers=headers_a)
    assert res1.status_code == 201
    org1 = res1.json()
    org1_id = org1["id"]
    assert org1["name"] == "Sahyadri Infra Projects"
    assert org1["created_by"] is not None

    # Duplicate creation with different casing and whitespace -> 200 OK with same org
    payload2 = {"name": "  sahyadri infra projects  "}
    res2 = await client.post("/api/organizations", json=payload2, headers=headers_a)
    assert res2.status_code == 200
    org2 = res2.json()
    assert org2["id"] == org1_id
    assert org2["user_role"] == "owner"


@pytest.mark.asyncio
async def test_same_name_allowed_for_different_users(client: AsyncClient, token_a: str, token_b: str):
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    org_name = "National Roadway Builders"

    # User A creates org
    res_a = await client.post("/api/organizations", json={"name": org_name}, headers=headers_a)
    assert res_a.status_code == 201
    id_a = res_a.json()["id"]

    # User B creates org with the exact same name -> 201 Created with distinct ID
    res_b = await client.post("/api/organizations", json={"name": org_name}, headers=headers_b)
    assert res_b.status_code == 201
    id_b = res_b.json()["id"]

    assert id_a != id_b


@pytest.mark.asyncio
async def test_invalid_organization_names_rejected(client: AsyncClient, token_a: str):
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Empty or whitespace only
    res = await client.post("/api/organizations", json={"name": "   "}, headers=headers_a)
    assert res.status_code == 422

    # Under 2 characters
    res = await client.post("/api/organizations", json={"name": "A"}, headers=headers_a)
    assert res.status_code == 422

    # Control character
    res = await client.post("/api/organizations", json={"name": "Sahyadri\x00Infra"}, headers=headers_a)
    assert res.status_code == 422

    # Zero-width character
    res = await client.post("/api/organizations", json={"name": "Sahyadri​Infra"}, headers=headers_a)
    assert res.status_code == 422

    # Exceeding 255 characters
    res = await client.post("/api/organizations", json={"name": "A" * 256}, headers=headers_a)
    assert res.status_code == 422
