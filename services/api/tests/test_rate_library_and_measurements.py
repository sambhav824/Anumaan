import pytest
from httpx import AsyncClient
from decimal import Decimal
from app.core.calculations import (
    calculate_length,
    calculate_area,
    calculate_volume,
    calculate_wall_area,
    calculate_count,
    calculate_weight,
    calculate_time,
    calculate_lump_sum,
    calculate_estimate_totals,
)


@pytest.mark.asyncio
async def test_measurement_calculation_engine_pure_functions():
    # 1. Length calculation
    l_res = calculate_length(Decimal("15.5"), unit="m")
    assert l_res["quantity"] == Decimal("15.5000")
    assert l_res["unit"] == "m"

    # Invalid negative length
    with pytest.raises(Exception):
        calculate_length(Decimal("-5"), unit="m")

    # 2. Area calculation (Length x Width)
    a_res = calculate_area(Decimal("10.0"), Decimal("12.5"), unit="m")
    assert a_res["quantity"] == Decimal("125.0000")
    assert a_res["unit"] == "sqm"

    # 3. Volume calculation (Length x Width x Height)
    v_res = calculate_volume(Decimal("4.0"), Decimal("3.0"), Decimal("0.5"), unit="m")
    assert v_res["quantity"] == Decimal("6.0000")
    assert v_res["unit"] == "cum"

    # 4. Rectangular wall area with opening deductions
    # Gross wall: 10m length x 3m height = 30 sqm
    # Openings: Door 1m x 2.1m = 2.1 sqm, Window 1.2m x 1.5m = 1.8 sqm. Total deductions = 3.9 sqm.
    # Net wall area = 30 - 3.9 = 26.1 sqm.
    openings = [
        {"length": Decimal("1.0"), "height": Decimal("2.1"), "count": 1, "description": "Door D1"},
        {"length": Decimal("1.2"), "height": Decimal("1.5"), "count": 1, "description": "Window W1"},
    ]
    w_res = calculate_wall_area(Decimal("10.0"), Decimal("3.0"), openings=openings, unit="m")
    assert w_res["quantity"] == Decimal("26.1000")
    assert w_res["unit"] == "sqm"
    assert "Gross Wall" in w_res["formula"]
    assert "Openings" in w_res["formula"]

    # 5. Count calculation
    c_res = calculate_count(Decimal("45"), unit="piece")
    assert c_res["quantity"] == Decimal("45.0000")
    assert c_res["unit"] == "piece"

    # 6. Weight calculation
    wt_res = calculate_weight(Decimal("250.75"), unit="kg")
    assert wt_res["quantity"] == Decimal("250.7500")
    assert wt_res["unit"] == "kg"

    # 7. Time calculation
    t_res = calculate_time(Decimal("8.5"), unit="hour")
    assert t_res["quantity"] == Decimal("8.5000")
    assert t_res["unit"] == "hour"

    # 8. Lump sum
    ls_res = calculate_lump_sum(description="Site mobilization and setup")
    assert ls_res["quantity"] == Decimal("1.0000")
    assert ls_res["unit"] == "ls"


@pytest.mark.asyncio
async def test_financial_calculations_without_discount():
    # Verify subtotal, overhead, contingency, gst without discount
    items = [
        {"quantity": 100, "unit_rate": 85},  # 8,500.00 (e.g. wall plaster 100 sqm @ 85/sqm)
        {"quantity": 10, "unit_rate": 1200}, # 12,000.00
    ]
    # Subtotal: 8500 + 12000 = 20,500.00
    # Overhead: 10% = 2,050.00
    # Contingency: 5% = 1,025.00
    # Taxable: 20500 + 2050 + 1025 = 23,575.00 (NO DISCOUNT)
    # GST 18%: 23575 * 0.18 = 4,243.50
    # Grand Total: 23575 + 4243.50 = 27,818.50
    res = calculate_estimate_totals(items, overhead_pct=10.0, contingency_pct=5.0, discount_pct=0.0, gst_pct=18.0)
    assert res["subtotal"] == Decimal("20500.00")
    assert res["overhead_amount"] == Decimal("2050.00")
    assert res["contingency_amount"] == Decimal("1025.00")
    assert res["discount_amount"] == Decimal("0.00")
    assert res["taxable_amount"] == Decimal("23575.00")
    assert res["gst_amount"] == Decimal("4243.50")
    assert res["grand_total"] == Decimal("27818.50")


@pytest.mark.asyncio
async def test_rate_library_crud_sorting_and_boq_snapshot(client: AsyncClient, token_a: str, token_b: str):
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. Setup organization for User A
    org_res = await client.post("/api/organizations", json={"name": "Mahalaxmi Builders"}, headers=headers_a)
    assert org_res.status_code in (200, 201)
    org_id = org_res.json()["id"]

    # 2. Add Rates with all required fields (Material, Labour, Equipment, Other)
    rate1 = await client.post(
        f"/api/organizations/{org_id}/rates",
        json={
            "item_name": "OPC 53 Cement",
            "category": "material",
            "description": "UltraTech 53 Grade OPC Cement bag",
            "unit": "bag",
            "material_rate": 380.0,
            "labour_rate": 15.0,
            "equipment_rate": 5.0,
            "rate_source": "Supplier Quote",
            "supplier_or_source_name": "Kalyani Traders",
            "location": "Pune Hadapsar",
            "notes": "Includes unloading at site",
        },
        headers=headers_a
    )
    assert rate1.status_code == 201
    r1_data = rate1.json()
    assert float(r1_data["unit_rate"]) == 400.0  # 380 + 15 + 5
    assert r1_data["category"] == "material"
    assert r1_data["supplier_or_source_name"] == "Kalyani Traders"
    r1_id = r1_data["id"]

    rate2 = await client.post(
        f"/api/organizations/{org_id}/rates",
        json={
            "item_name": "Skilled Mason",
            "category": "labour",
            "description": "First class brickwork & plaster mason",
            "unit": "day",
            "labour_rate": 950.0,
            "rate_source": "Schedule of Rates",
            "location": "Maharashtra PWD",
        },
        headers=headers_a
    )
    assert rate2.status_code == 201
    r2_data = rate2.json()
    assert float(r2_data["unit_rate"]) == 950.0

    rate3 = await client.post(
        f"/api/organizations/{org_id}/rates",
        json={
            "item_name": "JCB Excavator 3DX",
            "category": "equipment",
            "description": "Includes diesel and operator",
            "unit": "hour",
            "equipment_rate": 1200.0,
            "rate_source": "Manual",
            "location": "Local Rental",
        },
        headers=headers_a
    )
    assert rate3.status_code == 201

    # 3. Test Searching and Filtering
    # Filter by category = material
    cat_res = await client.get(f"/api/organizations/{org_id}/rates?category=material", headers=headers_a)
    assert cat_res.status_code == 200
    assert len(cat_res.json()) == 1
    assert cat_res.json()[0]["item_name"] == "OPC 53 Cement"

    # Search by text - materials only by default
    search_res = await client.get(f"/api/organizations/{org_id}/rates?search=Cement", headers=headers_a)
    assert search_res.status_code == 200
    assert len(search_res.json()) == 1
    assert search_res.json()[0]["item_name"] == "OPC 53 Cement"

    # Labour is excluded from default catalog search
    search_labour_excluded = await client.get(f"/api/organizations/{org_id}/rates?search=Mason", headers=headers_a)
    assert search_labour_excluded.status_code == 200
    assert len(search_labour_excluded.json()) == 0

    # Labour is retrieved when include_labour=true is explicitly requested
    search_labour_included = await client.get(f"/api/organizations/{org_id}/rates?search=Mason&include_labour=true", headers=headers_a)
    assert search_labour_included.status_code == 200
    assert len(search_labour_included.json()) == 1
    assert search_labour_included.json()[0]["item_name"] == "Skilled Mason"

    # Sort by name ascending
    sort_res = await client.get(f"/api/organizations/{org_id}/rates?sort_by=name&order=asc", headers=headers_a)
    assert sort_res.status_code == 200
    names = [it["item_name"] for it in sort_res.json()]
    assert names == sorted(names)

    # 4. Multi-tenant Authorization: User B cannot access Org A's rate library
    denied = await client.get(f"/api/organizations/{org_id}/rates", headers=headers_b)
    assert denied.status_code == 403

    # 5. Create Estimate and Add Item Linked to Rate Library
    proj_res = await client.post(f"/api/organizations/{org_id}/projects", json={"name": "Site Alpha"}, headers=headers_a)
    assert proj_res.status_code in (200, 201)
    proj_id = proj_res.json()["id"]

    est_res = await client.post(
        f"/api/organizations/{org_id}/estimates",
        json={
            "name": "Phase 1 Foundation",
            "project_id": proj_id,
            "items": [
                {
                    "item_number": "1.1",
                    "description": "OPC 53 Cement for foundation",
                    "category": "concrete",
                    "quantity": 100.0,
                    "unit": "bag",
                    "unit_rate": 400.0,
                    "rate_item_id": r1_id,
                }
            ]
        },
        headers=headers_a
    )
    assert est_res.status_code == 201
    est_id = est_res.json()["id"]
    est_data = est_res.json()
    assert est_data["items"][0]["rate_item_id"] == r1_id
    assert float(est_data["items"][0]["amount"]) == 40000.0  # 100 * 400

    # 6. Historical Snapshot Preservation:
    # Update rate in Rate Library to 450.0
    patch_rate = await client.patch(
        f"/api/organizations/{org_id}/rates/{r1_id}",
        json={"material_rate": 430.0, "labour_rate": 15.0, "equipment_rate": 5.0},
        headers=headers_a
    )
    assert patch_rate.status_code == 200
    assert float(patch_rate.json()["unit_rate"]) == 450.0

    # Verify that previously saved estimate has NOT changed silently
    est_recheck = await client.get(f"/api/organizations/{org_id}/estimates/{est_id}", headers=headers_a)
    assert est_recheck.status_code == 200
    assert float(est_recheck.json()["items"][0]["unit_rate"]) == 400.0
    assert float(est_recheck.json()["items"][0]["amount"]) == 40000.0
    assert float(est_recheck.json()["subtotal"]) == 40000.0

    # 7. Delete Rate Item
    del_res = await client.delete(f"/api/organizations/{org_id}/rates/{r2_data['id']}", headers=headers_a)
    assert del_res.status_code == 204
