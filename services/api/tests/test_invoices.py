import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_invoice_milestone_lifecycle(client: AsyncClient, token_a: str):
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 1. Create Organization
    res_org = await client.post("/api/organizations", json={"name": "BuildCo Invoicing"}, headers=headers_a)
    assert res_org.status_code in (200, 201), res_org.text
    org_id = res_org.json()["id"]

    # 2. Create Client
    res_cli = await client.post(
        f"/api/organizations/{org_id}/clients",
        json={"name": "Skyline Builders", "phone": "9876543210"},
        headers=headers_a,
    )
    assert res_cli.status_code == 201
    client_id = res_cli.json()["id"]

    # 3. Create Project
    res_proj = await client.post(
        f"/api/organizations/{org_id}/projects",
        json={"name": "Apex Horizon Tower", "project_type": "building", "client_id": client_id},
        headers=headers_a,
    )
    assert res_proj.status_code == 201
    project_id = res_proj.json()["id"]

    # 4. Create Milestone Invoice (Advance Payment)
    create_res = await client.post(
        f"/api/organizations/{org_id}/invoices",
        headers=headers_a,
        json={
            "project_id": project_id,
            "milestone_name": "Advance Booking Payment (10%)",
            "percentage": 10.0,
            "amount": 150000.0,
            "status": "draft",
            "due_date": "2026-11-15",
            "notes": "Mobilization advance for excavation and site setup",
        },
    )
    assert create_res.status_code == 201, create_res.text
    inv = create_res.json()
    assert inv["milestone_name"] == "Advance Booking Payment (10%)"
    assert float(inv["amount"]) == 150000.0
    assert inv["status"] == "draft"
    assert inv["project_name"] == "Apex Horizon Tower"
    assert inv["client_name"] == "Skyline Builders"
    inv_id = inv["id"]

    # 5. List Invoices with project_id filter
    list_res = await client.get(
        f"/api/organizations/{org_id}/invoices?project_id={project_id}",
        headers=headers_a,
    )
    assert list_res.status_code == 200
    invoices = list_res.json()
    assert len(invoices) >= 1
    assert invoices[0]["id"] == inv_id

    # 6. Update Invoice - Record payment
    patch_res = await client.patch(
        f"/api/organizations/{org_id}/invoices/{inv_id}",
        headers=headers_a,
        json={
            "paid_amount": 150000.0,
            "payment_method": "NEFT",
            "notes": "Received full advance via NEFT UTR #4928174",
        },
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["status"] == "paid"
    assert updated["payment_method"] == "NEFT"

    # 7. Delete Invoice
    del_res = await client.delete(f"/api/organizations/{org_id}/invoices/{inv_id}", headers=headers_a)
    assert del_res.status_code == 204

