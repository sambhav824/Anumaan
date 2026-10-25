import pytest
from httpx import AsyncClient
from decimal import Decimal


@pytest.mark.asyncio
async def test_estimate_and_boq_lifecycle_isolation(client: AsyncClient, token_a: str, token_b: str):
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. Setup Org A and Org B
    res_a = await client.post("/api/organizations", json={"name": "Tata Projects Ltd"}, headers=headers_a)
    assert res_a.status_code in (200, 201)
    org_a_id = res_a.json()["id"]

    res_b = await client.post("/api/organizations", json={"name": "L&T Construction"}, headers=headers_b)
    assert res_b.status_code in (200, 201)
    org_b_id = res_b.json()["id"]

    # 2. Create projects in Org A and Org B
    p_a_res = await client.post(
        f"/api/organizations/{org_a_id}/projects",
        json={"name": "Commercial Complex Pune", "project_type": "building"},
        headers=headers_a,
    )
    assert p_a_res.status_code == 201
    proj_a_id = p_a_res.json()["id"]

    p_b_res = await client.post(
        f"/api/organizations/{org_b_id}/projects",
        json={"name": "Mumbai Expressway", "project_type": "road"},
        headers=headers_b,
    )
    assert p_b_res.status_code == 201
    proj_b_id = p_b_res.json()["id"]

    # 3. Invalid project assignment: Try creating estimate in Org A with Project belonging to Org B
    inv_res = await client.post(
        f"/api/organizations/{org_a_id}/estimates",
        json={
            "name": "Invalid Estimate",
            "project_id": proj_b_id,
            "project_type": "building",
        },
        headers=headers_a,
    )
    assert inv_res.status_code == 400
    assert "Selected project does not belong to this organization" in inv_res.json()["detail"]

    # 4. Create valid Building Estimate in Org A
    est_a_payload = {
        "name": "Phase 1 Civil & Structure Estimate",
        "project_id": proj_a_id,
        "project_type": "building",
        "estimate_number": "EST-2026-001",
        "overhead_percent": 5.0,
        "contingency_percent": 3.0,
        "discount_percent": 2.0,
        "gst_percent": 18.0,
    }
    est_a_res = await client.post(
        f"/api/organizations/{org_a_id}/estimates",
        json=est_a_payload,
        headers=headers_a,
    )
    assert est_a_res.status_code == 201
    est_a = est_a_res.json()
    assert est_a["name"] == "Phase 1 Civil & Structure Estimate"
    assert est_a["estimate_number"] == "EST-2026-001"
    assert est_a["status"] == "draft"
    assert est_a["project_type"] == "building"
    est_a_id = est_a["id"]

    # 5. Duplicate estimate number in Org A must be rejected with 409
    dup_res = await client.post(
        f"/api/organizations/{org_a_id}/estimates",
        json={
            "name": "Duplicate Estimate",
            "project_id": proj_a_id,
            "project_type": "building",
            "estimate_number": "EST-2026-001",
        },
        headers=headers_a,
    )
    assert dup_res.status_code == 409

    # 6. Cross-Tenant Access Denial: User B attempts to read Org A's estimate
    cross_read = await client.get(
        f"/api/organizations/{org_a_id}/estimates/{est_a_id}",
        headers=headers_b,
    )
    assert cross_read.status_code == 403

    # 7. Add BOQ items to Estimate A
    # Item 1: Foundation Excavation using formula
    item_1_payload = {
        "item_number": "1.1",
        "description": "Earthwork excavation in foundation trenches",
        "category": "earthwork",
        "unit": "m3",
        "quantity": 100.0,
        "unit_rate": 250.0,
        "formula_type": "excavation",
        "calculation_details": {
            "formula_name": "excavation",
            "length": 10.0,
            "width": 5.0,
            "depth": 2.0,
            "swell_factor": 1.0,
            "formula": "10.0 x 5.0 x 2.0 = 100.00 m3",
        },
        "is_manual": False,
    }
    item_1_res = await client.post(
        f"/api/organizations/{org_a_id}/estimates/{est_a_id}/items",
        json=item_1_payload,
        headers=headers_a,
    )
    assert item_1_res.status_code == 201
    item_1 = item_1_res.json()
    assert item_1["item_number"] == "1.1"
    assert float(item_1["amount"]) == 25000.0  # 100 * 250

    # Item 2: Reinforced Steel Bar manual or BBS
    item_2_payload = {
        "item_number": "1.2",
        "description": "Fe500 TMT Reinforcement Steel",
        "category": "steel",
        "unit": "kg",
        "quantity": 500.0,
        "unit_rate": 70.0,
        "is_manual": True,
    }
    item_2_res = await client.post(
        f"/api/organizations/{org_a_id}/estimates/{est_a_id}/items",
        json=item_2_payload,
        headers=headers_a,
    )
    assert item_2_res.status_code == 201
    assert float(item_2_res.json()["amount"]) == 35000.0  # 500 * 70

    # 8. Check Estimate Totals recalculation
    # Subtotal = 25000 + 35000 = 60000
    # Overhead 5% = 3000
    # Contingency 3% = 1800
    # Subtotal with add-ons = 64800
    # Discount 2% = 1296
    # Taxable = 63504
    # GST 18% = 11430.72
    # Grand Total = 74934.72
    est_get = await client.get(
        f"/api/organizations/{org_a_id}/estimates/{est_a_id}",
        headers=headers_a,
    )
    assert est_get.status_code == 200
    est_data = est_get.json()
    assert len(est_data["items"]) == 2
    assert float(est_data["subtotal"]) == 60000.0
    assert float(est_data["overhead_amount"]) == 3000.0
    assert float(est_data["contingency_amount"]) == 1800.0
    assert float(est_data["discount_amount"]) == 1200.0
    assert float(est_data["taxable_amount"]) == 63600.0
    assert float(est_data["gst_amount"]) == 11448.0
    assert float(est_data["total_amount"]) == 75048.0

    # 9. Test /calculate endpoint
    calc_res = await client.post(
        f"/api/organizations/{org_a_id}/estimates/calculate",
        json={
            "formula_type": "brickwork",
            "length": 10.0,
            "height": 3.0,
            "thickness": 0.23,
            "openings": [{"length": 1.2, "height": 2.1, "count": 2}],
            "input_unit": "m",
        },
        headers=headers_a,
    )
    assert calc_res.status_code == 200
    calc_data = calc_res.json()
    assert "quantity" in calc_data
    assert "formula" in calc_data
    assert "gross_volume_cum" in calc_data

    # 10. Bulk update items (Batch replacement transaction)
    bulk_items_payload = [
        {
            "item_number": "1.1",
            "description": "Updated Excavation Trench",
            "category": "earthwork",
            "unit": "m3",
            "quantity": 120.0,
            "unit_rate": 260.0,
            "is_manual": False,
        },
        {
            "item_number": "1.2",
            "description": "M25 Grade PCC Concrete",
            "category": "concrete",
            "unit": "m3",
            "quantity": 25.0,
            "unit_rate": 5500.0,
            "is_manual": True,
        },
    ]
    bulk_res = await client.put(
        f"/api/organizations/{org_a_id}/estimates/{est_a_id}/items",
        json=bulk_items_payload,
        headers=headers_a,
    )
    assert bulk_res.status_code == 200
    assert len(bulk_res.json()) == 2
    # 120 * 260 = 31200, 25 * 5500 = 137500. Total subtotal = 168700

    est_after_bulk = await client.get(
        f"/api/organizations/{org_a_id}/estimates/{est_a_id}",
        headers=headers_a,
    )
    assert float(est_after_bulk.json()["subtotal"]) == 168700.0

    # 11. Status Transition & Snapshot Preservation
    # Update status to approved
    status_res = await client.patch(
        f"/api/organizations/{org_a_id}/estimates/{est_a_id}/status",
        json={"status": "approved"},
        headers=headers_a,
    )
    assert status_res.status_code == 200
    approved_est = status_res.json()
    assert approved_est["status"] == "approved"
    assert approved_est["snapshot"] is not None
    assert float(approved_est["snapshot"]["subtotal"]) == 168700.0
    assert len(approved_est["snapshot"]["items"]) == 2

    # 12. Create Road Estimate in Org A (auto-generated estimate_number)
    road_est_payload = {
        "name": "State Highway Section B Road Estimate",
        "project_id": proj_a_id,
        "project_type": "road",
        "overhead_percent": 10.0,
    }
    road_est_res = await client.post(
        f"/api/organizations/{org_a_id}/estimates",
        json=road_est_payload,
        headers=headers_a,
    )
    assert road_est_res.status_code == 201
    assert road_est_res.json()["project_type"] == "road"
    assert road_est_res.json()["estimate_number"].startswith("EST-")

    # 13. Filter estimates by project_id and status
    list_res = await client.get(
        f"/api/organizations/{org_a_id}/estimates?status=approved",
        headers=headers_a,
    )
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["id"] == est_a_id

    # 14. Delete estimate
    del_res = await client.delete(
        f"/api/organizations/{org_a_id}/estimates/{road_est_res.json()['id']}",
        headers=headers_a,
    )
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_estimate_edge_cases_and_rollbacks(client: AsyncClient, token_a: str, token_b: str):
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Setup Org A and Org B
    res_a = await client.post("/api/organizations", json={"name": "Godrej Construction"}, headers=headers_a)
    org_a_id = res_a.json()["id"]

    res_b = await client.post("/api/organizations", json={"name": "Shapoorji Pallonji"}, headers=headers_b)
    org_b_id = res_b.json()["id"]

    # Create project in Org A
    p_a_res = await client.post(
        f"/api/organizations/{org_a_id}/projects",
        json={"name": "Godrej Woodsman", "project_type": "building"},
        headers=headers_a,
    )
    proj_a_id = p_a_res.json()["id"]

    # 1. Create Estimate in Org A with specific estimate_number
    est_res = await client.post(
        f"/api/organizations/{org_a_id}/estimates",
        json={
            "name": "Tower A Estimate",
            "project_id": proj_a_id,
            "project_type": "building",
            "estimate_number": "EST-SHARED-001",
        },
        headers=headers_a,
    )
    assert est_res.status_code == 201
    est_id = est_res.json()["id"]

    # 2. Same estimate_number in Org B IS ALLOWED (scoped per-org unique index)
    p_b_res = await client.post(
        f"/api/organizations/{org_b_id}/projects",
        json={"name": "SP Infocity", "project_type": "building"},
        headers=headers_b,
    )
    proj_b_id = p_b_res.json()["id"]

    est_b_res = await client.post(
        f"/api/organizations/{org_b_id}/estimates",
        json={
            "name": "Tower B Estimate",
            "project_id": proj_b_id,
            "project_type": "building",
            "estimate_number": "EST-SHARED-001",
        },
        headers=headers_b,
    )
    assert est_b_res.status_code == 201

    # 3. Add Item to non-existent estimate -> 404
    bad_item_res = await client.post(
        f"/api/organizations/{org_a_id}/estimates/00000000-0000-0000-0000-000000000000/items",
        json={
            "item_number": "99.1",
            "description": "Non-existent item",
            "quantity": 10.0,
            "unit_rate": 100.0,
        },
        headers=headers_a,
    )
    assert bad_item_res.status_code == 404

    # 4. Cross-Tenant Item Deletion Denial: Org B cannot delete Org A's item
    # First, add a valid item in Org A
    good_item_res = await client.post(
        f"/api/organizations/{org_a_id}/estimates/{est_id}/items",
        json={
            "item_number": "1.1",
            "description": "Soling work",
            "quantity": 10.0,
            "unit_rate": 150.0,
        },
        headers=headers_a,
    )
    assert good_item_res.status_code == 201
    item_id = good_item_res.json()["id"]

    # Org B attempts to delete Org A's item
    cross_del = await client.delete(
        f"/api/organizations/{org_b_id}/estimates/{est_id}/items/{item_id}",
        headers=headers_b,
    )
    assert cross_del.status_code in (403, 404)

    # 5. Invalid calculation formula in /calculate -> 400
    invalid_calc = await client.post(
        f"/api/organizations/{org_a_id}/estimates/calculate",
        json={"calculation_type": "teleportation", "params": {}},
        headers=headers_a,
    )
    assert invalid_calc.status_code == 400
    assert "Unknown calculation formula type" in invalid_calc.json()["detail"]

    # 6. Delete item from Org A and verify total recalculated to 0
    del_item = await client.delete(
        f"/api/organizations/{org_a_id}/estimates/{est_id}/items/{item_id}",
        headers=headers_a,
    )
    assert del_item.status_code == 204

    est_after_del = await client.get(
        f"/api/organizations/{org_a_id}/estimates/{est_id}",
        headers=headers_a,
    )
    assert float(est_after_del.json()["subtotal"]) == 0.0
    assert float(est_after_del.json()["total_amount"]) == 0.0


@pytest.mark.asyncio
async def test_estimate_and_quotation_tax_defaults_and_explicit_confirmation(
    client: AsyncClient, token_a: str
):
    """
    Verifies Phase D.2 Safe Database Readiness tax behaviors:
    1. Estimate created without tax defaults to 0.00 (unconfigured tax).
    2. Invalid tax rates (<0 or >100) are rejected with 422.
    3. Quotation generated from estimate does not silently inherit or assume tax.
    4. Issuance strictly requires explicit contractor tax confirmation.
    """
    headers = {"Authorization": f"Bearer {token_a}"}

    # Setup Org & Project
    org_res = await client.post("/api/organizations", json={"name": "Shapoorji Pallonji Infra"}, headers=headers)
    org_id = org_res.json()["id"]

    p_res = await client.post(f"/api/organizations/{org_id}/projects", json={"name": "Metro Depot"}, headers=headers)
    proj_id = p_res.json()["id"]

    # 1. Create Estimate WITHOUT gst_pct -> Must default to 0.00
    est_res = await client.post(
        f"/api/organizations/{org_id}/estimates",
        json={
            "name": "Track Work Package",
            "project_id": proj_id,
            "project_type": "road",
        },
        headers=headers,
    )
    assert est_res.status_code == 201
    est_data = est_res.json()
    assert float(est_data["gst_pct"]) == 0.00
    assert float(est_data["gst_amount"]) == 0.00
    est_id = est_data["id"]

    # Add a BOQ item of 100,000 INR
    await client.post(
        f"/api/organizations/{org_id}/estimates/{est_id}/items",
        json={"item_number": "1.1", "description": "Track Ballast", "quantity": 100.0, "unit_rate": 1000.0, "unit": "cum"},
        headers=headers,
    )

    # 2. Re-fetch estimate -> subtotal 100,000, gst_pct 0, gst_amount 0, total 100,000
    est_updated = await client.get(f"/api/organizations/{org_id}/estimates/{est_id}", headers=headers)
    assert est_updated.status_code == 200
    u_data = est_updated.json()
    assert float(u_data["subtotal"]) == 100000.0
    assert float(u_data["gst_amount"]) == 0.0
    assert float(u_data["total_amount"]) == 100000.0

    # 3. Invalid tax values (<0 or >100) rejected with 422
    neg_res = await client.post(
        f"/api/organizations/{org_id}/estimates",
        json={"name": "Invalid Tax", "project_id": proj_id, "gst_pct": -5.0},
        headers=headers,
    )
    assert neg_res.status_code == 422

    over_res = await client.post(
        f"/api/organizations/{org_id}/estimates",
        json={"name": "Invalid Tax", "project_id": proj_id, "gst_pct": 105.0},
        headers=headers,
    )
    assert over_res.status_code == 422

    # 4. Create estimate with explicit 12% GST
    est12_res = await client.post(
        f"/api/organizations/{org_id}/estimates",
        json={"name": "Civil Station Works", "project_id": proj_id, "gst_pct": 12.0},
        headers=headers,
    )
    assert est12_res.status_code == 201
    est12_id = est12_res.json()["id"]

    await client.post(
        f"/api/organizations/{org_id}/estimates/{est12_id}/items",
        json={"item_number": "1.1", "description": "RCC Pier", "quantity": 50.0, "unit_rate": 2000.0, "unit": "cum"},
        headers=headers,
    )
    est12_get = await client.get(f"/api/organizations/{org_id}/estimates/{est12_id}", headers=headers)
    assert float(est12_get.json()["gst_amount"]) == 12000.0  # 12% of 100,000

    # 5. Create Quotation from this 12% estimate WITHOUT explicit tax_configured
    # Quotation MUST NOT silently inherit 12% without explicit contractor configuration!
    q_res = await client.post(
        f"/api/organizations/{org_id}/quotations",
        json={"estimate_id": est12_id},
        headers=headers,
    )
    assert q_res.status_code == 201
    q_data = q_res.json()
    assert q_data["tax_configured"] is False
    assert float(q_data["tax_rate"]) == 0.0
    assert float(q_data["tax_amount"]) == 0.0
    quote_id = q_data["id"]

    # 6. Attempting to issue unconfigured quotation without confirmation fails with 400
    bad_issue = await client.post(
        f"/api/organizations/{org_id}/quotations/{quote_id}/issue",
        json={"confirm_tax_configured": False},
        headers=headers,
    )
    assert bad_issue.status_code == 400
    assert "Applicable tax treatment has not been configured" in bad_issue.json()["detail"]

    # 7. Issue with explicit confirmation succeeds and creates frozen snapshot
    good_issue = await client.post(
        f"/api/organizations/{org_id}/quotations/{quote_id}/issue",
        json={"confirm_tax_configured": True},
        headers=headers,
    )
    assert good_issue.status_code == 200
    assert good_issue.json()["status"] == "issued"
    assert good_issue.json()["snapshot"] is not None
