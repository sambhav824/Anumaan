import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_client_crud_and_cross_organization_denial(client: AsyncClient, token_a: str, token_b: str):
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Setup Org A for User A
    res_a = await client.post("/api/organizations", json={"name": "Org A Construction"}, headers=headers_a)
    assert res_a.status_code == 201
    org_a_id = res_a.json()["id"]

    # Setup Org B for User B
    res_b = await client.post("/api/organizations", json={"name": "Org B Roadworks"}, headers=headers_b)
    assert res_b.status_code == 201
    org_b_id = res_b.json()["id"]

    # 1. User A creates client in Org A with Marathi / Devanagari content
    client_payload = {
        "name": "पुणे मेट्रो विकास प्राधिकरण",
        "contact_person": "आनंद कुलकर्णी",
        "email": "contracts@punemetro.gov.in",
        "phone": "+91 98221 54321",
        "billing_address": "मेट्रो भवन, कोथरूड, पुणे",
        "gstin": "27BBBBB1111B1Z2"
    }
    create_res = await client.post(
        f"/api/organizations/{org_a_id}/clients",
        json=client_payload,
        headers=headers_a
    )
    assert create_res.status_code == 201
    client_data = create_res.json()
    assert client_data["name"] == "पुणे मेट्रो विकास प्राधिकरण"
    assert client_data["organization_id"] == org_a_id
    client_id = client_data["id"]

    # 2. User A searches and lists clients in Org A
    list_res = await client.get(f"/api/organizations/{org_a_id}/clients?search=मेट्रो", headers=headers_a)
    assert list_res.status_code == 200
    clients_list = list_res.json()
    assert len(clients_list) == 1
    assert clients_list[0]["id"] == client_id

    # 3. User A updates client
    update_res = await client.patch(
        f"/api/organizations/{org_a_id}/clients/{client_id}",
        json={"contact_person": "श्रीनिवास जोशी"},
        headers=headers_a
    )
    assert update_res.status_code == 200
    assert update_res.json()["contact_person"] == "श्रीनिवास जोशी"

    # 4. CROSS-TENANT DENIAL: User B attempts to view User A's client -> 403 Forbidden
    cross_get = await client.get(
        f"/api/organizations/{org_a_id}/clients/{client_id}",
        headers=headers_b
    )
    assert cross_get.status_code == 403

    # 5. CROSS-TENANT DENIAL: User B attempts to list clients in Org A -> 403 Forbidden
    cross_list = await client.get(
        f"/api/organizations/{org_a_id}/clients",
        headers=headers_b
    )
    assert cross_list.status_code == 403

    # 6. CROSS-TENANT DENIAL: User B attempts to create client in Org A -> 403 Forbidden
    cross_create = await client.post(
        f"/api/organizations/{org_a_id}/clients",
        json={"name": "Hacked Client"},
        headers=headers_b
    )
    assert cross_create.status_code == 403

    # 7. CROSS-TENANT DENIAL: User B attempts to delete client in Org A -> 403 Forbidden
    cross_del = await client.delete(
        f"/api/organizations/{org_a_id}/clients/{client_id}",
        headers=headers_b
    )
    assert cross_del.status_code == 403
